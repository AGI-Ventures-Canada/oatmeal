import React, { useState, createContext } from "react";
import { describe, expect, it, afterEach, mock } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import * as dialogMock from "../lib/dialog-mock";

mock.module("next/navigation", () => ({
  useRouter: () => ({
    push: mock(() => {}),
    refresh: mock(() => {}),
    replace: mock(() => {}),
    prefetch: mock(() => {}),
  }),
  redirect: mock(() => {}),
  notFound: mock(() => {}),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

mock.module("@/components/ui/dialog", () => dialogMock);

mock.module("@/components/ui/accordion", () => {
  function Accordion({ children }: { children: React.ReactNode; type?: string; collapsible?: boolean }) {
    const [openItem, setOpenItem] = useState<string | null>(null);
    const AccordionCtx = createContext({ openItem: null as string | null, toggle: (_v: string) => {} });
    return (
      <AccordionCtx.Provider value={{ openItem, toggle: (v: string) => setOpenItem((prev: string | null) => prev === v ? null : v) }}>
        <div data-accordion>{children}</div>
      </AccordionCtx.Provider>
    );
  }

  function AccordionItem({ children, value }: { children: React.ReactNode; value: string }) {
    return <div data-accordion-item={value}>{children}</div>;
  }

  function AccordionTrigger({ children }: { children: React.ReactNode }) {
    return <button role="button">{children}</button>;
  }

  function AccordionContent({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>;
  }

  return { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
});

const { InstallSkillButton } = await import("@/components/install-skill-button");

describe("InstallSkillButton", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the default trigger button", () => {
    render(<InstallSkillButton />);
    const button = screen.getByRole("button", { name: /Install Skill/i });
    expect(button).toBeDefined();
  });

  it("renders a custom trigger when provided", () => {
    render(<InstallSkillButton trigger={<button>Custom Trigger</button>} />);
    const button = screen.getByRole("button", { name: "Custom Trigger" });
    expect(button).toBeDefined();
  });

  it("has aria attributes for dialog trigger", () => {
    render(<InstallSkillButton />);
    const button = screen.getByRole("button", { name: /Install Skill/i });
    expect(button.getAttribute("aria-haspopup")).toBe("dialog");
    expect(button.getAttribute("aria-expanded")).toBe("false");
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
