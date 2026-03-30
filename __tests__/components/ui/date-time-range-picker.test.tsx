import { describe, expect, it, afterEach } from "bun:test"
import { render, screen, cleanup, fireEvent } from "@testing-library/react"
import {
  DateTimeRangePicker,
  type DateTimeRange,
} from "@/components/ui/date-time-range-picker"

describe("DateTimeRangePicker", () => {
  afterEach(cleanup)

  it("renders placeholder when no value", () => {
    render(<DateTimeRangePicker placeholder="Pick dates" />)
    expect(screen.getByText("Pick dates")).toBeTruthy()
  })

  it("renders formatted range when value is set", () => {
    const value: DateTimeRange = {
      from: new Date(2026, 2, 23, 12, 0),
      to: new Date(2026, 2, 24, 12, 0),
    }
    render(<DateTimeRangePicker value={value} />)
    expect(screen.getByText(/Mar 23 at 12:00 PM — Mar 24 at 12:00 PM/)).toBeTruthy()
  })

  it("renders only from date when to is null", () => {
    const value: DateTimeRange = {
      from: new Date(2026, 2, 23, 9, 0),
      to: null,
    }
    render(<DateTimeRangePicker value={value} />)
    expect(screen.getByText(/Mar 23 at 9:00 AM/)).toBeTruthy()
  })

  it("disables the trigger button when disabled", () => {
    render(<DateTimeRangePicker disabled />)
    const button = screen.getByRole("button")
    expect(button.hasAttribute("disabled")).toBe(true)
  })

  it("opens popover with two time rows on trigger click", () => {
    const value: DateTimeRange = {
      from: new Date(2026, 2, 23, 12, 0),
      to: new Date(2026, 2, 24, 14, 30),
    }
    render(
      <DateTimeRangePicker
        value={value}
        fromLabel="Opens"
        toLabel="Closes"
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: /Mar 23/ }))
    expect(screen.getByText("Opens:")).toBeTruthy()
    expect(screen.getByText("Closes:")).toBeTruthy()
    expect(screen.getByText("Done")).toBeTruthy()
  })

  it("shows Done button disabled when range is incomplete", () => {
    render(<DateTimeRangePicker />)
    fireEvent.click(screen.getByRole("button"))
    const doneButton = screen.getByText("Done")
    expect(doneButton.hasAttribute("disabled")).toBe(true)
  })

  it("shows Clear button when value exists", () => {
    const value: DateTimeRange = {
      from: new Date(2026, 2, 23, 12, 0),
      to: new Date(2026, 2, 24, 12, 0),
    }
    render(<DateTimeRangePicker value={value} />)
    fireEvent.click(screen.getByRole("button", { name: /Mar 23/ }))
    expect(screen.getByText("Clear")).toBeTruthy()
  })

  it("calls onChange with nulls when Clear is clicked", () => {
    let result: DateTimeRange | undefined
    const value: DateTimeRange = {
      from: new Date(2026, 2, 23, 12, 0),
      to: new Date(2026, 2, 24, 12, 0),
    }
    render(
      <DateTimeRangePicker
        value={value}
        onChange={(r) => (result = r)}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: /Mar 23/ }))
    fireEvent.click(screen.getByText("Clear"))
    expect(result).toEqual({ from: null, to: null })
  })

  it("does not call onChange when popover is dismissed", () => {
    let called = false
    const value: DateTimeRange = {
      from: new Date(2026, 2, 23, 12, 0),
      to: new Date(2026, 2, 24, 12, 0),
    }
    render(
      <DateTimeRangePicker
        value={value}
        onChange={() => (called = true)}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: /Mar 23/ }))
    expect(screen.getByText("Done")).toBeTruthy()
    expect(called).toBe(false)
  })

  it("initializes time fields from value", () => {
    const value: DateTimeRange = {
      from: new Date(2026, 2, 23, 14, 30),
      to: new Date(2026, 2, 24, 9, 15),
    }
    render(
      <DateTimeRangePicker
        value={value}
        fromLabel="Start"
        toLabel="End"
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: /Mar 23/ }))
    const startHours = screen.getByLabelText("Start hours") as HTMLInputElement
    const startMinutes = screen.getByLabelText(
      "Start minutes",
    ) as HTMLInputElement
    const endHours = screen.getByLabelText("End hours") as HTMLInputElement
    const endMinutes = screen.getByLabelText("End minutes") as HTMLInputElement
    expect(startHours.value).toBe("02")
    expect(startMinutes.value).toBe("30")
    expect(endHours.value).toBe("09")
    expect(endMinutes.value).toBe("15")
  })

  it("uses default time labels", () => {
    render(<DateTimeRangePicker />)
    fireEvent.click(screen.getByRole("button"))
    expect(screen.getByText("Start:")).toBeTruthy()
    expect(screen.getByText("End:")).toBeTruthy()
  })

  it("uses custom time labels", () => {
    render(
      <DateTimeRangePicker fromLabel="Opens" toLabel="Closes" />,
    )
    fireEvent.click(screen.getByRole("button"))
    expect(screen.getByText("Opens:")).toBeTruthy()
    expect(screen.getByText("Closes:")).toBeTruthy()
  })

  describe("time validation", () => {
    it("clamps hours above 12", () => {
      const value: DateTimeRange = {
        from: new Date(2026, 2, 23, 12, 0),
        to: new Date(2026, 2, 24, 12, 0),
      }
      render(<DateTimeRangePicker value={value} fromLabel="Start" />)
      fireEvent.click(screen.getByRole("button", { name: /Mar 23/ }))
      const startHours = screen.getByLabelText(
        "Start hours",
      ) as HTMLInputElement
      fireEvent.change(startHours, { target: { value: "15" } })
      expect(startHours.value).toBe("12")
    })

    it("clamps minutes above 59", () => {
      const value: DateTimeRange = {
        from: new Date(2026, 2, 23, 12, 0),
        to: new Date(2026, 2, 24, 12, 0),
      }
      render(<DateTimeRangePicker value={value} toLabel="End" />)
      fireEvent.click(screen.getByRole("button", { name: /Mar 23/ }))
      const endMinutes = screen.getByLabelText(
        "End minutes",
      ) as HTMLInputElement
      fireEvent.change(endMinutes, { target: { value: "75" } })
      expect(endMinutes.value).toBe("59")
    })
  })

  describe("AM/PM toggle", () => {
    it("toggles from period on click", () => {
      const value: DateTimeRange = {
        from: new Date(2026, 2, 23, 14, 0),
        to: new Date(2026, 2, 24, 14, 0),
      }
      render(<DateTimeRangePicker value={value} fromLabel="Start" />)
      fireEvent.click(screen.getByRole("button", { name: /Mar 23/ }))
      const pmButtons = screen.getAllByText("PM")
      fireEvent.click(pmButtons[0])
      expect(screen.getByText("AM")).toBeTruthy()
    })
  })
})
