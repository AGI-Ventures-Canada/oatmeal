import { describe, expect, it, afterEach, beforeEach } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { resetComponentMocks, useRealInstallSkillButton } from "../lib/component-mocks";

const { InstallSkillButton } = await import("@/components/install-skill-button");

describe("InstallSkillButton", () => {
  beforeEach(() => {
    resetComponentMocks();
    useRealInstallSkillButton();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the default trigger button", () => {
    render(<InstallSkillButton />);
    const button = screen.getByRole("button", { name: /install skill/i });
    expect(button.textContent).toContain("Install Skill");
  });

  it("renders a custom trigger when provided", () => {
    render(<InstallSkillButton trigger={<button>Custom Trigger</button>} />);
    const button = screen.getByRole("button", { name: "Custom Trigger" });
    expect(button.textContent).toBe("Custom Trigger");
  });

  it("has correct button type", () => {
    render(<InstallSkillButton />);
    const button = screen.getByRole("button", { name: /install skill/i });
    expect(button.getAttribute("type")).toBe("button");
  });

  it("shows concise install copy and hides troubleshooting details by default", () => {
    render(<InstallSkillButton />);

    fireEvent.click(screen.getByRole("button", { name: /Install Skill/i }));

    expect(
      screen.getByText("Manage Hackathons from Your AI Agent"),
    ).toBeDefined();
    expect(
      screen.getByText(
        "Add this skill to create and manage hackathons from Claude Code or your agent of choice.",
      ),
    ).toBeDefined();
    expect(
      screen.getByText("npx skills add AGI-Ventures-Canada/oatmeal"),
    ).toBeDefined();
  });

  it("keeps the install command on one line and allows overflow within the code block", () => {
    render(<InstallSkillButton />);

    fireEvent.click(screen.getByRole("button", { name: /Install Skill/i }));

    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("sm:max-w-lg");

    const installCommand = screen.getByText(
      "npx skills add AGI-Ventures-Canada/oatmeal",
    );
    const codeBlock = installCommand.closest("code");

    expect(codeBlock).not.toBeNull();
    expect(codeBlock?.className).toContain("overflow-x-auto");
    expect(codeBlock?.className).toContain("whitespace-nowrap");
  });
});
