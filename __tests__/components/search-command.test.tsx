import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test"
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react"

const mockPush = mock(() => {})
let mockOrganization: { id: string; name: string } | null = null
let mockFetchResponse: object = { hackathons: [] }

mock.module("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}))

mock.module("@clerk/nextjs", () => ({
  useOrganization: () => ({ organization: mockOrganization }),
}))

mock.module("@/components/hackathon/create-hackathon-dialog", () => ({
  CreateHackathonDialog: ({ open }: { open: boolean; onOpenChange: (v: boolean) => void }) =>
    open ? <div data-testid="create-hackathon-dialog" /> : null,
}))

mock.module("@/components/org-gate-dialog", () => ({
  OrgGateDialog: ({ open }: { open: boolean; onOpenChange: (v: boolean) => void; onOrgSelected: () => void }) =>
    open ? <div data-testid="org-gate-dialog" /> : null,
}))

const globalFetch = globalThis.fetch
beforeEach(() => {
  mockPush.mockClear()
  mockOrganization = null
  mockFetchResponse = { hackathons: [] }
  globalThis.fetch = mock(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(mockFetchResponse) } as Response)
  )
})

afterEach(() => {
  cleanup()
  globalThis.fetch = globalFetch
})

const { SearchCommand } = await import("@/components/search-command")

function openMenu() {
  render(<SearchCommand />)
  fireEvent.keyDown(document, { key: "k", metaKey: true })
}

describe("SearchCommand", () => {
  describe("keyboard trigger", () => {
    it("opens on Cmd+K", async () => {
      render(<SearchCommand />)
      expect(screen.queryByRole("dialog")).toBeNull()
      fireEvent.keyDown(document, { key: "k", metaKey: true })
      await waitFor(() => expect(screen.getByRole("dialog")).toBeDefined())
    })

    it("opens on Ctrl+K", async () => {
      render(<SearchCommand />)
      fireEvent.keyDown(document, { key: "k", ctrlKey: true })
      await waitFor(() => expect(screen.getByRole("dialog")).toBeDefined())
    })

    it("toggles closed on second Cmd+K", async () => {
      render(<SearchCommand />)
      fireEvent.keyDown(document, { key: "k", metaKey: true })
      await waitFor(() => expect(screen.getByRole("dialog")).toBeDefined())
      fireEvent.keyDown(document, { key: "k", metaKey: true })
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    })

    it("does not open on K without modifier", () => {
      render(<SearchCommand />)
      fireEvent.keyDown(document, { key: "k" })
      expect(screen.queryByRole("dialog")).toBeNull()
    })

    it("opens when open-search custom event is dispatched", async () => {
      render(<SearchCommand />)
      document.dispatchEvent(new CustomEvent("open-search"))
      await waitFor(() => expect(screen.getByRole("dialog")).toBeDefined())
    })
  })

  describe("content", () => {
    it("renders search input", async () => {
      openMenu()
      await waitFor(() =>
        expect(screen.getByPlaceholderText("Search pages, events, and docs...")).toBeDefined()
      )
    })

    it("renders Navigation group items", async () => {
      openMenu()
      await waitFor(() => {
        expect(screen.getByText("Dashboard")).toBeDefined()
        expect(screen.getByText("Explore Hackathons")).toBeDefined()
      })
    })

    it("renders Hackathons group items", async () => {
      openMenu()
      await waitFor(() => {
        expect(screen.getByText("Create Hackathon")).toBeDefined()
        expect(screen.getByText("Participating")).toBeDefined()
        expect(screen.getByText("Judging")).toBeDefined()
        expect(screen.getByText("Organizing")).toBeDefined()
        expect(screen.getByText("Sponsoring")).toBeDefined()
      })
    })

    it("renders Settings group items", async () => {
      openMenu()
      await waitFor(() => {
        expect(screen.getAllByText("Settings").length).toBeGreaterThan(0)
        expect(screen.getAllByText("API Keys").length).toBeGreaterThan(0)
        expect(screen.getByText("Webhooks")).toBeDefined()
        expect(screen.getByText("Integrations")).toBeDefined()
        expect(screen.getByText("API Docs")).toBeDefined()
      })
    })

    it("renders Docs group with default items", async () => {
      openMenu()
      await waitFor(() => {
        expect(screen.getByText("Getting Started")).toBeDefined()
        expect(screen.getByText("Authentication")).toBeDefined()
        expect(screen.getByText("Hackathons API")).toBeDefined()
      })
    })
  })

  describe("search hierarchy", () => {
    it("shows Events group when events match the query", async () => {
      mockFetchResponse = {
        hackathons: [
          { id: "h1", name: "Spring Hackathon 2026" },
          { id: "h2", name: "Summer Hackathon 2026" },
          { id: "h3", name: "AI Summit" },
        ],
      }
      openMenu()
      await waitFor(() => screen.getByRole("dialog"))
      fireEvent.change(screen.getByPlaceholderText("Search pages, events, and docs..."), {
        target: { value: "hackathon" },
      })
      await waitFor(() => {
        expect(screen.getByText("Spring Hackathon 2026")).toBeDefined()
        expect(screen.getByText("Summer Hackathon 2026")).toBeDefined()
        expect(screen.queryByText("AI Summit")).toBeNull()
      })
    })

    it("limits events to top 2 matches", async () => {
      mockFetchResponse = {
        hackathons: [
          { id: "h1", name: "Hackathon Alpha" },
          { id: "h2", name: "Hackathon Beta" },
          { id: "h3", name: "Hackathon Gamma" },
        ],
      }
      openMenu()
      await waitFor(() => screen.getByRole("dialog"))
      fireEvent.change(screen.getByPlaceholderText("Search pages, events, and docs..."), {
        target: { value: "hackathon" },
      })
      await waitFor(() => {
        const items = screen.getAllByText(/Hackathon (Alpha|Beta|Gamma)/)
        expect(items.length).toBe(2)
      })
    })

    it("shows Pages group with top 1 functionality match", async () => {
      openMenu()
      await waitFor(() => screen.getByRole("dialog"))
      fireEvent.change(screen.getByPlaceholderText("Search pages, events, and docs..."), {
        target: { value: "webhook" },
      })
      await waitFor(() => {
        expect(screen.getByText("Pages")).toBeDefined()
        expect(screen.getAllByText("Webhooks").length).toBe(1)
      })
    })

    it("shows Docs group with top 2 docs matches when typing", async () => {
      openMenu()
      await waitFor(() => screen.getByRole("dialog"))
      fireEvent.change(screen.getByPlaceholderText("Search pages, events, and docs..."), {
        target: { value: "judging" },
      })
      await waitFor(() => {
        expect(screen.getByText("Docs")).toBeDefined()
        expect(screen.getByText("Judging Modes")).toBeDefined()
        expect(screen.getByText("Managing Judges & Scoring")).toBeDefined()
        expect(screen.queryByText("Judging API")).toBeNull()
      })
    })

    it("hides search hierarchy sections and shows static groups when query is cleared", async () => {
      openMenu()
      await waitFor(() => screen.getByRole("dialog"))
      const input = screen.getByPlaceholderText("Search pages, events, and docs...")
      fireEvent.change(input, { target: { value: "settings" } })
      await waitFor(() => screen.getByText("Pages"))
      fireEvent.change(input, { target: { value: "" } })
      await waitFor(() => {
        expect(screen.getByText("Navigation")).toBeDefined()
        expect(screen.getByText("Hackathons")).toBeDefined()
      })
    })
  })

  describe("navigation", () => {
    it("navigates to /home when Dashboard is selected", async () => {
      openMenu()
      await waitFor(() => screen.getByText("Dashboard"))
      fireEvent.click(screen.getByText("Dashboard"))
      expect(mockPush).toHaveBeenCalledWith("/home")
    })

    it("navigates to /browse when Explore Hackathons is selected", async () => {
      openMenu()
      await waitFor(() => screen.getByText("Explore Hackathons"))
      fireEvent.click(screen.getByText("Explore Hackathons"))
      expect(mockPush).toHaveBeenCalledWith("/browse")
    })

    it("navigates to /home?tab=judging when Judging is selected", async () => {
      openMenu()
      await waitFor(() => screen.getByText("Judging"))
      fireEvent.click(screen.getByText("Judging"))
      expect(mockPush).toHaveBeenCalledWith("/home?tab=judging")
    })

    it("navigates to /settings/api-keys when API Keys is selected", async () => {
      openMenu()
      await waitFor(() => screen.getAllByText("API Keys")[0])
      fireEvent.click(screen.getAllByText("API Keys")[0])
      expect(mockPush).toHaveBeenCalledWith("/settings/api-keys")
    })

    it("navigates to event page when an event result is selected", async () => {
      mockFetchResponse = { hackathons: [{ id: "h1", name: "My Hackathon" }] }
      openMenu()
      await waitFor(() => screen.getByRole("dialog"))
      fireEvent.change(screen.getByPlaceholderText("Search pages, events, and docs..."), {
        target: { value: "my hackathon" },
      })
      await waitFor(() => screen.getByText("My Hackathon"))
      fireEvent.click(screen.getByText("My Hackathon"))
      expect(mockPush).toHaveBeenCalledWith("/hackathons/h1")
    })

    it("navigates to a docs page when a docs result is selected", async () => {
      openMenu()
      await waitFor(() => screen.getByRole("dialog"))
      fireEvent.change(screen.getByPlaceholderText("Search pages, events, and docs..."), {
        target: { value: "getting started" },
      })
      await waitFor(() => screen.getByText("Getting Started"))
      fireEvent.click(screen.getByText("Getting Started"))
      expect(mockPush).toHaveBeenCalledWith("/docs/getting-started")
    })

    it("closes the dialog after navigation", async () => {
      openMenu()
      await waitFor(() => screen.getByText("Dashboard"))
      fireEvent.click(screen.getByText("Dashboard"))
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    })
  })

  describe("Create Hackathon", () => {
    it("opens CreateHackathonDialog when org is active", async () => {
      mockOrganization = { id: "org_1", name: "Test Org" }
      openMenu()
      await waitFor(() => screen.getByText("Create Hackathon"))
      fireEvent.click(screen.getByText("Create Hackathon"))
      await waitFor(() =>
        expect(screen.getByTestId("create-hackathon-dialog")).toBeDefined()
      )
      expect(mockPush).not.toHaveBeenCalled()
    })

    it("opens OrgGateDialog when no org is active", async () => {
      mockOrganization = null
      openMenu()
      await waitFor(() => screen.getByText("Create Hackathon"))
      fireEvent.click(screen.getByText("Create Hackathon"))
      await waitFor(() =>
        expect(screen.getByTestId("org-gate-dialog")).toBeDefined()
      )
      expect(mockPush).not.toHaveBeenCalled()
    })

    it("closes the search menu when Create Hackathon is selected", async () => {
      mockOrganization = { id: "org_1", name: "Test Org" }
      openMenu()
      await waitFor(() => screen.getByText("Create Hackathon"))
      fireEvent.click(screen.getByText("Create Hackathon"))
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    })
  })
})
