import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { resetComponentMocks, setRouter } from "../../lib/component-mocks"

const mockRefresh = mock(() => {})
const mockFetch = mock(() =>
  Promise.resolve(
    new Response(JSON.stringify({ url: "https://example.com/banner.png" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  )
)

mock.module("react-easy-crop", () => ({
  default: () => null,
}))

mock.module("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  AlertDialogAction: ({
    children,
    onClick,
  }: {
    children: React.ReactNode
    onClick?: () => void
    variant?: string
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}))

mock.module("@/components/ui/slider", () => ({
  Slider: () => null,
}))

const { BannerUpload } = await import("@/components/hackathon/banner-upload")

beforeEach(() => {
  resetComponentMocks()
  setRouter({ refresh: mockRefresh })
  mockRefresh.mockClear()
  mockFetch.mockClear()
  globalThis.fetch = mockFetch as typeof fetch
})

afterEach(() => {
  cleanup()
})

describe("BannerUpload", () => {
  it("clears the banner locally in draft mode without calling the API", async () => {
    const onUploadComplete = mock(() => {})

    render(
      <BannerUpload
        hackathonId="draft"
        currentBannerUrl="https://example.com/banner.png"
        onUploadComplete={onUploadComplete}
        mode="draft"
      />
    )

    fireEvent.click(screen.getByText("Remove"))

    await waitFor(() => {
      expect(onUploadComplete).toHaveBeenCalledWith(null)
    })

    expect(mockFetch).not.toHaveBeenCalled()
    expect(mockRefresh).not.toHaveBeenCalled()
  })
})
