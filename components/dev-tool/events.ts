export const DEV_STATUS_CHANGED_EVENT = "dev-status-changed"

export type DevStatusDetail = { status?: string }

export function dispatchDevStatusChanged(status?: string) {
  document.dispatchEvent(
    new CustomEvent<DevStatusDetail>(DEV_STATUS_CHANGED_EVENT, {
      detail: { status },
    })
  )
}
