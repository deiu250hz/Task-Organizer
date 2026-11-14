// Fake data for panels not wired to the store yet: the calendar (Phase 3) and the
// monkey panel (Phases 4-5). Tasks no longer use mock data. Delete this file when both are wired.

// November 2026: the 1st is a Sunday, so a Monday-first grid has 6 leading blanks.
export const MOCK_MONTH = {
  label: "November 2026",
  daysInMonth: 30,
  leadingBlanks: 6,
  today: 13,
  rangeStart: 16,
  rangeEnd: 18,
  daysWithTasks: [12, 13, 16, 17, 18, 20, 24],
};

export const MOCK_PLAYER = {
  level: 3,
  xp: 140,
  xpForNext: 200,
  coins: 85,
  streak: 4,
};
