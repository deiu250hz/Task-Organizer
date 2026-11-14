import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Task } from "../../domain/types";
import { renderWith } from "../../components/__tests__/renderWithStore";
import { usePetMood } from "../selectors";

// A tiny component so the hook can be rendered: it prints the mood it gets.
function MoodProbe() {
  return <span>{usePetMood()}</span>;
}

const TODAY = "2026-11-14";

function task(id: number, endDate: string, extra: Partial<Task> = {}): Task {
  return {
    id,
    title: `Task ${id}`,
    notes: null,
    startDate: "2026-11-10",
    endDate,
    difficulty: 1,
    status: "active",
    overdueFlagged: false,
    completedOn: null,
    ...extra,
  };
}
const doneToday = (id: number) => task(id, TODAY, { status: "done", completedOn: TODAY });

function moodAt(hour: number, minute: number, state: Parameters<typeof renderWith>[0]): string {
  vi.setSystemTime(new Date(2026, 10, 14, hour, minute, 0));
  return renderWith(state, <MoodProbe />).replace(/<[^>]*>/g, "");
}
const minutesAgo = (hour: number, minute: number, ago: number) =>
  new Date(2026, 10, 14, hour, minute, 0).getTime() - ago * 60_000;

describe("usePetMood", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("is idle on a quiet afternoon", () => {
    expect(moodAt(15, 0, { tasks: [task(1, TODAY)] })).toBe("idle");
  });

  it("is happy within an hour of completing a task", () => {
    const state = { tasks: [doneToday(1), task(2, TODAY)], lastCompletionAt: minutesAgo(15, 0, 10) };
    expect(moodAt(15, 0, state)).toBe("happy");
  });

  it("goes back to idle once the hour is over, if today's list is not finished", () => {
    const state = { tasks: [doneToday(1), task(2, TODAY)], lastCompletionAt: minutesAgo(15, 0, 90) };
    expect(moodAt(15, 0, state)).toBe("idle");
  });

  it("stays happy for the rest of the day when today's list is finished", () => {
    const state = { tasks: [doneToday(1)], lastCompletionAt: minutesAgo(15, 0, 600) };
    expect(moodAt(15, 0, state)).toBe("happy");
  });

  it("is sad with an overdue task and nothing completed today", () => {
    expect(moodAt(15, 0, { tasks: [task(1, "2026-11-12")] })).toBe("sad");
  });

  it("is sleepy late in the evening when nothing was completed", () => {
    expect(moodAt(23, 0, { tasks: [task(1, TODAY)] })).toBe("sleepy");
  });

  it("counts a backdated task that was already flagged as overdue for the mood", () => {
    expect(moodAt(15, 0, { tasks: [task(1, "2026-11-12", { overdueFlagged: true })] })).toBe("sad");
  });
});
