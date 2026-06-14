export function parseQbittorrentBoolean(
  value: FormDataEntryValue | null
): boolean {
  if (value === null) {
    return false
  }

  const normalized = String(value).trim().toLowerCase()
  return normalized === "true" || normalized === "1" || normalized === "yes"
}
