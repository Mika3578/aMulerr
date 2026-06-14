export const INTERNAL_ED2K_HASH_LENGTH = 32
export const EXTERNAL_QBITTORRENT_HASH_LENGTH = 40
export const EXTERNAL_HASH_PADDING = "00000000"

const INTERNAL_HASH_RE = /^[0-9A-F]{32}$/
const EXTERNAL_HASH_RE = /^[0-9A-F]{40}$/

export type ParsedQbittorrentHashSelection =
  | { kind: "none" }
  | { kind: "all" }
  | { kind: "hashes"; hashes: string[] }

export function normalizeInternalEd2kHash(value: string): string | null {
  const hash = value.trim().toUpperCase()
  return INTERNAL_HASH_RE.test(hash) ? hash : null
}

export function internalToExternalQbittorrentHash(
  value: string
): string | null {
  const internal = normalizeInternalEd2kHash(value)
  if (!internal) {
    return null
  }

  return `${internal}${EXTERNAL_HASH_PADDING}`.toLowerCase()
}

export function externalToInternalEd2kHash(value: string): string | null {
  const hash = value.trim().toUpperCase()

  if (INTERNAL_HASH_RE.test(hash)) {
    return hash
  }

  if (EXTERNAL_HASH_RE.test(hash) && hash.endsWith(EXTERNAL_HASH_PADDING)) {
    return hash.slice(0, INTERNAL_ED2K_HASH_LENGTH)
  }

  return null
}

export function parseQbittorrentHashSelection(
  value: string | null | undefined
): ParsedQbittorrentHashSelection {
  if (typeof value !== "string") {
    return { kind: "none" }
  }

  const raw = value.trim()
  if (!raw) {
    return { kind: "none" }
  }

  if (raw.toLowerCase() === "all") {
    return { kind: "all" }
  }

  const hashes = [
    ...new Set(
      raw
        .split("|")
        .map((part) => part.trim())
        .filter(Boolean)
        .map(externalToInternalEd2kHash)
        .filter((hash): hash is string => hash !== null)
    ),
  ]

  if (!hashes.length) {
    return { kind: "none" }
  }

  return { kind: "hashes", hashes }
}

export function parseTorrentHashesFromFormData(
  formData: FormData
): ParsedQbittorrentHashSelection {
  return parseQbittorrentHashSelection(formData.get("hashes")?.toString())
}
