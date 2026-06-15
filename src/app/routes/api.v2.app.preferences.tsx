import { LoaderFunction, json } from "@remix-run/node"
import { QBITTORRENT_APP_PREFERENCES } from "~/utils/qbittorrentTorrentResponse"

export const loader = (() =>
  json(QBITTORRENT_APP_PREFERENCES)) satisfies LoaderFunction

export const action = loader
