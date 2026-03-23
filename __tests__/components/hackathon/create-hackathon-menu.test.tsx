import { describe, it, expect, mock, afterEach, beforeEach } from "bun:test"
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react"
import {
  resetComponentMocks,
  setRouter,
  setCreateOrganizationDialog,
  useRealCreateHackathonMenu,
} from "../../lib/component-mocks"
import { clerkState, clerkMock } from "../../lib/clerk-mock"

mock.module("@clerk/nextjs", () => clerkMock)

const mockPush = mock(() => {})

mock.module("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { src, alt, width, height, ...rest } = props
    return <img src={src as string} alt={alt as string} width={width as number} height={height as number} {...rest} />
  },
}))

const { CreateHackathonMenu } = await import(
  "../../../components/hackathon/create-hackathon-menu"
)

beforeEach(() => {
  resetComponentMocks()
  useRealCreateHackathonMenu()
  clerkState.organization = null
  clerkState.memberships = []
  clerkState.setActive.mockClear()
  mockPush.mockClear()
  setRouter({ push: mockPush })
  setCreateOrganizationDialog(({ open, onSuccess }) =>
    open ? (
      <div data-testid="create-org-dialog">
        <button type="button" data-testid="simulate-org-created" onClick={() => onSuccess?.()}>
          Simulate Org Created
        </button>
      </div>
    ) : null,
  )
})

afterEach(() => {
  cleanup()
})

describe("CreateHackathonMenu", () => {
  function renderMenu() {
    return render(
      <CreateHackathonMenu trigger={<button data-testid="trigger">Create</button>} />
    )
  }

  describe("when user has an active organization", () => {
    beforeEach(() => {
      clerkState.organization = { id: "org_1", name: "Test Org" }
    })

    it("opens the create hackathon dialog from the trigger", async () => {
      renderMenu()
      fireEvent.click(screen.getByTestId("trigger"))

      await waitFor(() => {
        expect(screen.getByText(/Choose a starting point/i)).toBeDefined()
      })
    })
  })

  describe("when user has no active organization", () => {
    beforeEach(() => {
      clerkState.organization = null
      clerkState.memberships = [
        {
          organization: {
            id: "org_1",
            name: "Alpha Org",
            imageUrl: "https://example.com/alpha.png",
          },
        },
        {
          organization: { id: "org_2", name: "Beta Org", imageUrl: null },
        },
      ]
    })

    it("shows org gate dialog from the trigger", async () => {
      renderMenu()
      fireEvent.click(screen.getByTestId("trigger"))

      await waitFor(() => {
        expect(screen.getByText("Organization Required")).toBeDefined()
      })
    })

    it("lists existing organizations in the org gate", async () => {
      renderMenu()
      fireEvent.click(screen.getByTestId("trigger"))

      await waitFor(() => {
        expect(screen.getByText("Alpha Org")).toBeDefined()
        expect(screen.getByText("Beta Org")).toBeDefined()
      })
    })

    it("renders org image when imageUrl is provided", async () => {
      renderMenu()
      fireEvent.click(screen.getByTestId("trigger"))

      await waitFor(() => {
        const img = screen.getByAltText("Alpha Org")
        expect(img).toBeDefined()
        expect(img.getAttribute("src")).toBe("https://example.com/alpha.png")
      })
    })

    it("renders initial letter when imageUrl is null", async () => {
      renderMenu()
      fireEvent.click(screen.getByTestId("trigger"))

      await waitFor(() => {
        expect(screen.getByText("B")).toBeDefined()
      })
    })

    it("switches org and opens dialog when org selected", async () => {
      renderMenu()
      fireEvent.click(screen.getByTestId("trigger"))

      await waitFor(() => screen.getByText("Alpha Org"))
      fireEvent.click(screen.getByText("Alpha Org"))

      await waitFor(() => {
        expect(clerkState.setActive).toHaveBeenCalledWith({ organization: "org_1" })
        expect(screen.getByText(/Choose a starting point/i)).toBeDefined()
      })
    })

    it("opens create org dialog when 'Create New Organization' is clicked", async () => {
      renderMenu()
      fireEvent.click(screen.getByTestId("trigger"))

      await waitFor(() => screen.getByText("Create New Organization"))
      fireEvent.click(screen.getByText("Create New Organization"))

      await waitFor(() => {
        expect(screen.getByTestId("create-org-dialog")).toBeDefined()
      })
    })

    it("opens the create hackathon dialog after org creation succeeds", async () => {
      renderMenu()
      fireEvent.click(screen.getByTestId("trigger"))

      await waitFor(() => screen.getByText("Create New Organization"))
      fireEvent.click(screen.getByText("Create New Organization"))

      await waitFor(() => screen.getByTestId("simulate-org-created"))
      fireEvent.click(screen.getByTestId("simulate-org-created"))

      await waitFor(() => {
        expect(screen.getByText(/Choose a starting point/i)).toBeDefined()
      })
    })
  })

  describe("when user has no memberships", () => {
    beforeEach(() => {
      clerkState.organization = null
      clerkState.memberships = []
    })

    it("shows only create org button in org gate", async () => {
      renderMenu()
      fireEvent.click(screen.getByTestId("trigger"))

      await waitFor(() => {
        expect(screen.getByText("Organization Required")).toBeDefined()
        expect(screen.getByText("Create New Organization")).toBeDefined()
      })

      expect(screen.queryByText("Alpha Org")).toBeNull()
    })
  })
})
