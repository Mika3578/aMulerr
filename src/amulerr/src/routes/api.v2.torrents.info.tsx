
import { useAmule } from '#/amule'
import type { DownloadItem } from '#/amule-ec-node/AmuleClient.mjs'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/v2/torrents/info')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const categoryTitle = url.searchParams.get("category")

        const { categories, shared, downloads } = await useAmule(async (amule) => {
          const categories = await amule.getCategories()
          const downloads = await amule.getDownloadQueue()
          const shared = await amule.getSharedFiles()
          return {
            categories,
            downloads: downloads.map(d => ({ ...d, category_obj: categories.find(c => c.id === d.category) })),
            shared: shared
              .filter(s => !downloads.some(d => d.fileHash === s.fileHash))
              .map(d => ({ ...d, category_obj: categories.find(c => c.path === d.path) })),
          }
        })

        const filterCategory = categories.find(c => c.title === categoryTitle)
        if (categoryTitle && !filterCategory) {
          throw new Error(`Category ${categoryTitle} not found`)
        }

        const filteredDownloads = categoryTitle
          ? downloads.filter(d => d.category_obj === filterCategory)
          : downloads

        const filteredShared = categoryTitle
          ? shared.filter(s => s.category_obj === filterCategory)
          : shared

        // qBittorrent structure
        return Response.json([
          ...filteredDownloads.map((f) => ({
            hash: f.fileHash,
            name: f.fileName,
            size: f.fileSize,
            tracker: 'aMulerr',
            size_done: f.fileSizeDownloaded,
            progress: Math.min(99.99, parseFloat(f.progress ?? '0')) / 100,
            dlspeed: f.speed,
            eta: f.speed && f.speed > 0 ? (f.fileSize - (f.fileSizeDownloaded ?? 0)) / f.speed : 8640000,
            state: statusToQbittorrentState(f),
            content_path: `${f.category_obj?.path}/${f.fileName}`,
            category: f.category_obj?.title,
          })),
          ...filteredShared.map((f) => ({
            hash: f.fileHash,
            name: f.fileName,
            size: f.fileSize,
            tracker: 'aMulerr',
            size_done: f.fileSize,
            progress: 1,
            dlspeed: 0,
            state: "pausedUP" as const,
            content_path: `${f.path}/${f.fileName}`,
            category: f.category_obj?.title,
          })),
        ])
      }
    }
  },
})

function statusToQbittorrentState(
  f: DownloadItem
) {
  switch (f.status) {
    case 0:
    case 1:
    case 2:
    case 3:
    case 10:
      return f.sourceCountXfer && f.sourceCountXfer > 0
        ? ("downloading" as const)
        : f.progress && parseFloat(f.progress) < 100
          ? ("stalledDL" as const)
          : "pausedUP" as const
    case 4:
    case 5:
    case 6:
      return "error" as const
    case 7:
      return "pausedDL" as const
    case 8:
      return "moving" as const
    case 9:
      return "pausedUP" as const
    default:
      return "stalledDL" as const
  }
}