import { afterEach, describe, expect, it } from "bun:test"
import { cleanup, render, screen } from "@testing-library/react"

const { SponsorFulfillmentView } = await import(
  "@/components/hackathon/prizes/sponsor-fulfillment-view"
)

afterEach(() => {
  cleanup()
})

const baseFulfillment = {
  fulfillmentId: "f-1",
  prizeName: "Grand Prize",
  prizeValue: "$1000",
  submissionTitle: "Cool Project",
  teamName: "Team Alpha",
  trackingNumber: null,
  claimedAt: null,
  paymentMethod: null,
  paymentDetail: null,
}

describe("SponsorFulfillmentView", () => {
  it("renders empty state when no fulfillments", () => {
    render(
      <SponsorFulfillmentView hackathonId="h1" fulfillments={[]} />
    )
    expect(screen.getByText("No prize assignments for your sponsored tracks yet.")).toBeTruthy()
  })

  it("renders fulfillment table with prize data", () => {
    render(
      <SponsorFulfillmentView
        hackathonId="h1"
        fulfillments={[
          {
            ...baseFulfillment,
            status: "assigned",
            recipientName: null,
            recipientEmail: null,
            shippingAddress: null,
          },
        ]}
      />
    )
    expect(screen.getByText("Grand Prize")).toBeTruthy()
    expect(screen.getByText("$1000")).toBeTruthy()
    expect(screen.getByText("Awaiting Claim")).toBeTruthy()
  })

  it("shows Mark Fulfilled button only for claimed fulfillments", () => {
    render(
      <SponsorFulfillmentView
        hackathonId="h1"
        fulfillments={[
          {
            ...baseFulfillment,
            status: "claimed",
            recipientName: "Alice",
            recipientEmail: "alice@example.com",
            shippingAddress: "123 Main St",
            claimedAt: "2026-04-01T00:00:00Z",
          },
        ]}
      />
    )
    expect(screen.getByText("Mark Fulfilled")).toBeTruthy()
    expect(screen.getByText("Alice")).toBeTruthy()
  })

  it("does not show Mark Fulfilled button for assigned fulfillments", () => {
    render(
      <SponsorFulfillmentView
        hackathonId="h1"
        fulfillments={[
          {
            ...baseFulfillment,
            status: "assigned",
            recipientName: null,
            recipientEmail: null,
            shippingAddress: null,
          },
        ]}
      />
    )
    expect(screen.queryByText("Mark Fulfilled")).toBeNull()
  })

  it("shows Fulfilled label for shipped fulfillments", () => {
    render(
      <SponsorFulfillmentView
        hackathonId="h1"
        fulfillments={[
          {
            ...baseFulfillment,
            status: "shipped",
            recipientName: "Bob",
            recipientEmail: "bob@example.com",
            shippingAddress: null,
            trackingNumber: "TRACK123",
          },
        ]}
      />
    )
    expect(screen.getAllByText("Fulfilled").length).toBeGreaterThanOrEqual(1)
  })
})
