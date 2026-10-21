import type { Config, Context } from '@netlify/functions'
import { checkLoginLockout, clearLoginFailures, createSession, recordLoginFailure } from './_shared/auth.ts'

function json(data: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...extraHeaders } })
}

export default async (req: Request, context: Context): Promise<Response> => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const ip = context.ip ?? 'unknown'
  const { locked } = await checkLoginLockout(ip)
  if (locked) return json({ error: '잠시 후 다시 시도해 주세요' }, 429)

  let body: { id?: unknown; password?: unknown }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }

  const adminId = process.env.ADMIN_ID
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminId || !adminPassword) return json({ error: 'server not configured' }, 500)

  // PRD §4.4 B3 — 아이디/비밀번호 중 뭐가 틀렸는지 구분해서 알려주지 않는다.
  if (body.id !== adminId || body.password !== adminPassword) {
    await recordLoginFailure(ip)
    return json({ error: '아이디 또는 비밀번호가 맞지 않아요' }, 401)
  }

  await clearLoginFailures(ip)
  const { cookie } = await createSession()
  return json({ ok: true }, 200, { 'set-cookie': cookie })
}

export const config: Config = {
  path: '/api/admin/login',
}
