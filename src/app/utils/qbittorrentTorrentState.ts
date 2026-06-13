import { amuleGetDownloads } from "amule/amule"
import { pauseTorrents, resumeTorrents } from "~/data/downloadClient"
import { logger } from "~/utils/logger"

export type ParsedTorrentHashes =
  | { kind: "none" }
  | { kind: "all" }
  | { kind: "hashes"; hashes: string[] }

export function normalizeQbittorrentHash(raw: string): string {
  const hash = raw.trim().toUpperCase()
  if (/^[0-9A-F]{40}$/.test(hash) && hash.endsWith("00000000")) {
    return hash.slice(0, 32)
  }
  return hash
}

export function parseTorrentHashesFromFormData(
  formData: FormData
): ParsedTorrentHashes {
  const hashesRaw = formData.get("hashes")?.toString()
  if (!hashesRaw) {
    return { kind: "none" }
  }

  if (hashesRaw.toLowerCase() === "all") {
    return { kind: "all" }
  }

  const hashes = [
    ...new Set(
      hashesRaw
        .split("|")
        .map((part) => part.trim())
        .filter(Boolean)
        .map(normalizeQbittorrentHash)
    ),
  ]

  return { kind: "hashes", hashes }
}

export async function resolveTorrentHashes(
  parsed: ParsedTorrentHashes
): Promise<string[]> {
  if (parsed.kind === "none") {
    return []
  }

  if (parsed.kind === "all") {
    const downloads = await amuleGetDownloads()
    return downloads.map((download) => download.hash)
  }

  return parsed.hashes
}

export async function handleTorrentStateAction(
  request: Request,
  state: "pause" | "resume"
): Promise<Response> {
  logger.debug("URL", request.url)
  const formData = await request.formData()
  const parsed = parseTorrentHashesFromFormData(formData)
  const hashes = await resolveTorrentHashes(parsed)

  if (hashes.length) {
    if (state === "pause") {
      await pauseTorrents(hashes)
    } else {
      await resumeTorrents(hashes)
    }
  }

  return new Response(null, { status: 200 })
}

export function rejectTorrentStateGet(): Response {
  return new Response(null, { status: 405 })
}
