import { useAmule } from '#/amule'
import { parseTorrentHash } from '#/lib/torrents'
import { createFileRoute } from '@tanstack/react-router'

// https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#get-torrent-generic-properties
// Used by qBittorrent clients (e.g. LazyLibrarian's get_torrent()) to confirm a torrent
// was just added. We return a non-empty object when the hash exists, otherwise an empty
// object (falsy on the client side) so the client can retry.
export const Route = createFileRoute('/api/v2/torrents/properties')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const rawHash = url.searchParams.get('hash')

        if (!rawHash) {
          return Response.json({})
        }

        const hash = parseTorrentHash(rawHash)
        if (!hash) {
          return Response.json({})
        }

        const properties = await useAmule(async (amule) => {
          const downloads = await amule.getDownloadQueue()

          const download = downloads.find((item) => item.fileHash?.toLowerCase() === hash.toLowerCase())
          if (download) {
            const categories = await amule.getCategories()
            const category = categories.find(c => c.id === download.category)
            return {
              save_path: category?.path ?? "",
              name: download.fileName ?? "",
              total_size: download.fileSize ?? 0,
              total_downloaded: download.fileSizeDownloaded ?? 0,
              piece_size: 0,
              pieces_num: 0,
              pieces_have: 0,
              addition_date: Math.floor(Date.now() / 1000) - (download.downloadActiveTime ?? 0),
              completion_date: -1,
              seeds: download.sourceCount ?? 0,
              peers: download.sourceCountXfer ?? 0,
            }
          }

          const shared = await amule.getSharedFiles()
          const sharedFile = shared.find((item) => item.fileHash?.toLowerCase() === hash.toLowerCase())
          if (sharedFile) {
            return {
              save_path: sharedFile.path ?? "",
              name: sharedFile.fileName ?? "",
              total_size: sharedFile.fileSize ?? 0,
              total_downloaded: sharedFile.fileSize ?? 0,
              piece_size: 0,
              pieces_num: 0,
              pieces_have: 0,
              addition_date: -1,
              completion_date: -1,
            }
          }

          return null
        })

        if (!properties) {
          return Response.json({})
        }

        return Response.json(properties)
      },
    },
  },
})
