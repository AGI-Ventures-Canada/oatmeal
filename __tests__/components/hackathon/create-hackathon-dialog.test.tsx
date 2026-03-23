import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { resetComponentMocks, setRouter } from "../../lib/component-mocks"

const mockPush = mock(() => {})
const mockFetch = mock(() =>
  Promise.resolve(
    new Response(JSON.stringify({ slug: "my-awesome-hackathon" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  )
)

mock.module("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
  }) =>
    open !== false ? (
      <div>
        <button type="button" onClick={() => onOpenChange?.(false)}>
          Close Dialog
        </button>
        {children}
      </div>
    ) : null,
  DialogContent: ({ children }: { children: React.ReactNode; className?: string }) => (
    <div role="dialog">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogTrigger: ({ children, asChild, ...props }: { children: React.ReactNode; asChild?: boolean; [key: string]: unknown }) => (
    <div {...props}>{children}</div>
  ),
  DialogClose: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <button type="button" {...props}>{children}</button>
  ),
  DialogFooter: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div>{children}</div>
  ),
  DialogOverlay: ({ className }: { className?: string }) => <div />,
  DialogPortal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const { CreateHackathonDialog } = await import("@/components/hackathon/create-hackathon-dialog")

beforeEach(() => {
  resetComponentMocks()
  mockPush.mockClear()
  mockFetch.mockClear()
  setRouter({ push: mockPush })
  mockFetch.mockImplementation(() =>
    Promise.resolve(
      new Response(JSON.stringify({ slug: "my-awesome-hackathon" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )
  )
  globalThis.fetch = mockFetch as typeof fetch
})

afterEach(() => {
  cleanup()
})

function renderDialog() {
  return render(<CreateHackathonDialog open onOpenChange={() => {}} />)
}

describe("CreateHackathonDialog", () => {
  it("starts with the flow chooser", () => {
    renderDialog()

    const dialog = screen.getByRole("dialog")
    expect(within(dialog).getByText("Create Hackathon")).toBeDefined()
    expect(within(dialog).getByText("From scratch")).toBeDefined()
    expect(within(dialog).getByText("From external event page")).toBeDefined()
    expect(within(dialog).queryByLabelText("Hackathon Name")).toBeNull()
    expect(within(dialog).queryByText("Step 1 of 2")).toBeNull()
  })

  it("enters the scratch flow and starts on the basics step", async () => {
    renderDialog()

    const dialog = screen.getByRole("dialog")
    fireEvent.click(within(dialog).getByRole("button", { name: /From scratch/i }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText("My Awesome Hackathon")).toBeDefined()
      expect(screen.queryByLabelText("Event Page URL")).toBeNull()
    })
  })

  it("creates a hackathon from scratch", async () => {
    renderDialog()

    const dialog = screen.getByRole("dialog")
    fireEvent.click(within(dialog).getByRole("button", { name: /From scratch/i }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText("My Awesome Hackathon")).toBeDefined()
    })

    fireEvent.change(screen.getByPlaceholderText("My Awesome Hackathon"), {
      target: { value: "My Awesome Hackathon" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Next" }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText("What's this hackathon about?")).toBeDefined()
    })

    fireEvent.change(screen.getByPlaceholderText("What's this hackathon about?"), {
      target: { value: "A test hackathon." },
    })
    fireEvent.click(screen.getByRole("button", { name: "Create Hackathon" }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockPush).toHaveBeenCalledWith("/e/my-awesome-hackathon/manage")
    })

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("/api/dashboard/hackathons")
    expect(init.method).toBe("POST")
    expect(JSON.parse(init.body as string)).toEqual({
      name: "My Awesome Hackathon",
      description: "A test hackathon.",
    })
  })

  it("routes external event pages through the import flow", async () => {
    renderDialog()

    const dialog = screen.getByRole("dialog")
    fireEvent.click(within(dialog).getByRole("button", { name: /From external event page/i }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText("eventbrite.com/e/my-event")).toBeDefined()
    })

    fireEvent.change(screen.getByPlaceholderText("eventbrite.com/e/my-event"), {
      target: { value: "https://luma.com/sfagents" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Continue" }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/luma.com/sfagents?edit=true")
    })

    expect(mockFetch).not.toHaveBeenCalled()
    expect(screen.queryByText(/Expected import:/)).toBeNull()
  })

  it("routes non-Luma event pages through the generic import flow", async () => {
    renderDialog()

    const dialog = screen.getByRole("dialog")
    fireEvent.click(within(dialog).getByRole("button", { name: /From external event page/i }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText("eventbrite.com/e/my-event")).toBeDefined()
    })

    fireEvent.change(screen.getByPlaceholderText("eventbrite.com/e/my-event"), {
      target: { value: "https://www.eventbrite.com/e/devops-for-genai-hackathon-ottawa-2026-tickets-1984872192158" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Continue" }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        "/import?url=https%3A%2F%2Fwww.eventbrite.com%2Fe%2Fdevops-for-genai-hackathon-ottawa-2026-tickets-1984872192158"
      )
    })

    expect(mockFetch).not.toHaveBeenCalled()
  })

  describe("initialMethod prop", () => {
    it("skips the method chooser when initialMethod is scratch", () => {
      render(
        <CreateHackathonDialog open onOpenChange={() => {}} initialMethod="scratch" />
      )

      expect(screen.getByPlaceholderText("My Awesome Hackathon")).toBeDefined()
      expect(screen.queryByText("From scratch")).toBeNull()
      expect(screen.queryByText("From external event page")).toBeNull()
    })

    it("skips the method chooser when initialMethod is external", () => {
      render(
        <CreateHackathonDialog open onOpenChange={() => {}} initialMethod="external" />
      )

      expect(screen.getByPlaceholderText("eventbrite.com/e/my-event")).toBeDefined()
      expect(screen.queryByText("From scratch")).toBeNull()
      expect(screen.queryByText("From external event page")).toBeNull()
    })

    it("closes the dialog when pressing back on step 0 with initialMethod", () => {
      const onOpenChange = mock(() => {})
      render(
        <CreateHackathonDialog open onOpenChange={onOpenChange} initialMethod="scratch" />
      )

      fireEvent.click(screen.getByRole("button", { name: "Back" }))
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe("onAuthRequired prop (guest mode)", () => {
    it("shows 'Sign up to create' on the final step", async () => {
      const onAuthRequired = mock(() => {})
      render(
        <CreateHackathonDialog
          open
          onOpenChange={() => {}}
          initialMethod="scratch"
          onAuthRequired={onAuthRequired}
        />
      )

      fireEvent.change(screen.getByPlaceholderText("My Awesome Hackathon"), {
        target: { value: "Test Hackathon" },
      })
      fireEvent.click(screen.getByRole("button", { name: "Next" }))

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Sign up to create" })).toBeDefined()
      })
    })

    it("calls onAuthRequired instead of making an API call on submit", async () => {
      const onAuthRequired = mock(() => {})
      render(
        <CreateHackathonDialog
          open
          onOpenChange={() => {}}
          initialMethod="scratch"
          onAuthRequired={onAuthRequired}
        />
      )

      fireEvent.change(screen.getByPlaceholderText("My Awesome Hackathon"), {
        target: { value: "Test Hackathon" },
      })
      fireEvent.click(screen.getByRole("button", { name: "Next" }))

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Sign up to create" })).toBeDefined()
      })

      fireEvent.click(screen.getByRole("button", { name: "Sign up to create" }))

      await waitFor(() => {
        expect(onAuthRequired).toHaveBeenCalledTimes(1)
      })

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it("still navigates for external import even with onAuthRequired", async () => {
      const onAuthRequired = mock(() => {})
      render(
        <CreateHackathonDialog
          open
          onOpenChange={() => {}}
          initialMethod="external"
          onAuthRequired={onAuthRequired}
        />
      )

      fireEvent.change(screen.getByPlaceholderText("eventbrite.com/e/my-event"), {
        target: { value: "https://luma.com/test-event" },
      })
      fireEvent.click(screen.getByRole("button", { name: "Continue" }))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/luma.com/test-event?edit=true")
      })

      expect(onAuthRequired).not.toHaveBeenCalled()
    })
  })
})
