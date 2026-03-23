import { describe, it, expect, mock, afterEach, beforeEach } from "bun:test"
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react"
import {
  resetComponentMocks,
  setRouter,
  setPathname,
  setClerkIsSignedIn,
  setClerkUser,
  setClerkOrganization,
  setClerkMemberships,
  setClerkSetActive,
} from "../../lib/component-mocks"

const storage = new Map<string, string>()
globalThis.localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
  get length() { return storage.size },
  key: () => null,
} as Storage

import { clerkState, clerkMock, resetClerkState } from "../../lib/clerk-mock"

mock.module("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { src, alt, width, height, ...rest } = props
    return <img src={src as string} alt={alt as string} width={width as number} height={height as number} {...rest} />
  },
}))

mock.module("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => open !== false ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode; className?: string }) => <div>{children}</div>,
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

mock.module("@/components/hackathon/preview/hackathon-preview-client", () => ({
  HackathonPreviewClient: (props: { onBannerChange?: (imageUrl: string | null) => void }) => (
    <div data-testid="preview">
      <button type="button" onClick={() => props.onBannerChange?.(null)}>
        Clear Banner
      </button>
    </div>
  ),
}))

mock.module("@/components/sign-in-required-dialog", () => ({
  SignInRequiredDialog: (props: { open: boolean }) =>
    props.open ? <div data-testid="sign-in-dialog">Sign In Required</div> : null,
}))

mock.module("@/components/create-organization-dialog", () => ({
  CreateOrganizationDialog: (props: { open: boolean; onSuccess?: () => void }) => {
    return props.open ? (
      <div data-testid="create-org-dialog">
        <button type="button" data-testid="simulate-org-created" onClick={() => props.onSuccess?.()}>
          Simulate Org Created
        </button>
      </div>
    ) : null
  },
}))

const { HackathonDraftEditor } = await import(
  "@/components/hackathon/hackathon-draft-editor"
)

const defaultState = {
  name: "Test Hackathon",
  description: null,
  startsAt: null,
  endsAt: null,
  registrationOpensAt: null,
  registrationClosesAt: null,
  locationType: null as "in_person" | "virtual" | null,
  locationName: null,
  locationUrl: null,
  imageUrl: null,
  sponsors: [],
  rules: null,
  prizes: [],
}

beforeEach(() => {
  resetComponentMocks()
  mockIsSignedIn = true
  mockOrganization = { id: "org_1", name: "Test Org" }
  mockMemberships = []
  mockSetActive.mockClear()
  mockPush.mockClear()
  mockClipboardWriteText.mockClear()
  storage.clear()
  setRouter({ push: mockPush })
  setPathname("/luma.com/test")
  setClerkIsSignedIn(mockIsSignedIn)
  setClerkUser({ id: "user_test" })
  setClerkOrganization(mockOrganization)
  setClerkMemberships(mockMemberships)
  setClerkSetActive(mockSetActive)
  Object.defineProperty(globalThis.navigator, "clipboard", {
    value: { writeText: mockClipboardWriteText },
    configurable: true,
  })
})

afterEach(() => {
  cleanup()
})

describe("HackathonDraftEditor", () => {
  const mockOnSubmit = mock(() => Promise.resolve({ slug: "test-hackathon" }))

  beforeEach(() => {
    mockOnSubmit.mockClear()
  })

  function renderEditor(overrides?: Partial<Parameters<typeof HackathonDraftEditor>[0]>) {
    return render(
      <HackathonDraftEditor
        initialState={defaultState}
        storageKey="test-draft"
        onSubmit={mockOnSubmit}
        {...overrides}
      />
    )
  }

  it("renders the create hackathon button", () => {
    renderEditor()
    expect(screen.getByText("Create Event")).toBeDefined()
  })

  it("submits when org is active", async () => {
    renderEditor()
    fireEvent.click(screen.getByText("Create Event"))

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith("/e/test-hackathon/manage")
    })
  })

  describe("org gate", () => {
    beforeEach(() => {
      clerkState.organization = null
      clerkState.memberships = [
        { organization: { id: "org_1", name: "Alpha Org", imageUrl: null } },
        { organization: { id: "org_2", name: "Beta Org", imageUrl: "https://example.com/beta.png" } },
      ]
      setClerkOrganization(null)
      setClerkMemberships(mockMemberships)
    })

    it("shows org gate dialog when submitting without org", async () => {
      renderEditor()
      fireEvent.click(screen.getByText("Create Event"))

      await waitFor(() => {
        expect(screen.getByText("Organization Required")).toBeDefined()
      })
    })

    it("lists existing organizations", async () => {
      renderEditor()
      fireEvent.click(screen.getByText("Create Event"))

      await waitFor(() => {
        expect(screen.getByText("Alpha Org")).toBeDefined()
        expect(screen.getByText("Beta Org")).toBeDefined()
      })
    })

    it("auto-submits after selecting an organization", async () => {
      mockSetActive.mockImplementation(async () => {
        mockOrganization = { id: "org_1", name: "Alpha Org" }
        setClerkOrganization(mockOrganization)
      })
      renderEditor()
      fireEvent.click(screen.getByText("Create Event"))

      await waitFor(() => screen.getByText("Alpha Org"))
      fireEvent.click(screen.getByText("Alpha Org"))

      await waitFor(() => {
        expect(clerkState.setActive).toHaveBeenCalledWith({ organization: "org_1" })
        expect(mockOnSubmit).toHaveBeenCalled()
      })
    })

    it("auto-submits after creating a new organization", async () => {
      renderEditor()
      fireEvent.click(screen.getByText("Create Event"))

      await waitFor(() => screen.getByText("Create New Organization"))
      fireEvent.click(screen.getByText("Create New Organization"))

      await waitFor(() => screen.getByTestId("simulate-org-created"))
      mockOrganization = { id: "org_new", name: "New Org" }
      setClerkOrganization(mockOrganization)
      fireEvent.click(screen.getByTestId("simulate-org-created"))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })
    })

    it("does not submit when org gate is dismissed", async () => {
      renderEditor()
      fireEvent.click(screen.getByText("Create Event"))

      await waitFor(() => screen.getByText("Organization Required"))

      expect(mockOnSubmit).not.toHaveBeenCalled()
    })
  })

  describe("sign in gate", () => {
    beforeEach(() => {
      mockIsSignedIn = false
      setClerkIsSignedIn(false)
    })

    it("shows sign in dialog when not signed in", async () => {
      renderEditor()
      fireEvent.click(screen.getByText("Create Event"))

      await waitFor(() => {
        expect(screen.getByTestId("sign-in-dialog")).toBeDefined()
      })
    })
  })

  it("shows error when name is empty", async () => {
    renderEditor({ initialState: { ...defaultState, name: "" } })

    const button = screen.getByText("Create Event")
    expect(button.hasAttribute("disabled")).toBe(true)
  })

  it("submits the cleared banner state after removing an imported image", async () => {
    renderEditor({
      initialState: {
        ...defaultState,
        imageUrl: "https://example.com/banner.png",
      },
    })

    fireEvent.click(screen.getByText("Clear Banner"))
    fireEvent.click(screen.getByText("Create Event"))

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          imageUrl: null,
        })
      )
    })
  })

  it("shows a truncated source URL and copies the full URL", async () => {
    renderEditor({
      sourceUrl: "https://www.eventbrite.com/e/devops-for-genai-hackathon-ottawa-2026-tickets-1984872192158?aff=ebdssbdestsearch",
    })

    expect(
      screen.getByText("www.eventbrite.com/e/devops-for-genai-hackathon-ottawa-2026-tickets-1984872192158?aff=ebdssbdestsearch")
    ).toBeDefined()

    fireEvent.click(screen.getByRole("button", { name: "Copy source URL" }))

    await waitFor(() => {
      expect(mockClipboardWriteText).toHaveBeenCalledWith(
        "https://www.eventbrite.com/e/devops-for-genai-hackathon-ottawa-2026-tickets-1984872192158?aff=ebdssbdestsearch"
      )
      expect(screen.getByRole("button", { name: "Source URL copied" })).toBeDefined()
    })
  })
})
