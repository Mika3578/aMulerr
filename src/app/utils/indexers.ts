import { skipFalsy } from "./array"
import { logger } from "./logger"
import { readableSize } from "./math"
import { searchAndWaitForResults } from "~/data/search"
import { hasAllowedExtension } from "./torznabFeed"

export { hasAllowedExtension, itemsResponse } from "./torznabFeed"

export const fakeItem = {
  name: "FAKE",
  short_name: "FAKE",
  hash: "00000000000000000000000000000000",
  size: 1,
  sources: 1,
  present: false,
  magnetLink: "http://emulerr/fake",
  ed2kLink: "http://emulerr/fake",
}

export const emptyResponse = () => `
  <rss version="2.0" xmlns:torznab="http://torznab.com/schemas/2015/feed">
    <channel>
      <torznab:response offset="0" total="0"/>
    </channel>
  </rss>`

export async function search(q: string) {
  const searchResults = await searchAndWaitForResults(q)
  const { allowed, skipped } = searchResults.reduce(
    (prev, curr) => {
      if (hasAllowedExtension(curr.name)) {
        prev.allowed.push(curr)
      } else {
        prev.skipped.push(curr)
      }
      return prev
    },
    { allowed: [] as typeof searchResults, skipped: [] as typeof searchResults }
  )

  if (skipped.length > 0) {
    logger.debug(
      `${skipped.length} results excluded with unknown file extensions:`
    )
    skipped.forEach((r) => {
      logger.debug(`\t- ${r.name} (${readableSize(r.size)})`)
    })
  }

  return allowed
}

export function group<T>(
  arr: T[],
  operator: "AND" | "OR",
  parenthesis: boolean
) {
  arr = arr.filter(skipFalsy)

  const joined =
    operator === "OR"
      ? arr.join(` ${operator} `)
      : arr
          .sort(
            // move parenthesis to the end
            (a, b) =>
              (typeof a === "string" && a.startsWith("(") ? 1 : 0) -
              (typeof b === "string" && b.startsWith("(") ? 1 : 0)
          )
          .reduce(
            (prev, curr) =>
              prev === ""
                ? `${curr}`
                : prev.endsWith(")") ||
                    (typeof curr === "string" && curr.startsWith("("))
                  ? `${prev} AND ${curr}`
                  : `${prev} ${curr}`,
            ""
          )

  if (!parenthesis) {
    return joined
  }

  return arr.length > 1 ? `(${joined})` : `${arr[0] ?? ""}`
}
