// Phase 1 only: fake data so the layout can be judged before any store exists.
// Delete this file when the panels are wired to the store (Phase 2+).

export type MockTaskStatus = "today" | "upcoming" | "overdue" | "done";

export interface MockTask {
  id: number;
  title: string;
  dateLabel: string;
  status: MockTaskStatus;
}

export const MOCK_TASKS: MockTask[] = [
  { id: 1, title: "Finish algorithms homework", dateLabel: "Overdue · 12 Nov", status: "overdue" },
  { id: 2, title: "Read Tauri capabilities docs", dateLabel: "Today", status: "today" },
  { id: 3, title: "Gym session", dateLabel: "Today", status: "today" },
  { id: 4, title: "Reply to project group", dateLabel: "Today", status: "done" },
  { id: 5, title: "Prepare Java lab report", dateLabel: "16 – 18 Nov", status: "upcoming" },
  { id: 6, title: "Dentist appointment", dateLabel: "20 Nov", status: "upcoming" },
  { id: 7, title: "Buy birthday gift", dateLabel: "24 Nov", status: "upcoming" },
];

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
