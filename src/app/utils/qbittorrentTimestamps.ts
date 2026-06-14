const MS_THRESHOLD = 1_000_000_000_000

export function timestampToUnixSeconds(value: number | undefined): number {
  if (value === undefined) {
    return Math.floor(Date.now() / 1000)
  }

  if (value >= MS_THRESHOLD) {
    return Math.floor(value / 1000)
  }

  return value
}
