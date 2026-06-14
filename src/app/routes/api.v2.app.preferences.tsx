import { LoaderFunction, json } from "@remix-run/node"
import {
  COMPLETED_COMPAT_RATIO,
  QBITTORRENT_SAVE_PATH,
} from "~/utils/qbittorrentTorrentResponse"

export const loader = (() =>
  json({
    save_path: QBITTORRENT_SAVE_PATH,
    temp_path_enabled: true,
    temp_path: "/downloads/incomplete",
    create_subfolder_enabled: false,
    max_ratio_enabled: true,
    max_ratio: COMPLETED_COMPAT_RATIO,
    max_seeding_time_enabled: true,
    max_seeding_time: 86400,
  })) satisfies LoaderFunction

export const action = loader
