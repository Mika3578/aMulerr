import { existsSync } from "node:fs"
import { amuleGetDownloads } from "amule/amule"
import {
  COMPLETE_DOWNLOAD_ROOT,
  SHARED_DOWNLOAD_ROOT,
} from "~/utils/qbittorrentPathSafety"
import { internalToExternalQbittorrentHash } from "~/utils/qbittorrentHash"
import { timestampToUnixSeconds } from "~/utils/qbittorrentTimestamps"
import type { DownloadClientFile, HashMetadata } from "~/data/downloadClient"

export const QBITTORRENT_SAVE_PATH = COMPLETE_DOWNLOAD_ROOT

// LazyLibrarian treats pausedUP/stoppedUP items as finished only when max_ratio > 0.
// aMule has no BitTorrent ratio; completed eD2K items always expose ratio 1.0.
export const COMPLETED_COMPAT_RATIO = 1.0
export const INCOMPLETE_COMPAT_RATIO = 0.0

export function statusToQbittorrentState(
  status: Awaited<ReturnType<typeof amuleGetDownloads>>[0]["status_str"]
) {
  switch (status) {
    case "downloading":
      return "downloading"
    case "downloaded":
      return "pausedUP"
    case "stalled":
      return "stalledDL"
    case "error":
      return "error"
    case "completing":
      return "moving"
    case "stopped":
      return "pausedDL"
  }
}

function contentPath(name: string) {
  if (existsSync(`${COMPLETE_DOWNLOAD_ROOT}/${name}`)) {
    return `${COMPLETE_DOWNLOAD_ROOT}/${name}`
  }

  if (existsSync(`${SHARED_DOWNLOAD_ROOT}/${name}`)) {
    return `${SHARED_DOWNLOAD_ROOT}/${name}`
  }

  return undefined
}

export function buildQbittorrentTorrentInfo(file: DownloadClientFile) {
  const externalHash = internalToExternalQbittorrentHash(file.hash)
  if (!externalHash) {
    return null
  }

  const completed = file.progress >= 1
  const progress =
    file.progress === 1 ? 1 : Math.min(0.999, Math.max(file.progress, 0.001))
  const addedOn = file.meta?.addedOn
  const completionOn = file.meta?.completionOn
  const path = contentPath(file.name)

  return {
    hash: externalHash,
    name: file.name,
    size: file.size,
    total_size: file.size,
    downloaded: file.size_done,
    completed: file.size_done,
    progress,
    dlspeed: file.speed ?? 0,
    upspeed: file.up_speed ?? 0,
    eta: file.eta,
    state: statusToQbittorrentState(file.status_str),
    category: file.meta?.category ?? "",
    save_path: QBITTORRENT_SAVE_PATH,
    content_path: path,
    ratio: completed ? COMPLETED_COMPAT_RATIO : INCOMPLETE_COMPAT_RATIO,
    seeding_time: completed ? 86400 : 0,
    added_on: timestampToUnixSeconds(addedOn),
    completion_on: completed ? timestampToUnixSeconds(completionOn) : 0,
    priority: 1,
  }
}

export function buildQbittorrentTorrentFile(file: DownloadClientFile) {
  const completed = file.progress >= 1
  const progress =
    file.progress === 1 ? 1 : Math.min(0.999, Math.max(file.progress, 0.001))

  return {
    index: 0,
    name: file.name,
    size: file.size,
    progress,
    priority: 1,
    is_seed: completed,
    availability: completed ? 1 : 0,
  }
}

export function ensureCompletionOn(
  hash: string,
  meta: HashMetadata | undefined,
  completed: boolean
): HashMetadata | undefined {
  if (!meta || !completed || meta.completionOn !== undefined) {
    return meta
  }

  return {
    ...meta,
    completionOn: Date.now(),
  }
}
