import type { NextRequest } from 'next/server'

/**
 * Get the public origin from a request.
 * When behind a reverse proxy (nginx, Vercel, Cloudflare), request.url may be internal (localhost).
 * Use x-forwarded-proto + x-forwarded-host to get the real public origin (e.g. https://sihadz.com).
 */
export function getRequestOrigin(request: NextRequest): string {
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const forwardedHost = request.headers.get('x-forwarded-host')
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`
  }
  return new URL(request.url).origin
}
