
import { createFileRoute } from '@tanstack/react-router'

// amulerr does not implement authentication. We still return qBittorrent's standard
// response ("Ok." + SID cookie) so that clients requiring the /api/v2/auth/login step
// (Prowlarr, Sonarr, Radarr, Medusa, ...) accept the connection.
const ok = () =>
  new Response(`Ok.`, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "X-Content-Type-Options": "nosniff",
      "Set-Cookie": "SID=amulerr; HttpOnly; SameSite=Strict; Path=/",
      "Cache-Control": "no-store",
    },
  })

export const Route = createFileRoute('/api/v2/auth/login')({
  server: {
    handlers: {
      POST: async () => ok(),
      GET: async () => ok(),
    },
  },
})
