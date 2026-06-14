import { LoaderFunction, json } from "@remix-run/node"
import { getApiVisibleFileByHash } from "~/data/downloadClient"
import { QBITTORRENT_SAVE_PATH } from "~/utils/qbittorrentTorrentResponse"
import { logger } from "~/utils/logger"

export const loader = (async ({ request }) => {
  const url = new URL(request.url)
  logger.debug("Path", url.pathname)

  const hash = url.searchParams.get("hash")
  if (!hash) {
    return new Response("Missing hash parameter", { status: 400 })
  }

  const file = await getApiVisibleFileByHash(hash)
  if (!file) {
    return new Response("Not Found", { status: 404 })
  }

  return json({
    save_path: QBITTORRENT_SAVE_PATH,
    creation_date: 0,
    piece_size: 0,
    comment: "",
    total_wasted: 0,
    total_uploaded: 0,
    total_uploaded_session: 0,
    total_downloaded: file.size_done,
    total_downloaded_session: file.size_done,
    up_limit: -1,
    dl_limit: -1,
    time_elapsed: 0,
    nb_connections: 0,
    nb_connections_limit: 100,
    share_ratio: file.progress >= 1 ? 1 : 0,
    addition_date: file.meta?.addedOn ?? 0,
    completion_date: file.meta?.completionOn ?? 0,
    created_by: "eMulerr",
    dl_speed_avg: file.speed ?? 0,
    dl_speed: file.speed ?? 0,
    eta: file.eta,
    last_seen: 0,
    peers: 0,
    seeds: 0,
  })
}) satisfies LoaderFunction

export const action = loader
