import {
  amuleGetUploads,
  amuleGetDownloads,
  amuleGetShared,
  amuleDoDownload,
  amuleDoDelete,
  amuleDoPause,
  amuleDoReloadShared,
  amuleDoResume,
} from "amule/amule"
import { toEd2kLink } from "~/links"
import { unlink } from "node:fs/promises"
import { existsSync } from "node:fs"
import { createJsonDb } from "~/utils/jsonDb"
import { staleWhileRevalidate } from "~/utils/memoize"
import {
  externalToInternalEd2kHash,
  type ParsedQbittorrentHashSelection,
} from "~/utils/qbittorrentHash"
import {
  COMPLETE_DOWNLOAD_ROOT,
  INCOMPLETE_DOWNLOAD_ROOT,
  resolveSafeFilePath,
  SHARED_DOWNLOAD_ROOT,
} from "~/utils/qbittorrentPathSafety"

export type HashMetadata = {
  category: string
  addedOn: number
  pausedByApi?: boolean
  removedFromApi?: boolean
  completionOn?: number
}

export const metadataDb = createJsonDb<Record<string, HashMetadata>>(
  "/config/hash-metadata.json",
  {}
)

export type TorrentHashSelection = "all" | string[]

export type DownloadClientFile = Awaited<
  ReturnType<typeof getDownloadClientFiles>
>[number]

function spreadMetadata(
  hash: string,
  patch: Partial<HashMetadata>
): HashMetadata {
  const existing = metadataDb.data[hash]
  return {
    category: existing?.category ?? "",
    addedOn: existing?.addedOn ?? Date.now(),
    ...existing,
    ...patch,
  }
}

function setPausedByApi(hash: string, paused: boolean) {
  if (paused) {
    metadataDb.data[hash] = spreadMetadata(hash, { pausedByApi: true })
    return
  }

  const existing = metadataDb.data[hash]
  if (!existing) {
    return
  }

  const next = { ...existing }
  delete next.pausedByApi
  metadataDb.data[hash] = next
}

function markRemovedFromApi(hash: string) {
  metadataDb.data[hash] = spreadMetadata(hash, { removedFromApi: true })
}

function clearRemovedFromApi(hash: string) {
  const existing = metadataDb.data[hash]
  if (!existing?.removedFromApi) {
    return
  }

  const next = { ...existing }
  delete next.removedFromApi
  metadataDb.data[hash] = next
}

function persistCompletionOn(hash: string, completed: boolean) {
  if (!completed || metadataDb.data[hash]?.completionOn !== undefined) {
    return
  }

  const existing = metadataDb.data[hash]
  metadataDb.data[hash] = {
    category: existing?.category ?? "",
    addedOn: existing?.addedOn ?? Date.now(),
    ...existing,
    completionOn: Date.now(),
  }
}

export async function resolveKnownDownloadHashes(
  selection: TorrentHashSelection
): Promise<string[]> {
  const downloads = await amuleGetDownloads()

  if (selection === "all") {
    return [...new Set(downloads.map((download) => download.hash))]
  }

  const knownHashes = new Map(
    downloads.map((download) => [download.hash.toUpperCase(), download.hash])
  )

  return [...new Set(selection.map((hash) => hash.toUpperCase()))]
    .map((hash) => knownHashes.get(hash))
    .filter((hash): hash is string => Boolean(hash))
}

export async function resolveApiVisibleHashes(
  selection: TorrentHashSelection
): Promise<string[]> {
  const files = await getDownloadClientFiles()
  const visibleHashes = files.map((file) => file.hash)

  if (selection === "all") {
    return visibleHashes
  }

  const visible = new Map(
    visibleHashes.map((hash) => [hash.toUpperCase(), hash])
  )

  return [...new Set(selection.map((hash) => hash.toUpperCase()))]
    .map((hash) => visible.get(hash))
    .filter((hash): hash is string => Boolean(hash))
}

export function selectionFromParsedHashes(
  parsed: ParsedQbittorrentHashSelection
): TorrentHashSelection | null {
  if (parsed.kind === "none") {
    return null
  }

  if (parsed.kind === "all") {
    return "all"
  }

  return parsed.hashes
}

export async function pauseTorrents(selection: TorrentHashSelection) {
  const knownHashes = await resolveKnownDownloadHashes(selection)

  await Promise.all(
    knownHashes.map(async (hash) => {
      await amuleDoPause(hash)
      setPausedByApi(hash, true)
    })
  )
}

export async function resumeTorrents(selection: TorrentHashSelection) {
  const knownHashes = await resolveKnownDownloadHashes(selection)

  await Promise.all(
    knownHashes.map(async (hash) => {
      await amuleDoResume(hash)
      setPausedByApi(hash, false)
    })
  )
}

let amuleClientFilesGeneration = 0
const permanentlyRemovedHashes = new Set<string>()

export function invalidateAmuleClientFilesCache() {
  amuleClientFilesGeneration += 1
}

const getAmuleClientFilesCached = staleWhileRevalidate(async function (
  _generation: number
) {
  const uploads = await amuleGetUploads()
  const downloads = [...(await amuleGetDownloads())]
  const shared = (await amuleGetShared())
    .filter((f) => !downloads.some((d) => d.hash === f.hash))
    .map(
      (f) =>
        ({
          ...f,
          eta: 0,
          last_seen_complete: 0,
          prio: 0,
          prio_auto: 0,
          progress: 1,
          size_done: f.size,
          size_xfer: 0,
          src_valid: null,
          src_count: null,
          src_count_xfer: null,
          speed: null,
          status: 9,
          status_str: "downloaded",
        }) as const
    )

  return [
    ...downloads.sort(
      (a, b) =>
        (b.speed > 0 ? 1 : 0) - (a.speed > 0 ? 1 : 0) ||
        b.progress - a.progress ||
        b.speed - a.speed
    ),
    ...shared,
  ].map((file) => ({
    ...file,
    up_speed: uploads
      .filter((u) => u.name === file.name)
      .map((u) => u.xfer_speed)
      .reduce((prev, curr) => prev + curr, 0),
  }))
})

async function getAmuleClientFiles() {
  return getAmuleClientFilesCached(amuleClientFilesGeneration)
}

export async function getDownloadClientFiles() {
  const files = await getAmuleClientFiles()

  for (const hash of [...permanentlyRemovedHashes]) {
    if (!files.some((file) => file.hash === hash)) {
      permanentlyRemovedHashes.delete(hash)
    }
  }

  return files
    .filter(
      (file) =>
        !metadataDb.data[file.hash]?.removedFromApi &&
        !permanentlyRemovedHashes.has(file.hash)
    )
    .map((file) => {
      persistCompletionOn(file.hash, file.progress >= 1)
      return {
        ...file,
        meta: metadataDb.data[file.hash],
      }
    })
}

export async function getApiVisibleFileByHash(
  hashInput: string
): Promise<DownloadClientFile | undefined> {
  const internalHash = externalToInternalEd2kHash(hashInput)
  if (!internalHash) {
    return undefined
  }

  const files = await getDownloadClientFiles()
  return files.find((file) => file.hash.toUpperCase() === internalHash)
}

export async function download(
  hash: string,
  name: string,
  size: number,
  category: string,
  options?: { paused?: boolean }
) {
  const ed2kLink = toEd2kLink(hash, name, size)
  await amuleDoDownload(ed2kLink)

  metadataDb.data[hash] = spreadMetadata(hash, { category })
  clearRemovedFromApi(hash)
  permanentlyRemovedHashes.delete(hash)

  if (options?.paused) {
    await amuleDoPause(hash)
    setPausedByApi(hash, true)
  }

  invalidateAmuleClientFilesCache()
}

export function setCategoryForKnownHashes(hashes: string[], category: string) {
  for (const hash of hashes) {
    metadataDb.data[hash] = spreadMetadata(hash, { category })
  }
}

export async function removeTorrents(
  selection: TorrentHashSelection,
  deleteFiles: boolean
) {
  const hashes = await resolveApiVisibleHashes(selection)
  if (!hashes.length) {
    return
  }

  const downloads = await amuleGetDownloads()
  const shared = await amuleGetShared()

  await Promise.all(
    hashes.map(async (hash) => {
      const active = downloads.find((entry) => entry.hash === hash)
      const completed = shared.find((entry) => entry.hash === hash)
      const file = active ?? completed

      if (!file) {
        return
      }

      const isCompleted = !active && Boolean(completed)

      if (!deleteFiles) {
        if (active) {
          await amuleDoDelete(hash)
        }
        markRemovedFromApi(hash)
        return
      }

      await amuleDoDelete(hash)

      if (file.name) {
        await deleteKnownFile(file.name)
      }

      delete metadataDb.data[hash]
      permanentlyRemovedHashes.add(hash)
    })
  )

  if (deleteFiles) {
    await amuleDoReloadShared()
  }

  invalidateAmuleClientFilesCache()
}

async function deleteKnownFile(fileName: string) {
  for (const root of [
    COMPLETE_DOWNLOAD_ROOT,
    SHARED_DOWNLOAD_ROOT,
    INCOMPLETE_DOWNLOAD_ROOT,
  ]) {
    const safePath = resolveSafeFilePath(root, fileName)
    if (safePath && existsSync(safePath)) {
      await unlink(safePath).catch(() => void 0)
    }
  }
}

// Backward-compatible alias used by existing routes during transition.
export async function remove(hashes: string[], deleteFiles = true) {
  await removeTorrents(hashes, deleteFiles)
}

export function setCategory(hash: string, category: string) {
  metadataDb.data[hash] = spreadMetadata(hash, { category })
}
