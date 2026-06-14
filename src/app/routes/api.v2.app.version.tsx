import { LoaderFunction } from "@remix-run/node"

export const loader = (() =>
  new Response(`v4.5.5`, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=0",
    },
  })) satisfies LoaderFunction
