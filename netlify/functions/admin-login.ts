import type { Config, Context } from '@netlify/functions'
import { checkLoginLockout, clearLoginFailures, constantTimeEqual, createSession, recordLoginFailure } from './_shared/auth.ts'

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
  // 일반 문자열 비교(!==)는 다른 글자가 나오는 순간 바로 멈춰서, 그 소요 시간 차이로 정답을
  // 한 글자씩 추측해가는 타이밍 공격에 노출된다 — constantTimeEqual로 교체.
  const idOk = typeof body.id === 'string' && constantTimeEqual(body.id, adminId)
  const passwordOk = typeof body.password === 'string' && constantTimeEqual(body.password, adminPassword)
  if (!idOk || !passwordOk) {
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
