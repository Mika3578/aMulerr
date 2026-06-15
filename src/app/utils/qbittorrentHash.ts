import base32 from "hi-base32"

export const INTERNAL_ED2K_HASH_LENGTH = 32
export const EXTERNAL_QBITTORRENT_HASH_LENGTH = 40
export const EXTERNAL_HASH_PADDING = "00000000"

const INTERNAL_HASH_RE = /^[0-9A-F]{32}$/
const EXTERNAL_HASH_RE = /^[0-9A-F]{40}$/
const SYNTHETIC_BASE32_BTih_RE = /^[A-Z2-7]{32}$/

export type ParsedQbittorrentHashSelection =
  | { kind: "absent" }
  | { kind: "empty" }
  | { kind: "all" }
  | { kind: "hashes"; hashes: string[] }
  | { kind: "invalid" }

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

function decodeSyntheticBase32BtihToInternal(value: string): string | null {
  const normalized = value.trim().toUpperCase()
  if (!SYNTHETIC_BASE32_BTih_RE.test(normalized)) {
    return null
  }

  try {
    const bytes = Buffer.from(base32.decode.asBytes(normalized))
    if (bytes.length !== 20) {
      return null
    }

    if (!bytes.subarray(16).every((byte) => byte === 0)) {
      return null
    }

    return normalizeInternalEd2kHash(bytes.subarray(0, 16).toString("hex"))
  } catch {
    return null
  }
}

/**
 * Resolve a qBittorrent-compatible hash to the canonical internal eD2K hash.
 *
 * Accepted forms:
 * - 32-character internal eD2K hex (case-insensitive, surrounding whitespace trimmed)
 * - 40-character external hex ending in 00000000
 * - 32-character synthetic base32 BTIH (A-Z2-7, case-insensitive) whose decoded
 *   trailing four bytes are zero (eMulerr synthetic magnets only)
 */
export function compatibilityHashToInternalEd2kHash(
  value: string
): string | null {
  const trimmed = value.trim()
  const upper = trimmed.toUpperCase()

  if (INTERNAL_HASH_RE.test(upper)) {
    return upper
  }

  if (EXTERNAL_HASH_RE.test(upper) && upper.endsWith(EXTERNAL_HASH_PADDING)) {
    return upper.slice(0, INTERNAL_ED2K_HASH_LENGTH)
  }

  return decodeSyntheticBase32BtihToInternal(trimmed)
}

export function externalToInternalEd2kHash(value: string): string | null {
  return compatibilityHashToInternalEd2kHash(value)
}

export function parseQbittorrentHashSelection(
  value: string | null | undefined
): ParsedQbittorrentHashSelection {
  if (value === null || value === undefined) {
    return { kind: "empty" }
  }

  const raw = value.trim()
  if (!raw) {
    return { kind: "empty" }
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
        .map(compatibilityHashToInternalEd2kHash)
        .filter((hash): hash is string => hash !== null)
    ),
  ]

  if (!hashes.length) {
    return { kind: "invalid" }
  }

  return { kind: "hashes", hashes }
}

export function parseQbittorrentHashQuery(
  hashesParamPresent: boolean,
  value: string | null
): ParsedQbittorrentHashSelection {
  if (!hashesParamPresent) {
    return { kind: "absent" }
  }

  return parseQbittorrentHashSelection(value)
}

export function parseTorrentHashesFromFormData(
  formData: FormData
): ParsedQbittorrentHashSelection {
  if (!formData.has("hashes")) {
    return { kind: "absent" }
  }

  const value = formData.get("hashes")
  if (typeof value !== "string") {
    return { kind: "invalid" }
  }

  return parseQbittorrentHashSelection(value)
}

export function selectionFromParsedHashes(
  parsed: ParsedQbittorrentHashSelection
): "all" | string[] | null {
  if (parsed.kind === "all") {
    return "all"
  }

  if (parsed.kind === "hashes") {
    return parsed.hashes
  }

  return null
}

export function hashSelectionMatchesFile(
  selection: ParsedQbittorrentHashSelection,
  fileHash: string
): boolean {
  switch (selection.kind) {
    case "absent":
    case "all":
      return true
    case "empty":
    case "invalid":
      return false
    case "hashes": {
      const wanted = new Set(selection.hashes.map((hash) => hash.toUpperCase()))
      return wanted.has(fileHash.toUpperCase())
    }
  }
}
