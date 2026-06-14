import { ActionFunction, json } from "@remix-run/node"
import {
  removeTorrents,
  selectionFromParsedHashes,
} from "~/data/downloadClient"
import { parseTorrentHashesFromFormData } from "~/utils/qbittorrentHash"
import { parseQbittorrentBoolean } from "~/utils/qbittorrentBoolean"
import { logger } from "~/utils/logger"

export const action = (async ({ request }) => {
  const url = new URL(request.url)
  logger.debug("Path", url.pathname)

  const formData = await request.formData()
  const parsed = parseTorrentHashesFromFormData(formData)
  const selection = selectionFromParsedHashes(parsed)
  const deleteFiles = parseQbittorrentBoolean(formData.get("deleteFiles"))

  if (selection) {
    await removeTorrents(selection, deleteFiles)
  }

  return json({})
}) satisfies ActionFunction
