import { useAmule } from '#/amule'
import { fromMagnetLink, toEd2kLink } from '#/lib/links'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/v2/torrents/add')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const formData = await request.formData()
        const urls = formData.get("urls")?.toString()
        const category = formData.get("category")?.toString()

        if (!urls) {
          throw new Error("No URL to download")
        }

        if (!category) {
          throw new Error("No download category")
        }

        const { hash, name, size } = fromMagnetLink(urls)
        const ed2kLink = toEd2kLink(hash, name, size)

        await useAmule(async (amule) => {
          const isPresent = async () => {
            const downloads = await amule.getDownloadQueue()
            const shared = await amule.getSharedFiles()
            return [...downloads, ...shared].some(
              (f) => f.fileHash?.toLowerCase() === hash.toLowerCase()
            )
          }

          // Idempotent like qBittorrent: aMule rejects duplicates, which clients read as a failed add.
          if (await isPresent()) {
            return
          }

          const categories = await amule.getCategories()
          const categoryId = categories.find(c => c.title === category)?.id
          if (!categoryId) {
            throw new Error(`Category ${category} not found`)
          }

          if (!await amule.addEd2kLink(ed2kLink, categoryId) && !(await isPresent())) {
            throw new Error(`Failed to add torrent ${ed2kLink}`)
          }
        })

        return Response.json({})
      },
    }
  }
})
