import type { Config, Context } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import { requireAdminSession } from './_shared/auth.ts'
import type { Submission } from './_shared/types.ts'

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })
}

async function listSubmissions(): Promise<Response> {
  const store = getStore('submissions')
  const { blobs } = await store.list()
  const items = await Promise.all(
    blobs.map((b) => store.get(b.key, { type: 'json' }) as Promise<Submission | null>),
  )
  const submissions = items.filter((s): s is Submission => s !== null).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return json({ submissions })
}

async function getSubmission(id: string): Promise<Response> {
  const submission = (await getStore('submissions').get(id, { type: 'json' }).catch(() => null)) as Submission | null
  if (!submission) return json({ error: 'not found' }, 404)
  return json({ submission })
}

async function updateSubmission(req: Request, id: string): Promise<Response> {
  let body: { selectedTalismanId?: string | null; memo?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }

  const store = getStore('submissions')
  const submission = (await store.get(id, { type: 'json' }).catch(() => null)) as Submission | null
  if (!submission) return json({ error: 'not found' }, 404)

  // PRD §3.11 (2) — 부적 변경은 "선택만 교체"(문구 편집 아님), 운영자 변경으로 표시
  if (body.selectedTalismanId !== undefined) {
    if (body.selectedTalismanId !== null && !submission.talismanIds.includes(body.selectedTalismanId)) {
      return json({ error: 'talismanId not in recommended set' }, 400)
    }
    submission.selectedTalismanId = body.selectedTalismanId
    submission.selectedBy = body.selectedTalismanId ? 'admin' : null
    submission.selectedAt = body.selectedTalismanId ? new Date().toISOString() : null
  }

  // PRD §3.11 (5) — 메모
  if (typeof body.memo === 'string') {
    submission.memo = body.memo
    submission.memoUpdatedAt = new Date().toISOString()
  }

  await store.setJSON(id, submission)
  return json({ submission })
}

export default async (req: Request, context: Context): Promise<Response> => {
  if (!(await requireAdminSession(req))) return json({ error: 'unauthorized' }, 401)

  const id = context.params.id

  if (req.method === 'GET' && !id) return listSubmissions()
  if (req.method === 'GET' && id) return getSubmission(id)
  if (req.method === 'PATCH' && id) return updateSubmission(req, id)

  return json({ error: 'method not allowed' }, 405)
}

export const config: Config = {
  path: ['/api/admin/submissions', '/api/admin/submissions/:id'],
}
