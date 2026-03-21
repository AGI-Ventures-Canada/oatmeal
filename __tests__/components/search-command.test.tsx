import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test"
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react"

const mockPush = mock(() => {})

mock.module("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}))

const { SearchCommand } = await import("@/components/search-command")

beforeEach(() => {
  mockPush.mockClear()
})

afterEach(() => {
  cleanup()
})

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
  })

  describe("content", () => {
    it("renders search input", async () => {
      openMenu()
      await waitFor(() =>
        expect(screen.getByPlaceholderText("Search pages and actions...")).toBeDefined()
      )
    })

    it("renders Navigation group items", async () => {
      openMenu()
      await waitFor(() => {
        expect(screen.getByText("Dashboard")).toBeDefined()
        expect(screen.getByText("Browse Hackathons")).toBeDefined()
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
        expect(screen.getByText("API Keys")).toBeDefined()
        expect(screen.getByText("Webhooks")).toBeDefined()
        expect(screen.getByText("Integrations")).toBeDefined()
        expect(screen.getByText("API Docs")).toBeDefined()
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

    it("navigates to /browse when Browse Hackathons is selected", async () => {
      openMenu()
      await waitFor(() => screen.getByText("Browse Hackathons"))
      fireEvent.click(screen.getByText("Browse Hackathons"))
      expect(mockPush).toHaveBeenCalledWith("/browse")
    })

    it("navigates to /home when Create Hackathon is selected", async () => {
      openMenu()
      await waitFor(() => screen.getByText("Create Hackathon"))
      fireEvent.click(screen.getByText("Create Hackathon"))
      expect(mockPush).toHaveBeenCalledWith("/home")
    })

    it("navigates to /home?tab=judging when Judging is selected", async () => {
      openMenu()
      await waitFor(() => screen.getByText("Judging"))
      fireEvent.click(screen.getByText("Judging"))
      expect(mockPush).toHaveBeenCalledWith("/home?tab=judging")
    })

    it("navigates to /settings/api-keys when API Keys is selected", async () => {
      openMenu()
      await waitFor(() => screen.getByText("API Keys"))
      fireEvent.click(screen.getByText("API Keys"))
      expect(mockPush).toHaveBeenCalledWith("/settings/api-keys")
    })

    it("closes the dialog after navigation", async () => {
      openMenu()
      await waitFor(() => screen.getByText("Dashboard"))
      fireEvent.click(screen.getByText("Dashboard"))
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    })
  })
})
