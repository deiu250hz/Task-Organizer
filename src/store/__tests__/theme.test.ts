import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../repositories/taskRepo", () => ({
  taskRepo: { listInRange: vi.fn(), create: vi.fn(), complete: vi.fn(), flagOverdue: vi.fn(), archive: vi.fn() },
}));
vi.mock("../../repositories/settingsRepo", () => ({
  settingsRepo: { get: vi.fn(), set: vi.fn() },
}));
vi.mock("../../repositories/rewardRepo", () => ({
  rewardRepo: { totals: vi.fn(), activeDaysSinceLastReset: vi.fn(), completedCount: vi.fn(), lastCompletionAt: vi.fn() },
}));
vi.mock("../../repositories/shopRepo", () => ({
  shopRepo: { listItems: vi.fn(), listOwned: vi.fn(), purchase: vi.fn(), setEquipped: vi.fn() },
}));
vi.mock("../../platform/notifier", () => ({
  notifier: { notify: vi.fn() },
}));

async function freshStore() {
  vi.resetModules();
  const { settingsRepo } = await import("../../repositories/settingsRepo");
  const { useAppStore } = await import("../useAppStore");
  vi.mocked(settingsRepo.get).mockResolvedValue(null);
  vi.mocked(settingsRepo.set).mockResolvedValue(undefined);
  return { settingsRepo, useAppStore };
}

describe("theme", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts on the default theme", async () => {
    const { useAppStore } = await freshStore();
    expect(useAppStore.getState().theme).toBe("dusk");
  });

  it("loadSettings reads the saved theme", async () => {
    const { settingsRepo, useAppStore } = await freshStore();
    vi.mocked(settingsRepo.get).mockImplementation(async (key) => (key === "theme" ? "ocean" : null));
    await useAppStore.getState().loadSettings();
    expect(useAppStore.getState().theme).toBe("ocean");
  });

  it("loadSettings falls back to the default when the theme is missing or unknown", async () => {
    const { settingsRepo, useAppStore } = await freshStore();
    await useAppStore.getState().loadSettings();
    expect(useAppStore.getState().theme).toBe("dusk");

    vi.mocked(settingsRepo.get).mockImplementation(async (key) => (key === "theme" ? "neon" : null));
    await useAppStore.getState().loadSettings();
    expect(useAppStore.getState().theme).toBe("dusk");
  });

  it("setTheme saves the name and updates the state", async () => {
    const { settingsRepo, useAppStore } = await freshStore();
    await useAppStore.getState().setTheme("forest");
    expect(settingsRepo.set).toHaveBeenCalledWith("theme", "forest");
    expect(useAppStore.getState().theme).toBe("forest");
    expect(useAppStore.getState().error).toBeNull();
  });

  it("setTheme does nothing when the theme is unchanged", async () => {
    const { settingsRepo, useAppStore } = await freshStore();
    await useAppStore.getState().setTheme("dusk");
    expect(settingsRepo.set).not.toHaveBeenCalled();
  });

  it("setTheme keeps the old theme and sets error when saving fails", async () => {
    const { settingsRepo, useAppStore } = await freshStore();
    vi.mocked(settingsRepo.set).mockRejectedValue(new Error("disk full"));
    await useAppStore.getState().setTheme("gameboy");
    expect(useAppStore.getState().theme).toBe("dusk");
    expect(useAppStore.getState().error).toBe("disk full");
  });
});
