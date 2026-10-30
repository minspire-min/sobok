import type { Config, Context } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import type { PageVisit } from './_shared/types.ts'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })
}

// submissions.ts와 동일한 분당-IP 제한 패턴. 체류 추적은 요청이 더 잦을 수 있어 넉넉히 둔다.
// storeName으로 생성/완료/이탈 beacon 한도를 따로 센다 — 하나가 한도를 채워도 다른 쪽까지
// 막히지 않게.
async function isRateLimited(ip: string, storeName: string, limit: number): Promise<boolean> {
  const bucket = `${ip}:${Math.floor(Date.now() / 60000)}`
  const store = getStore(storeName)
  const count = ((await store.get(bucket, { type: 'json' }).catch(() => null)) as number | null) ?? 0
  if (count >= limit) return true
  await store.setJSON(bucket, count + 1)
  return false
}

async function handleCreate(req: Request, context: Context): Promise<Response> {
  const ip = context.ip ?? 'unknown'
  if (await isRateLimited(ip, 'page-visit-rate-limit', 30)) return json({ error: '잠시 후 다시 시도해 주세요' }, 429)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }
  const { page, id } = body as { page?: unknown; id?: unknown }
  if (page !== 'main' && page !== 'result') return json({ error: 'invalid page' }, 400)
  if (typeof id !== 'string' || !UUID_RE.test(id)) return json({ error: 'invalid id' }, 400)

  const store = getStore('page-visits')
  // submissions.ts와 동일한 이유 — 응답을 못 받아 재시도해도 같은 id면 중복 생성 없이 그대로 돌려준다.
  const already = (await store.get(id, { type: 'json' }).catch(() => null)) as PageVisit | null
  if (already) return json({ id: already.id }, 201)

  const now = new Date().toISOString()
  const visit: PageVisit = {
    id,
    page,
    enteredAt: now,
    lastSeenAt: now,
    completed: false,
    completedAt: null,
    submissionId: null,
  }
  await store.setJSON(visit.id, visit)
  return json({ id: visit.id }, 201)
}

// navigator.sendBeacon은 POST만 지원해서, 탭 숨김/이탈 시점 beacon은 PATCH가 아니라 이 전용
// POST 엔드포인트로 받는다.
async function handleExitBeacon(req: Request, id: string, context: Context): Promise<Response> {
  const ip = context.ip ?? 'unknown'
  // 탭을 왔다 갔다 할 때마다 반복 호출될 수 있어 넉넉히 둔다.
  if (await isRateLimited(ip, 'page-visit-exit-rate-limit', 60)) return json({ error: '잠시 후 다시 시도해 주세요' }, 429)

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

async function handleComplete(req: Request, id: string, context: Context): Promise<Response> {
  const ip = context.ip ?? 'unknown'
  // 클라이언트 재시도(최대 3회)가 여기로 들어온다 — 생성(30/분)보다 넉넉히 둔다.
  if (await isRateLimited(ip, 'page-visit-complete-rate-limit', 20)) return json({ error: '잠시 후 다시 시도해 주세요' }, 429)

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
  if (req.method === 'POST' && id && isExitBeacon) return handleExitBeacon(req, id, context)
  if (req.method === 'PATCH' && id) return handleComplete(req, id, context)

  return json({ error: 'method not allowed' }, 405)
}

export const config: Config = {
  path: ['/api/page-visits', '/api/page-visits/:id', '/api/page-visits/:id/:action'],
}
