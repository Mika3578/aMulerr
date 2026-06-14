import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { timestampToUnixSeconds } from "./qbittorrentTimestamps.ts"

describe("qbittorrentTimestamps", () => {
  it("converts milliseconds to seconds", () => {
    assert.equal(timestampToUnixSeconds(1_700_000_000_000), 1_700_000_000)
  })

  it("preserves values already in seconds", () => {
    assert.equal(timestampToUnixSeconds(1_700_000_000), 1_700_000_000)
  })
})
