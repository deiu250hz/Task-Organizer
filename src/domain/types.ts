// Domain types from PLAN.md section 4. Pure: no imports from React, Zustand, Tauri or SQL.

export type ISODate = string; // local 'YYYY-MM-DD'
export type Difficulty = 1 | 2 | 3;
export type TaskStatus = "active" | "done" | "archived";
export type Slot = "hat" | "glasses" | "held" | "background";
export type Stage = 1 | 2 | 3 | 4;
export type Mood = "idle" | "happy" | "sad" | "sleepy";
export type OneShot = "celebrate" | "levelUp" | "evolve" | "equip";

export interface Task {
  id: number;
  title: string;
  notes: string | null;
  startDate: ISODate;
  endDate: ISODate;
  difficulty: Difficulty;
  status: TaskStatus;
  overdueFlagged: boolean;
  completedOn: ISODate | null;
}

export interface NewTask {
  title: string;
  notes?: string;
  startDate: ISODate;
  endDate: ISODate;
  difficulty: Difficulty;
}

/** An inclusive range of days chosen in the calendar. from <= to; a single day has from === to. */
export interface DateSelection {
  from: ISODate;
  to: ISODate;
}

/** A one-shot animation waiting its turn. The queue plays them in order, one at a time. */
export interface QueuedOneShot {
  id: number;
  kind: OneShot;
  /** Only for "evolve": the stage the pet becomes when it ends. */
  toStage?: Stage;
}

export interface Reward {
  xp: number;
  coins: number;
}

export interface Totals {
  xp: number;
  coins: number;
}

export interface Item {
  id: number;
  slot: Slot;
  name: string;
  price: number;
  minLevel: number;
  assetKey: string;
}

export interface OwnedItem {
  itemId: number;
  equipped: boolean;
}

export type Equipped = Record<Slot, string | null>; // slot -> assetKey

/** The two groups the task panel shows. */
export type TaskGroup = "active" | "done";
/** true = the group is collapsed (its heading stays, its tasks are hidden). */
export type CollapsedGroups = Record<TaskGroup, boolean>;
