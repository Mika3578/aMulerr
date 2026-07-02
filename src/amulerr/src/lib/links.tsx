export function toMagnetLink(hash: string, name: string, size: number) {
  // Hex btih (not base32): some clients mishandle a 32-char base32 btih.
  const btih = toQbittorrentHash(hash)

  return `magnet:?xt=urn:btih:${btih}&dn=${encodeURIComponent(name)}&xl=${size}&tr=http://amulerr`
}

export function fromMagnetLink(magnetLink: string) {
  const extractMagnetLinkInfo =
    /magnet:\?xt=urn:btih:(?<hash>[^&]+)&dn=(?<name>[^&]+)&xl=(?<size>[^&]+)&tr=http:\/\/amulerr/
  const {
    hash: btih,
    name,
    size,
  } = extractMagnetLinkInfo.exec(magnetLink)?.groups ?? {}

  if (!btih || !name || !size) {
    throw new Error("Invalid magnet link")
  }

  if (!isAmulerrBtih(btih)) {
    throw new Error("Invalid magnet link")
  }

  const hash = fromQbittorrentHash(btih)
  if (!/^[0-9A-F]{32}$/.test(hash)) {
    throw new Error("Invalid magnet link")
  }

  if (!/^\d+$/.test(size)) {
    throw new Error("Invalid magnet link")
  }

  const parsedSize = Number(size)
  if (!Number.isSafeInteger(parsedSize)) {
    throw new Error("Invalid magnet link")
  }

  let decodedName: string
  try {
    decodedName = decodeURIComponent(name)
  } catch {
    throw new Error("Invalid magnet link")
  }

  return { hash, name: decodedName, size: parsedSize }
}

// qBittorrent-facing hash: ed2k hash (32 hex) padded to a 40-char hex btih.
// Exposed in /torrents/info; converted back to the ed2k hash for aMule.
export function toQbittorrentHash(ed2kHash: string) {
  return ed2kHash.trim().slice(0, 32).toLowerCase().padEnd(40, "0")
}

export function fromQbittorrentHash(qbittorrentHash: string) {
  return qbittorrentHash.trim().slice(0, 32).toUpperCase()
}

export function isAmulerrBtih(btih: string) {
  const normalized = btih.trim().toLowerCase()
  return /^[0-9a-f]{40}$/.test(normalized) && normalized.endsWith("00000000")
}

export function toEd2kLink(hash: string, name: string, size: number) {
  return `ed2k://|file|${name}|${size}|${hash}|/`
}

export function fromEd2kLink(ed2kLink: string) {
  const extractEd2kLinkInfo =
    /ed2k:\/\/\|file\|(?<name>[^\|]+)\|(?<size>[^\|]+)\|(?<hash>[^\|]+)\|/

  const { hash, name, size } = extractEd2kLinkInfo.exec(ed2kLink)?.groups ?? {}

  if (!hash || !name || !size) {
    throw new Error("Invalid ed2k link")
  }

  return { hash, name: decodeURIComponent(name), size: parseInt(size) }
}
