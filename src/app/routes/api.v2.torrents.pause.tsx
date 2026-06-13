import { ActionFunction, LoaderFunction } from "@remix-run/node"
import {
  handleTorrentStateAction,
  rejectTorrentStateGet,
} from "~/utils/qbittorrentTorrentState"

export const loader = (() =>
  rejectTorrentStateGet()) satisfies LoaderFunction

export const action = (async ({ request }) =>
  handleTorrentStateAction(request, "pause")) satisfies ActionFunction
