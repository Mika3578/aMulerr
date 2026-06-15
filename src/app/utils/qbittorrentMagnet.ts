import { compatibilityHashToInternalEd2kHash } from "~/utils/qbittorrentHash"

export class MagnetParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "MagnetParseError"
  }
}

function decodeBtihToInternalHash(btih: string): string {
  const internal = compatibilityHashToInternalEd2kHash(btih)
  if (internal) {
    return internal
  }

  const value = btih.trim()
  if (/^[0-9A-Fa-f]{40}$/.test(value)) {
    throw new MagnetParseError("Unsupported BitTorrent info hash")
  }

  throw new MagnetParseError("Invalid magnet info hash")
}

export function parseSyntheticMagnetLink(magnetLink: string): {
  hash: string
  name: string
  size: number
} {
  const trimmed = magnetLink.trim()
  if (!trimmed.toLowerCase().startsWith("magnet:?")) {
    throw new MagnetParseError("Invalid magnet protocol")
  }

  const params = new URLSearchParams(trimmed.slice("magnet:?".length))
  const xt = params.get("xt")
  if (!xt?.toLowerCase().startsWith("urn:btih:")) {
    throw new MagnetParseError("Missing or invalid xt parameter")
  }

  const hash = decodeBtihToInternalHash(xt.slice("urn:btih:".length))
  const dn = params.get("dn")?.trim()
  if (!dn) {
    throw new MagnetParseError("Missing dn parameter")
  }

  const xl = params.get("xl")?.trim()
  if (!xl || !/^\d+$/.test(xl)) {
    throw new MagnetParseError("Invalid xl parameter")
  }

  const size = Number.parseInt(xl, 10)
  if (!Number.isSafeInteger(size) || size <= 0) {
    throw new MagnetParseError("Invalid xl parameter")
  }

  return {
    hash,
    name: dn,
    size,
  }
}
