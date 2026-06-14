import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  isSafeFileName,
  resolveSafeFilePath,
} from "./qbittorrentPathSafety.ts"

describe("qbittorrentPathSafety", () => {
  it("rejects traversal attempts", () => {
    assert.equal(isSafeFileName("../secret.txt"), false)
    assert.equal(resolveSafeFilePath("/downloads/complete", "../secret.txt"), null)
  })

  it("resolves contained paths", () => {
    assert.equal(
      resolveSafeFilePath("/downloads/complete", "book.epub"),
      "/downloads/complete/book.epub"
    )
  })
})
