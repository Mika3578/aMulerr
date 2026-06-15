import assert from "node:assert/strict"
import { describe, it } from "node:test"
import base32 from "hi-base32"
import {
  compatibilityHashToInternalEd2kHash,
  externalToInternalEd2kHash,
  hashSelectionMatchesFile,
  internalToExternalQbittorrentHash,
  normalizeInternalEd2kHash,
  parseQbittorrentHashQuery,
  parseQbittorrentHashSelection,
  parseTorrentHashesFromFormData,
  selectionFromParsedHashes,
} from "./qbittorrentHash.ts"

const SAMPLE = "A1B2C3D4E5F6789012345678ABCDEF01"
const UNKNOWN = "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"

const REPRODUCED_BASE32 = "3ZXWM66ZHIOH7FHJZXMKSJFAW4AAAAAA"
const REPRODUCED_INTERNAL = "DE6F667BD93A1C7F94E9CDD8A924A0B7"
const REPRODUCED_EXTERNAL = "de6f667bd93a1c7f94e9cdd8a924a0b700000000"

function buildSyntheticBase32FromInternal(internalHex: string): string {
  const hashBuffer = Buffer.from(internalHex, "hex")
  const base32Buffer = Buffer.alloc(20, 0)
  hashBuffer.copy(base32Buffer)
  return base32.encode(base32Buffer).toUpperCase()
}

describe("qbittorrentHash", () => {
  it("normalizes internal hashes", () => {
    assert.equal(
      normalizeInternalEd2kHash(`  ${SAMPLE.toLowerCase()}  `),
      SAMPLE
    )
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

  it("distinguishes absent, empty, all, valid and invalid selections", () => {
    assert.deepEqual(parseQbittorrentHashQuery(false, null), { kind: "absent" })
    assert.deepEqual(parseQbittorrentHashQuery(true, ""), { kind: "empty" })
    assert.deepEqual(parseQbittorrentHashSelection("ALL"), { kind: "all" })
    assert.deepEqual(parseQbittorrentHashSelection("not-a-hash"), {
      kind: "invalid",
    })
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

  it("returns null selection for mutation no-ops", () => {
    assert.equal(selectionFromParsedHashes({ kind: "absent" }), null)
    assert.equal(selectionFromParsedHashes({ kind: "empty" }), null)
    assert.equal(selectionFromParsedHashes({ kind: "invalid" }), null)
    assert.equal(selectionFromParsedHashes({ kind: "all" }), "all")
  })

  it("filters info results by hash selection semantics", () => {
    assert.equal(hashSelectionMatchesFile({ kind: "absent" }, SAMPLE), true)
    assert.equal(hashSelectionMatchesFile({ kind: "invalid" }, SAMPLE), false)
    assert.equal(hashSelectionMatchesFile({ kind: "empty" }, SAMPLE), false)
    assert.equal(
      hashSelectionMatchesFile({ kind: "hashes", hashes: [SAMPLE] }, SAMPLE),
      true
    )
    assert.equal(
      hashSelectionMatchesFile({ kind: "hashes", hashes: [UNKNOWN] }, SAMPLE),
      false
    )
  })

  it("parses torrent hashes from multipart form data", () => {
    const absent = new FormData()
    assert.deepEqual(parseTorrentHashesFromFormData(absent), { kind: "absent" })

    const empty = new FormData()
    empty.set("hashes", "")
    assert.deepEqual(parseTorrentHashesFromFormData(empty), { kind: "empty" })

    const valid = new FormData()
    valid.set("hashes", `${SAMPLE.toLowerCase()}00000000`)
    const parsedValid = parseTorrentHashesFromFormData(valid)
    assert.equal(parsedValid.kind, "hashes")
    if (parsedValid.kind === "hashes") {
      assert.deepEqual(parsedValid.hashes, [SAMPLE])
    }

    const all = new FormData()
    all.set("hashes", "all")
    assert.deepEqual(parseTorrentHashesFromFormData(all), { kind: "all" })

    const malformed = new FormData()
    malformed.set("hashes", "not-a-hash")
    assert.deepEqual(parseTorrentHashesFromFormData(malformed), {
      kind: "invalid",
    })

    const file = new FormData()
    file.set(
      "hashes",
      new File(["ignored"], "hashes.txt", { type: "text/plain" })
    )
    assert.deepEqual(parseTorrentHashesFromFormData(file), { kind: "invalid" })
    assert.equal(
      selectionFromParsedHashes(parseTorrentHashesFromFormData(file)),
      null
    )
  })

  describe("compatibilityHashToInternalEd2kHash", () => {
    it("resolves the reproduced LazyLibrarian base32 mapping", () => {
      assert.equal(
        compatibilityHashToInternalEd2kHash(REPRODUCED_BASE32),
        REPRODUCED_INTERNAL
      )
      assert.equal(
        internalToExternalQbittorrentHash(REPRODUCED_INTERNAL),
        REPRODUCED_EXTERNAL
      )
      assert.equal(
        compatibilityHashToInternalEd2kHash(REPRODUCED_EXTERNAL),
        REPRODUCED_INTERNAL
      )
    })

    it("accepts uppercase and lowercase base32 with surrounding whitespace", () => {
      assert.equal(
        compatibilityHashToInternalEd2kHash(
          `  ${REPRODUCED_BASE32.toLowerCase()}  `
        ),
        REPRODUCED_INTERNAL
      )
    })

    it("deduplicates equivalent internal, external and base32 forms", () => {
      const parsed = parseQbittorrentHashSelection(
        `${REPRODUCED_INTERNAL}|${REPRODUCED_EXTERNAL}|${REPRODUCED_BASE32}`
      )
      assert.equal(parsed.kind, "hashes")
      if (parsed.kind === "hashes") {
        assert.deepEqual(parsed.hashes, [REPRODUCED_INTERNAL])
      }
    })

    it("matches files when selection uses base32 hashes", () => {
      const parsed = parseQbittorrentHashSelection(
        REPRODUCED_BASE32.toLowerCase()
      )
      assert.equal(hashSelectionMatchesFile(parsed, REPRODUCED_INTERNAL), true)
    })

    it("rejects malformed base32 characters", () => {
      assert.equal(
        compatibilityHashToInternalEd2kHash("3ZXWM66ZHIOH7FHJZXMKSJFAW4AAAAA0"),
        null
      )
    })

    it("rejects incorrect base32 length", () => {
      assert.equal(
        compatibilityHashToInternalEd2kHash("3ZXWM66ZHIOH7FHJZXMKSJFAW4AAAAA"),
        null
      )
      assert.equal(
        compatibilityHashToInternalEd2kHash(`${REPRODUCED_BASE32}AA`),
        null
      )
    })

    it("rejects arbitrary BitTorrent base32 BTIH with non-zero final four bytes", () => {
      const arbitrary = Buffer.alloc(20, 0)
      arbitrary.writeUInt32BE(0x01020304, 16)
      const encoded = base32.encode(arbitrary)
      assert.equal(compatibilityHashToInternalEd2kHash(encoded), null)
    })

    it("rejects invalid 40-character hexadecimal suffix", () => {
      assert.equal(
        compatibilityHashToInternalEd2kHash(
          "de6f667bd93a1c7f94e9cdd8a924a0b7ffffffff"
        ),
        null
      )
    })

    it("rejects random unsupported values", () => {
      assert.equal(compatibilityHashToInternalEd2kHash("not-a-hash"), null)
      assert.equal(compatibilityHashToInternalEd2kHash(""), null)
    })

    it("accepts synthetic base32 built from internal hashes", () => {
      const encoded = buildSyntheticBase32FromInternal(SAMPLE)
      assert.equal(compatibilityHashToInternalEd2kHash(encoded), SAMPLE)
      assert.equal(
        compatibilityHashToInternalEd2kHash(encoded.toLowerCase()),
        SAMPLE
      )
    })
  })
})
