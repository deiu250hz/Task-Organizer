import { beforeEach, describe, expect, it, vi } from "vitest";
import { settingsRepo } from "../../repositories/settingsRepo";
import { useAppStore } from "../useAppStore";

vi.mock("../../repositories/settingsRepo", () => ({
  settingsRepo: { get: vi.fn(), set: vi.fn() },
}));
vi.mock("../../repositories/taskRepo", () => ({
  taskRepo: { listInRange: vi.fn(), create: vi.fn(), complete: vi.fn(), flagOverdue: vi.fn(), archive: vi.fn() },
}));
vi.mock("../../repositories/rewardRepo", () => ({
  rewardRepo: { totals: vi.fn(), activeDaysSinceLastReset: vi.fn(), completedCount: vi.fn(), lastCompletionAt: vi.fn() },
}));

const get = vi.mocked(settingsRepo.get);
const set = vi.mocked(settingsRepo.set);

beforeEach(() => {
  vi.resetAllMocks();
  set.mockResolvedValue(undefined);
  useAppStore.setState({
    species: null,
    settingsLoaded: false,
    totals: { xp: 240, coins: 60 },
    streak: 3,
    error: null,
  });
});

describe("loadSettings", () => {
  it("reads the saved pet from the 'species' key", async () => {
    get.mockResolvedValue("cat");
    await useAppStore.getState().loadSettings();
    expect(get).toHaveBeenCalledWith("species");
    expect(useAppStore.getState().species).toBe("cat");
    expect(useAppStore.getState().settingsLoaded).toBe(true);
  });

  it("counts a missing value as not chosen yet", async () => {
    get.mockResolvedValue(null);
    await useAppStore.getState().loadSettings();
    expect(useAppStore.getState().species).toBeNull();
    expect(useAppStore.getState().settingsLoaded).toBe(true);
  });

  it("counts an unknown value as not chosen, instead of trusting it", async () => {
    get.mockResolvedValue("dog");
    await useAppStore.getState().loadSettings();
    expect(useAppStore.getState().species).toBeNull();
  });

  it("still finishes loading and records an error when the repository fails", async () => {
    get.mockRejectedValue("db locked");
    await useAppStore.getState().loadSettings();
    expect(useAppStore.getState().settingsLoaded).toBe(true);
    expect(useAppStore.getState().species).toBeNull();
    expect(useAppStore.getState().error).toBe("db locked");
  });
});

describe("chooseSpecies", () => {
  it("saves the choice, then updates the state", async () => {
    await useAppStore.getState().chooseSpecies("cat");
    expect(set).toHaveBeenCalledWith("species", "cat");
    expect(useAppStore.getState().species).toBe("cat");
  });

  it("keeps level, XP, coins and streak when switching: the pet is only a skin", async () => {
    useAppStore.setState({ species: "monkey" });
    await useAppStore.getState().chooseSpecies("cat");
    expect(useAppStore.getState().totals).toEqual({ xp: 240, coins: 60 });
    expect(useAppStore.getState().streak).toBe(3);
  });

  it("does nothing when you choose the pet you already have", async () => {
    useAppStore.setState({ species: "cat" });
    await useAppStore.getState().chooseSpecies("cat");
    expect(set).not.toHaveBeenCalled();
  });

  it("keeps the previous pet and records an error when saving fails", async () => {
    useAppStore.setState({ species: "monkey" });
    set.mockRejectedValue("disk full");
    await useAppStore.getState().chooseSpecies("cat");
    expect(useAppStore.getState().species).toBe("monkey");
    expect(useAppStore.getState().error).toBe("disk full");
  });

  it("lets you choose a first pet when none was chosen yet", async () => {
    await useAppStore.getState().chooseSpecies("monkey");
    expect(useAppStore.getState().species).toBe("monkey");
  });
});
