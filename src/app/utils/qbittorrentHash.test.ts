import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  externalToInternalEd2kHash,
  internalToExternalQbittorrentHash,
  normalizeInternalEd2kHash,
  parseQbittorrentHashSelection,
} from "./qbittorrentHash.ts"

const SAMPLE = "A1B2C3D4E5F6789012345678ABCDEF01"

describe("qbittorrentHash", () => {
  it("normalizes internal hashes", () => {
    assert.equal(normalizeInternalEd2kHash(`  ${SAMPLE.toLowerCase()}  `), SAMPLE)
  })

  it("converts internal to external hash", () => {
    assert.equal(
      internalToExternalQbittorrentHash(SAMPLE),
      `${SAMPLE.toLowerCase()}00000000`
    )
  })

  it("converts external compatibility hash to internal", () => {
    assert.equal(
      externalToInternalEd2kHash(`${SAMPLE.toLowerCase()}00000000`),
      SAMPLE
    )
  })

  it("rejects arbitrary 40-character hashes", () => {
    assert.equal(
      externalToInternalEd2kHash("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"),
      null
    )
  })

  it("parses hashes=all", () => {
    assert.deepEqual(parseQbittorrentHashSelection("ALL"), { kind: "all" })
  })

  it("parses pipe-separated mixed-case hashes", () => {
    const parsed = parseQbittorrentHashSelection(
      `${SAMPLE}|${SAMPLE.toLowerCase()}00000000`
    )
    assert.equal(parsed.kind, "hashes")
    if (parsed.kind === "hashes") {
      assert.deepEqual(parsed.hashes, [SAMPLE])
    }
  })

  it("rejects malformed selections", () => {
    assert.deepEqual(parseQbittorrentHashSelection("not-a-hash"), { kind: "none" })
  })
})
