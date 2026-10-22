import type { Config, Context } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import type { PageVisit } from './_shared/types.ts'

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })
}

// submissions.ts와 동일한 분당-IP 제한 패턴. 체류 추적은 요청이 더 잦을 수 있어 넉넉히 둔다.
async function isRateLimited(ip: string): Promise<boolean> {
  const bucket = `${ip}:${Math.floor(Date.now() / 60000)}`
  const store = getStore('page-visit-rate-limit')
  const count = ((await store.get(bucket, { type: 'json' }).catch(() => null)) as number | null) ?? 0
  if (count >= 30) return true
  await store.setJSON(bucket, count + 1)
  return false
}

async function handleCreate(req: Request, context: Context): Promise<Response> {
  const ip = context.ip ?? 'unknown'
  if (await isRateLimited(ip)) return json({ error: '잠시 후 다시 시도해 주세요' }, 429)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }
  const page = (body as { page?: unknown }).page
  if (page !== 'main' && page !== 'result') return json({ error: 'invalid page' }, 400)

  const now = new Date().toISOString()
  const visit: PageVisit = {
    id: crypto.randomUUID(),
    page,
    enteredAt: now,
    lastSeenAt: now,
    completed: false,
    completedAt: null,
    submissionId: null,
  }
  await getStore('page-visits').setJSON(visit.id, visit)
  return json({ id: visit.id }, 201)
}

// navigator.sendBeacon은 POST만 지원해서, 탭 숨김/이탈 시점 beacon은 PATCH가 아니라 이 전용
// POST 엔드포인트로 받는다.
async function handleExitBeacon(req: Request, id: string): Promise<Response> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }
  const lastSeenAt = (body as { lastSeenAt?: unknown }).lastSeenAt
  if (typeof lastSeenAt !== 'string') return json({ error: 'invalid lastSeenAt' }, 400)

  const store = getStore('page-visits')
  const visit = (await store.get(id, { type: 'json' }).catch(() => null)) as PageVisit | null
  if (!visit) return json({ error: 'not found' }, 404)

  visit.lastSeenAt = lastSeenAt
  await store.setJSON(id, visit)
  return json({ ok: true })
}

async function handleComplete(req: Request, id: string): Promise<Response> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }
  const b = body as { completed?: unknown; submissionId?: unknown }
  if (b.completed !== true) return json({ error: 'invalid body' }, 400)

  const store = getStore('page-visits')
  const visit = (await store.get(id, { type: 'json' }).catch(() => null)) as PageVisit | null
  if (!visit) return json({ error: 'not found' }, 404)

  visit.completed = true
  visit.completedAt = new Date().toISOString()
  if (typeof b.submissionId === 'string') visit.submissionId = b.submissionId
  await store.setJSON(id, visit)
  return json({ ok: true })
}

export default async (req: Request, context: Context): Promise<Response> => {
  const id = context.params.id
  const isExitBeacon = context.params.action === 'exit'

  if (req.method === 'POST' && !id) return handleCreate(req, context)
  if (req.method === 'POST' && id && isExitBeacon) return handleExitBeacon(req, id)
  if (req.method === 'PATCH' && id) return handleComplete(req, id)

  return json({ error: 'method not allowed' }, 405)
}

export const config: Config = {
  path: ['/api/page-visits', '/api/page-visits/:id', '/api/page-visits/:id/:action'],
}
