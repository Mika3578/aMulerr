
import { createFileRoute } from '@tanstack/react-router'

const ok = () =>
  new Response(`Ok.`, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "X-Content-Type-Options": "nosniff",
      "Set-Cookie": "SID=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
      "Cache-Control": "no-store",
    },
  })

export const Route = createFileRoute('/api/v2/auth/logout')({
  server: {
    handlers: {
      POST: async () => ok(),
      GET: async () => ok(),
    },
  },
})
