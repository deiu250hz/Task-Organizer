import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Task } from "../../domain/types";
import { DeleteControl } from "../tasks/DeleteControl";
import { TaskPanel } from "../tasks/TaskPanel";
import { TaskRow } from "../tasks/TaskRow";
import { renderWith } from "./renderWithStore";

const noop = () => undefined;

function task(extra: Partial<Task> = {}): Task {
  return {
    id: 1,
    title: "Buy milk",
    notes: null,
    startDate: "2026-11-14",
    endDate: "2026-11-14",
    difficulty: 1,
    status: "active",
    overdueFlagged: false,
    completedOn: null,
    ...extra,
  };
}

describe("DeleteControl", () => {
  const render = (confirming: boolean) =>
    renderToStaticMarkup(
      <DeleteControl taskTitle="Buy milk" confirming={confirming} onAsk={noop} onConfirm={noop} onCancel={noop} />,
    );

  it("shows only a named trash button until you ask", () => {
    const html = render(false);
    expect(html).toContain('aria-label="Delete task: Buy milk"');
    expect(html).not.toContain("Delete?");
    expect(html).not.toContain(">Yes<");
  });

  it("asks 'Delete?' with Yes and No once you ask", () => {
    const html = render(true);
    expect(html).toContain("Delete?");
    expect(html).toContain(">Yes<");
    expect(html).toContain(">No<");
    expect(html).toContain('aria-label="Confirm deleting Buy milk"');
  });

  it("hides the trash button while confirming, so there is one clear choice", () => {
    expect(render(true)).not.toContain('aria-label="Delete task: Buy milk"');
  });
});

describe("TaskRow", () => {
  const row = (t: Task) => renderToStaticMarkup(<TaskRow task={t} onComplete={noop} onDelete={noop} />);

  it("offers delete for an active task", () => {
    expect(row(task())).toContain('aria-label="Delete task: Buy milk"');
  });

  it("offers delete for an overdue active task", () => {
    expect(row(task({ endDate: "2026-11-10", overdueFlagged: true }))).toContain("Delete task: Buy milk");
  });

  it("does not offer delete for a done task", () => {
    expect(row(task({ status: "done", completedOn: "2026-11-14" }))).not.toContain("Delete task");
  });

  it("keeps the delete button outside the checkbox label", () => {
    const html = row(task());
    expect(html.indexOf("</label>")).toBeGreaterThan(-1);
    expect(html.indexOf("</label>")).toBeLessThan(html.indexOf("Delete task: Buy milk"));
  });

  it("still shows the checkbox, the title and the dates", () => {
    const html = row(task());
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("Buy milk");
    expect(html).toContain("14 Nov");
  });

  it("locks the checkbox of a done task", () => {
    expect(row(task({ status: "done", completedOn: "2026-11-14" }))).toContain('checked=""');
  });
});

describe("TaskPanel", () => {
  it("shows a delete button on every active row and none on done rows", () => {
    const html = renderWith(
      {
        tasks: [
          task({ id: 1, title: "One" }),
          task({ id: 2, title: "Two" }),
          task({ id: 3, title: "Three", status: "done", completedOn: "2026-11-14" }),
        ],
      },
      <TaskPanel />,
    );
    expect(html).toContain("Delete task: One");
    expect(html).toContain("Delete task: Two");
    expect(html).not.toContain("Delete task: Three");
  });
});
