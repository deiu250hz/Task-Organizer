import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { renderWith } from "../../__tests__/renderWithStore";
import { BackupSection, type BackupSectionProps } from "../BackupSection";
import { SettingsMenu } from "../SettingsMenu";
import { SettingsPanel, type SettingsPanelProps } from "../SettingsPanel";
import { TitleBar } from "../TitleBar";

const noop = () => undefined;

const idleBackup: BackupSectionProps = {
  busy: false,
  message: null,
  pending: null,
  onExport: noop,
  onImport: noop,
  onConfirmImport: noop,
  onCancelImport: noop,
};

function panel(overrides: Partial<SettingsPanelProps> = {}): string {
  return renderToStaticMarkup(
    <SettingsPanel
      id="settings-panel"
      remindersEnabled
      onRemindersChange={noop}
      onTest={noop}
      testResult="none"
      theme="dusk"
      onThemeChange={noop}
      backup={idleBackup}
      {...overrides}
    />,
  );
}

function backup(overrides: Partial<BackupSectionProps> = {}): string {
  return renderToStaticMarkup(<BackupSection {...idleBackup} {...overrides} />);
}

const pending = {
  fileName: "my backup.json",
  summary: { tasks: 12, events: 40, items: 1, exportedAt: "2026-11-14T12:00:00.000Z" },
};

describe("SettingsMenu", () => {
  it("starts closed: only the gear button, named and collapsed", () => {
    const html = renderWith({}, <SettingsMenu />);
    expect(html).toContain('aria-label="Settings"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain("Test reminder");
    expect(html).not.toContain('type="checkbox"');
  });

  it("is part of the title bar, next to the window buttons", () => {
    const html = renderWith({}, <TitleBar title="Tasks Organizer" />);
    expect(html).toContain('aria-label="Settings"');
    expect(html).toContain('aria-label="Minimize window"');
    expect(html).toContain('aria-label="Close window"');
  });
});

describe("SettingsPanel theme picker", () => {
  it("offers one named radio per theme in a labelled group", () => {
    const html = panel();
    expect(html).toContain("<legend");
    expect(html.split('type="radio"').length - 1).toBe(4);
    for (const label of ["Dusk", "Forest", "Ocean", "Game Boy"]) expect(html).toContain(label);
  });

  it("checks only the theme in use", () => {
    const html = panel({ theme: "ocean" });
    expect(html.split('checked=""').length - 1).toBe(2); // the reminders checkbox + the ocean radio
    expect(html).toMatch(/value="ocean"[^>]*checked=""|checked=""[^>]*value="ocean"/);
    expect(html).not.toMatch(/value="dusk"[^>]*checked=""|checked=""[^>]*value="dusk"/);
  });

  it("previews each theme's colours with a data-theme swatch, without hex values", () => {
    const html = panel();
    for (const name of ["dusk", "forest", "ocean", "gameboy"]) expect(html).toContain(`data-theme="${name}"`);
    expect(html).not.toMatch(/#[0-9a-fA-F]{6}/);
  });
});

describe("BackupSection", () => {
  it("offers Export and Import, enabled, and no confirmation, when idle", () => {
    const html = backup();
    expect(html).toContain("Export backup");
    expect(html).toContain("Import backup");
    expect(html).not.toContain('disabled=""');
    expect(html).not.toContain("Replace your data?");
    expect(html).toContain('aria-labelledby="backup-heading"');
  });

  it("disables the buttons while an action runs", () => {
    const html = backup({ busy: true });
    expect(html.split('disabled=""').length - 1).toBe(2);
  });

  it("shows the last result in a status region, red for an error", () => {
    const ok = backup({ message: { tone: "ok", text: "Backup saved to C:\\b.json" } });
    expect(ok).toContain('role="status"');
    expect(ok).toContain("Backup saved to C:\\b.json");
    expect(ok).not.toContain("text-danger");
    const bad = backup({ message: { tone: "error", text: "my backup.json: This file is not a valid backup (it is not JSON)." } });
    expect(bad).toContain("not a valid backup");
    expect(bad).toContain("text-danger");
  });

  it("asks for confirmation, with the file name, its date and its counts", () => {
    const html = backup({ pending });
    expect(html).toContain("Replace your data?");
    expect(html).toContain("my backup.json");
    expect(html).toContain("14 Nov 2026");
    expect(html).toContain("12 tasks");
    expect(html).toContain("40 reward entries");
    expect(html).toContain("A safety copy of your current data is saved first.");
    expect(html).toContain("Replace everything");
    expect(html).toContain("Cancel");
  });

  it("hides Export and Import while a confirmation is showing", () => {
    const html = backup({ pending });
    expect(html).not.toContain("Export backup");
    expect(html).not.toContain("Import backup");
  });

  it("uses the singular for one task and one reward entry", () => {
    const html = backup({ pending: { ...pending, summary: { ...pending.summary, tasks: 1, events: 1 } } });
    expect(html).toContain("1 task and");
    expect(html).toContain("1 reward entry.");
  });

  it("shows a failed import inside the confirmation, so the player can retry", () => {
    const html = backup({ pending, message: { tone: "error", text: "disk full Importing the same file again is safe." } });
    expect(html).toContain("Importing the same file again is safe.");
    expect(html).toContain("Replace everything");
  });

  it("does not show the 'ready' message inside the confirmation", () => {
    const html = backup({ pending, message: { tone: "ok", text: "Ready to import my backup.json." } });
    expect(html).not.toContain("Ready to import");
  });
});

describe("SettingsPanel", () => {
  it("includes the backup section", () => {
    expect(panel()).toContain("Export backup");
  });

  it("shows a labelled checkbox that follows the setting", () => {
    const on = panel({ remindersEnabled: true });
    expect(on).toContain("<label");
    expect(on).toContain("Remind me of tasks when the app starts or a new day begins");
    expect(on).toContain('type="checkbox"');
    // Only the checkbox is looked at: the theme radios have their own checked state.
    const checkedCheckbox = /type="checkbox"[^>]*checked=""|checked=""[^>]*type="checkbox"/;
    expect(on).toMatch(checkedCheckbox);
    expect(panel({ remindersEnabled: false })).not.toMatch(checkedCheckbox);
  });

  it("names the group for screen readers and links it to the gear by id", () => {
    const html = panel();
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Settings"');
    expect(html).toContain('id="settings-panel"');
  });

  it("explains the daily limit and offers a test button", () => {
    const html = panel();
    expect(html).toContain("At most one reminder a day.");
    expect(html).toContain("Test reminder");
  });

  it("shows the result of the test in a status region, and nothing before it", () => {
    expect(panel({ testResult: "none" })).not.toContain("Reminder sent.");
    expect(panel({ testResult: "sent" })).toContain("Reminder sent.");
    const failed = panel({ testResult: "failed" });
    expect(failed).toContain("Could not show a notification.");
    expect(failed).toContain('role="status"');
  });
});
