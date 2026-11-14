import { describe, expect, it } from "vitest";
import { moodFor, type MoodInput } from "../mood";

// A calm baseline: nothing overdue, one task to do, daytime, nothing ever completed.
const base: MoodInput = {
  overdueCount: 0,
  completedToday: 0,
  activeDueToday: 1,
  localHour: 14,
  minutesSinceLastCompletion: null,
};
const mood = (overrides: Partial<MoodInput>) => moodFor({ ...base, ...overrides });

describe("moodFor: sad", () => {
  it("is sad with an overdue task and nothing completed today", () => {
    expect(mood({ overdueCount: 1 })).toBe("sad");
  });

  it("stops being sad as soon as something is completed today", () => {
    expect(mood({ overdueCount: 3, completedToday: 1, minutesSinceLastCompletion: 5 })).toBe("happy");
    expect(mood({ overdueCount: 3, completedToday: 1, minutesSinceLastCompletion: 300 })).toBe("idle");
  });

  it("beats sleepy and the happy window", () => {
    expect(mood({ overdueCount: 1, localHour: 23 })).toBe("sad");
    // finished a task at 23:30 yesterday, it is 00:10 today: nothing done today yet, still overdue
    expect(mood({ overdueCount: 1, minutesSinceLastCompletion: 40 })).toBe("sad");
  });
});

describe("moodFor: sleepy", () => {
  it("is sleepy from 22:00 when nothing was completed today", () => {
    expect(mood({ localHour: 22 })).toBe("sleepy");
    expect(mood({ localHour: 23 })).toBe("sleepy");
  });

  it("is not sleepy before 22:00", () => {
    expect(mood({ localHour: 21 })).toBe("idle");
  });

  it("is not sleepy once something was completed today", () => {
    expect(mood({ localHour: 23, completedToday: 1, activeDueToday: 1, minutesSinceLastCompletion: 400 })).toBe("idle");
  });
});

describe("moodFor: happy after a completion", () => {
  it("is happy within an hour of the last completion", () => {
    expect(mood({ completedToday: 1, minutesSinceLastCompletion: 0 })).toBe("happy");
    expect(mood({ completedToday: 1, minutesSinceLastCompletion: 59 })).toBe("happy");
  });

  it("stops being happy at exactly 60 minutes", () => {
    expect(mood({ completedToday: 1, minutesSinceLastCompletion: 60 })).toBe("idle");
    expect(mood({ completedToday: 1, minutesSinceLastCompletion: 61 })).toBe("idle");
  });

  it("treats a negative gap (clock moved back) as just now", () => {
    expect(mood({ completedToday: 1, minutesSinceLastCompletion: -30 })).toBe("happy");
  });

  it("never counts a missing completion as recent", () => {
    expect(mood({ completedToday: 0, minutesSinceLastCompletion: null })).toBe("idle");
  });
});

describe("moodFor: happy for the rest of the day", () => {
  it("is happy all day once today's list is done, however long ago", () => {
    expect(mood({ completedToday: 2, activeDueToday: 0, minutesSinceLastCompletion: 600 })).toBe("happy");
  });

  it("is happy late in the evening too, because something was completed", () => {
    expect(mood({ completedToday: 1, activeDueToday: 0, localHour: 23, minutesSinceLastCompletion: 800 })).toBe("happy");
  });

  it("falls back to idle when a new task is added to today's list after the hour is over", () => {
    expect(mood({ completedToday: 1, activeDueToday: 1, minutesSinceLastCompletion: 120 })).toBe("idle");
  });

  it("is not happy for an empty list when nothing was completed", () => {
    expect(mood({ completedToday: 0, activeDueToday: 0 })).toBe("idle");
  });
});

describe("moodFor: idle", () => {
  it("is idle by default", () => {
    expect(mood({})).toBe("idle");
  });
});
