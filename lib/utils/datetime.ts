export function toLocalDatetime(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  const h = String(date.getHours()).padStart(2, "0")
  const min = String(date.getMinutes()).padStart(2, "0")
  return `${y}-${m}-${d}T${h}:${min}`
}

export function timeAgo(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now()
  if (diff > 0) {
    const hours = Math.floor(diff / 3_600_000)
    if (hours >= 24) return `in ${Math.floor(hours / 24)}d`
    if (hours >= 1) return `in ${hours}h`
    return `in ${Math.floor(diff / 60_000)}m`
  }
  const ms = -diff
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
