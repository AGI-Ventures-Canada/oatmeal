import { describe, expect, it, afterEach } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { InstallSkillButton } from "@/components/install-skill-button";

describe("InstallSkillButton", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the default trigger button", () => {
    render(<InstallSkillButton />);
    const button = screen.getByRole("button");
    expect(button.textContent).toContain("Install Skill");
  });

  it("renders a custom trigger when provided", () => {
    render(<InstallSkillButton trigger={<button>Custom Trigger</button>} />);
    const button = screen.getByRole("button");
    expect(button.textContent).toBe("Custom Trigger");
  });

  it("has aria attributes for dialog trigger", () => {
    render(<InstallSkillButton />);
    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-haspopup")).toBe("dialog");
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });

  it("has correct button type", () => {
    render(<InstallSkillButton />);
    const button = screen.getByRole("button");
    expect(button.getAttribute("type")).toBe("button");
  });

  it("shows concise install copy and hides troubleshooting details by default", () => {
    render(<InstallSkillButton />);

    fireEvent.click(screen.getByRole("button", { name: "Install Skill" }));

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
    expect(screen.queryByText(/Node.js 18 or newer/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Troubleshooting" }));

    expect(
      screen.getByText(
        "Run the command from the project directory where you want the skill available.",
      ),
    ).toBeDefined();
    expect(screen.getByText(/Node.js 18 or newer/)).toBeDefined();
  });

  it("keeps the install command on one line and allows overflow within the code block", () => {
    render(<InstallSkillButton />);

    fireEvent.click(screen.getByRole("button", { name: "Install Skill" }));

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
