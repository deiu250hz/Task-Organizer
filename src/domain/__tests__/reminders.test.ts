import { describe, expect, it } from "vitest";
import { reminderMessage, shouldRemind, type ShouldRemindInput } from "../reminders";

describe("reminderMessage", () => {
  it("says nothing when there is nothing due and nothing overdue", () => {
    expect(reminderMessage(0, 0)).toBeNull();
  });

  it("uses the singular for one task due today", () => {
    expect(reminderMessage(1, 0)).toBe("1 task due today.");
  });

  it("uses the plural for several tasks due today", () => {
    expect(reminderMessage(3, 0)).toBe("3 tasks due today.");
  });

  it("uses the singular for one overdue task", () => {
    expect(reminderMessage(0, 1)).toBe("1 task is overdue.");
  });

  it("uses the plural for several overdue tasks", () => {
    expect(reminderMessage(0, 4)).toBe("4 tasks are overdue.");
  });

  it("joins due and overdue in one sentence", () => {
    expect(reminderMessage(3, 2)).toBe("3 tasks due today and 2 overdue.");
    expect(reminderMessage(1, 1)).toBe("1 task due today and 1 overdue.");
  });
});

describe("shouldRemind", () => {
  const base: ShouldRemindInput = {
    enabled: true,
    today: "2026-11-15",
    lastRemindedDay: null,
    dueToday: 2,
    overdue: 0,
  };

  it("reminds when enabled, never reminded and something is due", () => {
    expect(shouldRemind(base)).toBe(true);
  });

  it("reminds about overdue tasks alone", () => {
    expect(shouldRemind({ ...base, dueToday: 0, overdue: 1 })).toBe(true);
  });

  it("does not remind when the setting is off", () => {
    expect(shouldRemind({ ...base, enabled: false })).toBe(false);
  });

  it("does not remind twice on the same day", () => {
    expect(shouldRemind({ ...base, lastRemindedDay: "2026-11-15" })).toBe(false);
  });

  it("reminds again the day after a reminder", () => {
    expect(shouldRemind({ ...base, lastRemindedDay: "2026-11-14" })).toBe(true);
  });

  it("treats a reminder dated in the future (clock moved back) as not today", () => {
    expect(shouldRemind({ ...base, lastRemindedDay: "2026-12-01" })).toBe(true);
  });

  it("does not remind when there is nothing to say", () => {
    expect(shouldRemind({ ...base, dueToday: 0, overdue: 0 })).toBe(false);
  });
});
