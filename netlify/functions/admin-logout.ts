import type { Config } from '@netlify/functions'
import { destroySession, parseCookie, SESSION_COOKIE } from './_shared/auth.ts'

export default async (req: Request): Promise<Response> => {
  const token = parseCookie(req.headers.get('cookie'), SESSION_COOKIE)
  const cookie = await destroySession(token)
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json', 'set-cookie': cookie } })
}

export const config: Config = {
  path: '/api/admin/logout',
}
