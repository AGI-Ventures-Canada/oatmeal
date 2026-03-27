import { describe, expect, it, afterEach } from "bun:test"
import { render, screen, cleanup, fireEvent } from "@testing-library/react"
import { DateTimePicker } from "@/components/ui/date-time-picker"

describe("DateTimePicker", () => {
  afterEach(cleanup)

  it("renders placeholder when no value", () => {
    render(<DateTimePicker placeholder="Pick a date" />)
    expect(screen.getByText("Pick a date")).toBeTruthy()
  })

  it("renders formatted date when value is set", () => {
    const date = new Date(2026, 2, 26, 14, 30)
    render(<DateTimePicker value={date} />)
    expect(screen.getByText(/March 26th, 2026 at 2:30 PM/)).toBeTruthy()
  })

  it("renders hidden input with ISO value when name is provided", () => {
    const date = new Date(2026, 2, 26, 14, 30)
    const { container } = render(
      <DateTimePicker value={date} name="test-date" />,
    )
    const hidden = container.querySelector(
      'input[type="hidden"]',
    ) as HTMLInputElement
    expect(hidden).toBeTruthy()
    expect(hidden.value).toBe(date.toISOString())
  })

  it("does not render hidden input when name is not provided", () => {
    const { container } = render(<DateTimePicker value={new Date()} />)
    expect(container.querySelector('input[type="hidden"]')).toBeNull()
  })

  it("disables the trigger button when disabled", () => {
    render(<DateTimePicker disabled />)
    const button = screen.getByRole("button")
    expect(button.hasAttribute("disabled")).toBe(true)
  })

  it("opens popover on trigger click", () => {
    render(<DateTimePicker />)
    fireEvent.click(screen.getByRole("button"))
    expect(screen.getByText("Time:")).toBeTruthy()
    expect(screen.getByText("Done")).toBeTruthy()
  })

  it("shows Done button disabled when no date is selected", () => {
    render(<DateTimePicker />)
    fireEvent.click(screen.getByRole("button"))
    const doneButton = screen.getByText("Done")
    expect(doneButton.hasAttribute("disabled")).toBe(true)
  })

  it("shows Clear button when value exists", () => {
    const date = new Date(2026, 2, 26, 14, 30)
    render(<DateTimePicker value={date} />)
    fireEvent.click(screen.getByRole("button", { name: /March/ }))
    expect(screen.getByText("Clear")).toBeTruthy()
  })

  it("does not show Clear button when no value and no pending date", () => {
    render(<DateTimePicker />)
    fireEvent.click(screen.getByRole("button"))
    expect(screen.queryByText("Clear")).toBeNull()
  })

  it("calls onChange with null when Clear is clicked", () => {
    let result: Date | null | undefined = undefined
    const date = new Date(2026, 2, 26, 14, 30)
    render(
      <DateTimePicker value={date} onChange={(d) => (result = d)} />,
    )
    fireEvent.click(screen.getByRole("button", { name: /March/ }))
    fireEvent.click(screen.getByText("Clear"))
    expect(result).toBeNull()
  })

  it("does not call onChange when popover is dismissed without confirming", () => {
    let called = false
    const date = new Date(2026, 2, 26, 14, 30)
    render(
      <DateTimePicker value={date} onChange={() => (called = true)} />,
    )
    fireEvent.click(screen.getByRole("button", { name: /March/ }))
    expect(screen.getByText("Time:")).toBeTruthy()
    expect(called).toBe(false)
  })

  it("initializes time fields from value", () => {
    const date = new Date(2026, 2, 26, 14, 30)
    render(<DateTimePicker value={date} />)
    fireEvent.click(screen.getByRole("button", { name: /March/ }))
    const hoursInput = screen.getByLabelText("Hours") as HTMLInputElement
    const minutesInput = screen.getByLabelText("Minutes") as HTMLInputElement
    expect(hoursInput.value).toBe("02")
    expect(minutesInput.value).toBe("30")
    expect(screen.getByText("PM")).toBeTruthy()
  })

  it("initializes time to 12:00 PM when no value", () => {
    render(<DateTimePicker />)
    fireEvent.click(screen.getByRole("button"))
    const hoursInput = screen.getByLabelText("Hours") as HTMLInputElement
    const minutesInput = screen.getByLabelText("Minutes") as HTMLInputElement
    expect(hoursInput.value).toBe("12")
    expect(minutesInput.value).toBe("00")
    expect(screen.getByText("PM")).toBeTruthy()
  })

  describe("to12Hour", () => {
    it("handles midnight (0 hours) as 12 AM", () => {
      const date = new Date(2026, 2, 26, 0, 0)
      render(<DateTimePicker value={date} />)
      fireEvent.click(screen.getByRole("button", { name: /March/ }))
      const hoursInput = screen.getByLabelText("Hours") as HTMLInputElement
      expect(hoursInput.value).toBe("12")
      expect(screen.getByText("AM")).toBeTruthy()
    })

    it("handles noon (12 hours) as 12 PM", () => {
      const date = new Date(2026, 2, 26, 12, 0)
      render(<DateTimePicker value={date} />)
      fireEvent.click(screen.getByRole("button", { name: /March/ }))
      const hoursInput = screen.getByLabelText("Hours") as HTMLInputElement
      expect(hoursInput.value).toBe("12")
      expect(screen.getByText("PM")).toBeTruthy()
    })

    it("handles 1 AM correctly", () => {
      const date = new Date(2026, 2, 26, 1, 0)
      render(<DateTimePicker value={date} />)
      fireEvent.click(screen.getByRole("button", { name: /March/ }))
      const hoursInput = screen.getByLabelText("Hours") as HTMLInputElement
      expect(hoursInput.value).toBe("01")
      expect(screen.getByText("AM")).toBeTruthy()
    })

    it("handles 11 PM correctly", () => {
      const date = new Date(2026, 2, 26, 23, 0)
      render(<DateTimePicker value={date} />)
      fireEvent.click(screen.getByRole("button", { name: /March/ }))
      const hoursInput = screen.getByLabelText("Hours") as HTMLInputElement
      expect(hoursInput.value).toBe("11")
      expect(screen.getByText("PM")).toBeTruthy()
    })
  })

  describe("time validation", () => {
    it("clamps hours above 12", () => {
      render(<DateTimePicker value={new Date(2026, 2, 26, 14, 0)} />)
      fireEvent.click(screen.getByRole("button", { name: /March/ }))
      const hoursInput = screen.getByLabelText("Hours") as HTMLInputElement
      fireEvent.change(hoursInput, { target: { value: "15" } })
      expect(hoursInput.value).toBe("12")
    })

    it("clamps minutes above 59", () => {
      render(<DateTimePicker value={new Date(2026, 2, 26, 14, 0)} />)
      fireEvent.click(screen.getByRole("button", { name: /March/ }))
      const minutesInput = screen.getByLabelText("Minutes") as HTMLInputElement
      fireEvent.change(minutesInput, { target: { value: "75" } })
      expect(minutesInput.value).toBe("59")
    })

    it("strips non-numeric characters", () => {
      render(<DateTimePicker value={new Date(2026, 2, 26, 14, 0)} />)
      fireEvent.click(screen.getByRole("button", { name: /March/ }))
      const hoursInput = screen.getByLabelText("Hours") as HTMLInputElement
      fireEvent.change(hoursInput, { target: { value: "a5b" } })
      expect(hoursInput.value).toBe("5")
      fireEvent.blur(hoursInput)
      expect(hoursInput.value).toBe("05")
    })
  })

  describe("AM/PM toggle", () => {
    it("toggles period on button click", () => {
      const date = new Date(2026, 2, 26, 14, 30)
      render(<DateTimePicker value={date} />)
      fireEvent.click(screen.getByRole("button", { name: /March/ }))
      const periodButton = screen.getByText("PM")
      expect(periodButton).toBeTruthy()
      fireEvent.click(periodButton)
      expect(screen.getByText("AM")).toBeTruthy()
    })
  })

  describe("buildDate helper", () => {
    it("produces correct date when confirming with Done", () => {
      let result: Date | null | undefined = undefined
      const date = new Date(2026, 2, 26, 14, 30)
      render(
        <DateTimePicker value={date} onChange={(d) => (result = d)} />,
      )
      fireEvent.click(screen.getByRole("button", { name: /March/ }))
      fireEvent.click(screen.getByText("Done"))
      expect(result).not.toBeNull()
      expect(result!.getHours()).toBe(14)
      expect(result!.getMinutes()).toBe(30)
    })
  })
})
