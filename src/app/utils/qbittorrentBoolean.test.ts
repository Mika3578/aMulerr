import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { parseQbittorrentBoolean } from "./qbittorrentBoolean.ts"

describe("qbittorrentBoolean", () => {
  it("parses qBittorrent deleteFiles values", () => {
    assert.equal(parseQbittorrentBoolean("true"), true)
    assert.equal(parseQbittorrentBoolean('"true"'), false)
    assert.equal(parseQbittorrentBoolean("false"), false)
    assert.equal(parseQbittorrentBoolean(null), false)
  })
})
