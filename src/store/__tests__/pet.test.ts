import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Difficulty, Task } from "../../domain/types";
import { rewardRepo } from "../../repositories/rewardRepo";
import { taskRepo } from "../../repositories/taskRepo";
import { useAppStore } from "../useAppStore";

// SQL cannot run in Vitest, so both repositories are replaced by mocks.
vi.mock("../../repositories/taskRepo", () => ({
  taskRepo: {
    listInRange: vi.fn(),
    create: vi.fn(),
    complete: vi.fn(),
    flagOverdue: vi.fn(),
    markFlagged: vi.fn(),
  },
}));
vi.mock("../../repositories/rewardRepo", () => ({
  rewardRepo: {
    totals: vi.fn(),
    activeDaysSinceLastReset: vi.fn(),
    completedCount: vi.fn(),
    lastCompletionAt: vi.fn(),
  },
}));

const TODAY = "2026-11-14";

function makeTask(id: number, endDate: string, extra: Partial<Task> = {}, difficulty: Difficulty = 1): Task {
  return {
    id,
    title: `Task ${id}`,
    notes: null,
    startDate: "2026-11-01",
    endDate,
    difficulty,
    status: "active",
    overdueFlagged: false,
    completedOn: null,
    ...extra,
  };
}

const flagOverdue = vi.mocked(taskRepo.flagOverdue);
const markFlagged = vi.mocked(taskRepo.markFlagged);
const create = vi.mocked(taskRepo.create);
const complete = vi.mocked(taskRepo.complete);
const totals = vi.mocked(rewardRepo.totals);
const activeDays = vi.mocked(rewardRepo.activeDaysSinceLastReset);
const lastCompletion = vi.mocked(rewardRepo.lastCompletionAt);

beforeEach(() => {
  vi.resetAllMocks();
  complete.mockResolvedValue(undefined);
  flagOverdue.mockResolvedValue(undefined);
  markFlagged.mockResolvedValue(undefined);
  totals.mockResolvedValue({ xp: 0, coins: 0 });
  activeDays.mockResolvedValue([]);
  lastCompletion.mockResolvedValue(null);
  useAppStore.setState({
    tasks: [],
    today: TODAY,
    totals: { xp: 0, coins: 0 },
    streak: 0,
    lastCompletionAt: null,
    oneShots: [],
    displayStage: 1,
    error: null,
  });
});

describe("sweepOverdue", () => {
  it("flags newly overdue tasks once and marks them in the state", async () => {
    useAppStore.setState({ tasks: [makeTask(1, "2026-11-12"), makeTask(2, "2026-11-13")] });
    await useAppStore.getState().sweepOverdue();
    expect(flagOverdue).toHaveBeenCalledTimes(1);
    expect(flagOverdue).toHaveBeenCalledWith([1, 2], TODAY);
    expect(useAppStore.getState().tasks.every((task) => task.overdueFlagged)).toBe(true);
  });

  it("does nothing a second time, so a task never resets the streak twice", async () => {
    useAppStore.setState({ tasks: [makeTask(1, "2026-11-12")] });
    await useAppStore.getState().sweepOverdue();
    await useAppStore.getState().sweepOverdue();
    expect(flagOverdue).toHaveBeenCalledTimes(1);
  });

  it("skips tasks that are on time, done, or already flagged", async () => {
    useAppStore.setState({
      tasks: [
        makeTask(1, TODAY),
        makeTask(2, "2026-11-12", { status: "done", completedOn: "2026-11-12" }),
        makeTask(3, "2026-11-12", { overdueFlagged: true }),
      ],
    });
    await useAppStore.getState().sweepOverdue();
    expect(flagOverdue).not.toHaveBeenCalled();
  });

  it("refreshes the streak after flagging", async () => {
    useAppStore.setState({ tasks: [makeTask(1, "2026-11-12")], streak: 5 });
    activeDays.mockResolvedValue([]); // the reset emptied the streak days
    await useAppStore.getState().sweepOverdue();
    expect(useAppStore.getState().streak).toBe(0);
  });

  it("records an error and leaves the task unflagged when the repository fails", async () => {
    flagOverdue.mockRejectedValue("disk full");
    useAppStore.setState({ tasks: [makeTask(1, "2026-11-12")] });
    await useAppStore.getState().sweepOverdue();
    expect(useAppStore.getState().error).toBe("disk full");
    expect(useAppStore.getState().tasks[0].overdueFlagged).toBe(false);
  });
});

describe("addTask with a past end date", () => {
  const input = { title: "Late log", startDate: "2026-11-10", endDate: "2026-11-12", difficulty: 1 as const };

  it("flags it right away without resetting the streak", async () => {
    create.mockResolvedValue(makeTask(7, "2026-11-12"));
    await useAppStore.getState().addTask(input);
    expect(markFlagged).toHaveBeenCalledWith([7]);
    expect(flagOverdue).not.toHaveBeenCalled();
    expect(useAppStore.getState().tasks[0].overdueFlagged).toBe(true);
  });

  it("leaves a task ending today or later alone", async () => {
    create.mockResolvedValue(makeTask(8, TODAY));
    await useAppStore.getState().addTask({ ...input, endDate: TODAY });
    expect(markFlagged).not.toHaveBeenCalled();
    expect(useAppStore.getState().tasks[0].overdueFlagged).toBe(false);
  });
});

describe("one-shot queue", () => {
  const kinds = () => useAppStore.getState().oneShots.map((shot) => shot.kind);

  it("queues only celebrate when the level does not change", async () => {
    useAppStore.setState({ tasks: [makeTask(1, TODAY)] });
    await useAppStore.getState().completeTask(1);
    expect(kinds()).toEqual(["celebrate"]);
  });

  it("adds levelUp when the XP crosses a level", async () => {
    useAppStore.setState({ tasks: [makeTask(1, TODAY)] });
    totals.mockResolvedValue({ xp: 100, coins: 5 }); // level 2 starts at 100 XP
    await useAppStore.getState().completeTask(1);
    expect(kinds()).toEqual(["celebrate", "levelUp"]);
  });

  it("gives every queued animation its own id", async () => {
    useAppStore.setState({ tasks: [makeTask(1, TODAY)] });
    totals.mockResolvedValue({ xp: 100, coins: 5 });
    await useAppStore.getState().completeTask(1);
    const ids = useAppStore.getState().oneShots.map((shot) => shot.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("adds evolve at level 5 and keeps the old stage on screen until it plays", async () => {
    useAppStore.setState({ tasks: [makeTask(1, TODAY)], totals: { xp: 1650, coins: 0 }, displayStage: 1 });
    totals.mockResolvedValue({ xp: 1710, coins: 0 }); // level 5 starts at 1703 XP
    await useAppStore.getState().completeTask(1);

    expect(kinds()).toEqual(["celebrate", "levelUp", "evolve"]);
    expect(useAppStore.getState().oneShots[2].toStage).toBe(2);
    expect(useAppStore.getState().displayStage).toBe(1);

    const { dequeueOneShot } = useAppStore.getState();
    dequeueOneShot(useAppStore.getState().oneShots[0].id); // celebrate ends
    dequeueOneShot(useAppStore.getState().oneShots[0].id); // levelUp ends
    expect(useAppStore.getState().displayStage).toBe(1);
    dequeueOneShot(useAppStore.getState().oneShots[0].id); // evolve ends
    expect(useAppStore.getState().displayStage).toBe(2);
    expect(useAppStore.getState().oneShots).toEqual([]);
  });

  it("ignores an id that is not the head of the queue", () => {
    useAppStore.setState({
      oneShots: [
        { id: 1, kind: "celebrate" },
        { id: 2, kind: "levelUp" },
      ],
    });
    useAppStore.getState().dequeueOneShot(2);
    expect(useAppStore.getState().oneShots.map((shot) => shot.id)).toEqual([1, 2]);
  });

  it("ignores a dequeue on an empty queue", () => {
    useAppStore.getState().dequeueOneShot(1);
    expect(useAppStore.getState().oneShots).toEqual([]);
  });

  it("keeps the old stage while an evolve is queued, even when progress reloads", async () => {
    useAppStore.setState({ oneShots: [{ id: 9, kind: "evolve", toStage: 2 }], displayStage: 1 });
    totals.mockResolvedValue({ xp: 5000, coins: 0 });
    await useAppStore.getState().loadProgress();
    expect(useAppStore.getState().displayStage).toBe(1);
  });
});

describe("loadProgress", () => {
  it("shows the stage for the level when nothing is queued", async () => {
    totals.mockResolvedValue({ xp: 1710, coins: 0 }); // level 5, stage 2
    await useAppStore.getState().loadProgress();
    expect(useAppStore.getState().displayStage).toBe(2);
  });

  it("stores the time of the last completion", async () => {
    lastCompletion.mockResolvedValue(1_700_000_000_000);
    await useAppStore.getState().loadProgress();
    expect(useAppStore.getState().lastCompletionAt).toBe(1_700_000_000_000);
  });
});
