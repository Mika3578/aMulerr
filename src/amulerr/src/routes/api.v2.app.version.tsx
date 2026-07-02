
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/v2/app/version')({
  server: {
    handlers: {
      GET: async () => {
        return new Response(`v4.6.7`, {
          status: 200,
          headers: {
            "Content-Type": "text/plain",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "public, max-age=0",
          },
        })
      }
    }
  },
})
