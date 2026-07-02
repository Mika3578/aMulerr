
import { useAmule } from '#/amule'
import { skipFalsy } from '#/lib/array'
import { hasTorrentHashInput, resolveTorrentHashes } from '#/lib/torrents'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/v2/torrents/delete')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const formData = await request.formData()
        const rawHashes = formData.get("hashes")?.toString()

        if (hasTorrentHashInput(rawHashes)) {
          await useAmule(async (amule) => {
            const allHashes = rawHashes?.trim().toLowerCase() === "all"
            const hashes = await resolveTorrentHashes(amule, rawHashes)
            if (!hashes.length && !allHashes) {
              return
            }

            const shared = await amule.getSharedFiles()
            const ecids = shared
              .filter(f => {
                if (allHashes) {
                  return true
                }
                return !!f.fileHash && hashes.includes(f.fileHash.toUpperCase())
              })
              .map(f => f.ecid).filter(skipFalsy)

            await amule.clearCompleted(ecids)
            for (const hash of hashes) {
              await amule.cancelDownload(hash)
            }
          })
        }

        return Response.json({})
      }
    }
  },
})
