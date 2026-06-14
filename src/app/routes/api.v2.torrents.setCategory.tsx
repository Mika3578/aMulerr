import { ActionFunction, json } from "@remix-run/node"
import {
  resolveApiVisibleHashes,
  selectionFromParsedHashes,
  setCategoryForKnownHashes,
} from "~/data/downloadClient"
import { parseTorrentHashesFromFormData } from "~/utils/qbittorrentHash"
import { logger } from "~/utils/logger"

export const action = (async ({ request }) => {
  const url = new URL(request.url)
  logger.debug("Path", url.pathname)

  const formData = await request.formData()
  const parsed = parseTorrentHashesFromFormData(formData)
  const selection = selectionFromParsedHashes(parsed)
  const category = formData.get("category")

  if (typeof category !== "string" || !selection) {
    return json({})
  }

  const knownHashes = await resolveApiVisibleHashes(selection)
  setCategoryForKnownHashes(knownHashes, category)

  return json({})
}) satisfies ActionFunction
