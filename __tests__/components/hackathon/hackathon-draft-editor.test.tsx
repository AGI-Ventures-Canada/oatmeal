import { describe, it, expect, mock, afterEach, beforeEach } from "bun:test"
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react"

const storage = new Map<string, string>()
globalThis.localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
  get length() { return storage.size },
  key: () => null,
} as Storage

const mockPush = mock(() => {})
const mockSetActive = mock(() => Promise.resolve())
let mockIsSignedIn = true
let mockOrganization: { id: string; name: string } | null = { id: "org_1", name: "Test Org" }
let mockMemberships: Array<{
  organization: { id: string; name: string; imageUrl: string | null }
}> = []

mock.module("@clerk/nextjs", () => ({
  useAuth: () => ({ isSignedIn: mockIsSignedIn }),
  useOrganization: () => ({ organization: mockOrganization }),
  useOrganizationList: () => ({
    userMemberships: { data: mockMemberships },
    setActive: mockSetActive,
  }),
}))

mock.module("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mock(() => {}), replace: mock(() => {}), prefetch: mock(() => {}) }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/luma.com/test",
}))

mock.module("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { src, alt, width, height, ...rest } = props
    return <img src={src as string} alt={alt as string} width={width as number} height={height as number} {...rest} />
  },
}))

mock.module("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode; className?: string }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}))

mock.module("@/components/hackathon/preview/hackathon-preview-client", () => ({
  HackathonPreviewClient: () => <div data-testid="preview">Preview</div>,
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
  mockIsSignedIn = true
  mockOrganization = { id: "org_1", name: "Test Org" }
  mockMemberships = []
  mockSetActive.mockClear()
  mockPush.mockClear()
  storage.clear()
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
    expect(screen.getByText("Create Hackathon")).toBeDefined()
  })

  it("submits when org is active", async () => {
    renderEditor()
    fireEvent.click(screen.getByText("Create Hackathon"))

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith("/e/test-hackathon/manage")
    })
  })

  describe("org gate", () => {
    beforeEach(() => {
      mockOrganization = null
      mockMemberships = [
        { organization: { id: "org_1", name: "Alpha Org", imageUrl: null } },
        { organization: { id: "org_2", name: "Beta Org", imageUrl: "https://example.com/beta.png" } },
      ]
    })

    it("shows org gate dialog when submitting without org", async () => {
      renderEditor()
      fireEvent.click(screen.getByText("Create Hackathon"))

      await waitFor(() => {
        expect(screen.getByText("Organization Required")).toBeDefined()
      })
    })

    it("lists existing organizations", async () => {
      renderEditor()
      fireEvent.click(screen.getByText("Create Hackathon"))

      await waitFor(() => {
        expect(screen.getByText("Alpha Org")).toBeDefined()
        expect(screen.getByText("Beta Org")).toBeDefined()
      })
    })

    it("auto-submits after selecting an organization", async () => {
      mockSetActive.mockImplementation(async () => {
        mockOrganization = { id: "org_1", name: "Alpha Org" }
      })
      renderEditor()
      fireEvent.click(screen.getByText("Create Hackathon"))

      await waitFor(() => screen.getByText("Alpha Org"))
      fireEvent.click(screen.getByText("Alpha Org"))

      await waitFor(() => {
        expect(mockSetActive).toHaveBeenCalledWith({ organization: "org_1" })
        expect(mockOnSubmit).toHaveBeenCalled()
      })
    })

    it("auto-submits after creating a new organization", async () => {
      renderEditor()
      fireEvent.click(screen.getByText("Create Hackathon"))

      await waitFor(() => screen.getByText("Create New Organization"))
      fireEvent.click(screen.getByText("Create New Organization"))

      await waitFor(() => screen.getByTestId("simulate-org-created"))
      mockOrganization = { id: "org_new", name: "New Org" }
      fireEvent.click(screen.getByTestId("simulate-org-created"))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })
    })

    it("does not submit when org gate is dismissed", async () => {
      renderEditor()
      fireEvent.click(screen.getByText("Create Hackathon"))

      await waitFor(() => screen.getByText("Organization Required"))

      expect(mockOnSubmit).not.toHaveBeenCalled()
    })
  })

  describe("sign in gate", () => {
    beforeEach(() => {
      mockIsSignedIn = false
    })

    it("shows sign in dialog when not signed in", async () => {
      renderEditor()
      fireEvent.click(screen.getByText("Create Hackathon"))

      await waitFor(() => {
        expect(screen.getByTestId("sign-in-dialog")).toBeDefined()
      })
    })
  })

  it("shows error when name is empty", async () => {
    renderEditor({ initialState: { ...defaultState, name: "" } })

    const button = screen.getByText("Create Hackathon")
    expect(button.hasAttribute("disabled")).toBe(true)
  })
})
