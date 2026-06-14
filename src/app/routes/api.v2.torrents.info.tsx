import { LoaderFunction, json } from "@remix-run/node"
import { getDownloadClientFiles } from "~/data/downloadClient"
import { buildQbittorrentTorrentInfo } from "~/utils/qbittorrentTorrentResponse"
import { parseQbittorrentHashSelection } from "~/utils/qbittorrentHash"
import { logger } from "~/utils/logger"

export const loader = (async ({ request }) => {
  const url = new URL(request.url)
  logger.debug("Path", url.pathname)

  const category = url.searchParams.get("category")
  const hashSelection = parseQbittorrentHashSelection(
    url.searchParams.get("hashes")
  )
  const files = await getDownloadClientFiles()

  return json(
    files
      .filter((file) => {
        if (category !== null && (file.meta?.category ?? "") !== category) {
          return false
        }

        if (hashSelection.kind === "hashes") {
          const wanted = new Set(
            hashSelection.hashes.map((hash) => hash.toUpperCase())
          )
          return wanted.has(file.hash.toUpperCase())
        }

        return true
      })
      .map((file) => buildQbittorrentTorrentInfo(file))
      .filter((entry) => entry !== null)
  )
}) satisfies LoaderFunction

export const action = loader
