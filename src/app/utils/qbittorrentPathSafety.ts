import { posix } from "node:path"

export const COMPLETE_DOWNLOAD_ROOT = "/downloads/complete"
export const INCOMPLETE_DOWNLOAD_ROOT = "/downloads/incomplete"
export const SHARED_DOWNLOAD_ROOT = "/tmp/shared"

const ALLOWED_ROOTS = [
  COMPLETE_DOWNLOAD_ROOT,
  INCOMPLETE_DOWNLOAD_ROOT,
  SHARED_DOWNLOAD_ROOT,
]

export function isSafeFileName(fileName: string): boolean {
  return (
    fileName.length > 0 &&
    !fileName.includes("/") &&
    !fileName.includes("\\") &&
    !fileName.includes("..")
  )
}

export function resolveSafeFilePath(
  root: string,
  fileName: string
): string | null {
  if (!ALLOWED_ROOTS.includes(root) || !isSafeFileName(fileName)) {
    return null
  }

  const normalizedRoot = posix.resolve(root)
  const candidate = posix.resolve(normalizedRoot, fileName)

  if (candidate === normalizedRoot) {
    return null
  }

  if (!candidate.startsWith(`${normalizedRoot}/`)) {
    return null
  }

  return candidate
}
