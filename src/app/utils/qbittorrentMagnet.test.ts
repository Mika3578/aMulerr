import assert from "node:assert/strict"
import { describe, it } from "node:test"
import base32 from "hi-base32"
import {
  MagnetParseError,
  parseSyntheticMagnetLink,
} from "./qbittorrentMagnet.ts"

const HASH = "A1B2C3D4E5F6789012345678ABCDEF01"
const NAME = "Example Book.epub"
const SIZE = 12345

function buildMagnet(hash: string, name: string, size: number) {
  const hashBuffer = Buffer.from(hash, "hex")
  const base32Buffer = Buffer.alloc(20, "\0")
  hashBuffer.copy(base32Buffer)
  const base32Hash = base32.encode(base32Buffer).toUpperCase()
  return `magnet:?xt=urn:btih:${base32Hash}&dn=${encodeURIComponent(name)}&xl=${size}&tr=http://emulerr`
}

describe("qbittorrentMagnet", () => {
  it("parses synthetic eMulerr magnets", () => {
    const magnet = buildMagnet(HASH, NAME, SIZE)
    assert.deepEqual(parseSyntheticMagnetLink(magnet), {
      hash: HASH,
      name: NAME,
      size: SIZE,
    })
  })

  it("accepts reordered magnet parameters", () => {
    const magnet = buildMagnet(HASH, NAME, SIZE)
    const [, query = ""] = magnet.split("magnet:?")
    const params = new URLSearchParams(query)
    const reordered = `magnet:?dn=${params.get("dn")}&tr=http://emulerr&xl=${SIZE}&xt=${params.get("xt")}`
    assert.deepEqual(parseSyntheticMagnetLink(reordered), {
      hash: HASH,
      name: NAME,
      size: SIZE,
    })
  })

  it("accepts hexadecimal compatibility hashes", () => {
    const magnet = `magnet:?xt=urn:btih:${HASH.toLowerCase()}00000000&dn=${encodeURIComponent(NAME)}&xl=${SIZE}`
    assert.deepEqual(parseSyntheticMagnetLink(magnet), {
      hash: HASH,
      name: NAME,
      size: SIZE,
    })
  })

  it("rejects non-emulerr btih values", () => {
    const magnet = `magnet:?xt=urn:btih:${"a".repeat(40)}&dn=${encodeURIComponent(NAME)}&xl=${SIZE}`
    assert.throws(
      () => parseSyntheticMagnetLink(magnet),
      MagnetParseError
    )
  })

  it("rejects missing dn and invalid xl", () => {
    assert.throws(
      () =>
        parseSyntheticMagnetLink(
          `magnet:?xt=urn:btih:${HASH.toLowerCase()}00000000&xl=0`
        ),
      MagnetParseError
    )
  })
})
