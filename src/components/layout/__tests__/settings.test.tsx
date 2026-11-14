import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { renderWith } from "../../__tests__/renderWithStore";
import { SettingsMenu } from "../SettingsMenu";
import { SettingsPanel, type SettingsPanelProps } from "../SettingsPanel";
import { TitleBar } from "../TitleBar";

const noop = () => undefined;

function panel(overrides: Partial<SettingsPanelProps> = {}): string {
  return renderToStaticMarkup(
    <SettingsPanel
      id="settings-panel"
      remindersEnabled
      onRemindersChange={noop}
      onTest={noop}
      testResult="none"
      {...overrides}
    />,
  );
}

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

describe("SettingsPanel", () => {
  it("shows a labelled checkbox that follows the setting", () => {
    const on = panel({ remindersEnabled: true });
    expect(on).toContain("<label");
    expect(on).toContain("Remind me of tasks when the app starts or a new day begins");
    expect(on).toContain('type="checkbox"');
    expect(on).toContain('checked=""');
    expect(panel({ remindersEnabled: false })).not.toContain('checked=""');
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
