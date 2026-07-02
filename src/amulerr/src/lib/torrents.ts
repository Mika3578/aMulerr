import type AmuleClient from '#/amule-ec-node/AmuleClient.mjs'
import { skipFalsy } from './array'
import { fromQbittorrentHash, isAmulerrBtih } from './links'

const ED2K_HASH_RE = /^[0-9A-F]{32}$/

function normalizeEd2kHash(hash: string): string | null {
  const trimmed = hash.trim()

  if (/^[0-9a-fA-F]{32}$/.test(trimmed)) {
    const normalized = trimmed.toUpperCase()
    return ED2K_HASH_RE.test(normalized) ? normalized : null
  }

  if (/^[0-9a-fA-F]{40}$/.test(trimmed)) {
    if (!isAmulerrBtih(trimmed)) {
      return null
    }

    const normalized = fromQbittorrentHash(trimmed)
    return ED2K_HASH_RE.test(normalized) ? normalized : null
  }

  return null
}

export function parseTorrentHash(rawHash: string | null | undefined): string | null {
  if (!rawHash?.trim()) {
    return null
  }

  return normalizeEd2kHash(rawHash)
}

export function hasTorrentHashInput(rawHashes: string | null | undefined): boolean {
  const value = rawHashes?.toString().trim()
  if (!value) {
    return false
  }

  if (value.toLowerCase() === 'all') {
    return true
  }

  return value
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
    .some((part) => normalizeEd2kHash(part) !== null)
}

export async function resolveTorrentHashes(
  amule: AmuleClient,
  rawHashes: string | null | undefined
): Promise<string[]> {
  const value = rawHashes?.toString().trim()
  if (!value) {
    return []
  }

  if (value.toLowerCase() === 'all') {
    const downloads = await amule.getDownloadQueue()
    return downloads
      .map((d) => d.fileHash)
      .filter((h): h is string => !!h)
      .map((h) => normalizeEd2kHash(h))
      .filter((h): h is string => !!h)
  }

  return value
    .split('|')
    .filter(skipFalsy)
    .map((h) => normalizeEd2kHash(h))
    .filter((h): h is string => !!h)
}
