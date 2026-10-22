import type { Config } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import { requireAdminSession } from './_shared/auth.ts'
import type { PageVisit } from './_shared/types.ts'

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })
}

export default async (req: Request): Promise<Response> => {
  if (!(await requireAdminSession(req))) return json({ error: 'unauthorized' }, 401)
  if (req.method !== 'GET') return json({ error: 'method not allowed' }, 405)

  const store = getStore('page-visits')
  const { blobs } = await store.list()
  const items = await Promise.all(blobs.map((b) => store.get(b.key, { type: 'json' }) as Promise<PageVisit | null>))
  const visits = items.filter((v): v is PageVisit => v !== null).sort((a, b) => b.enteredAt.localeCompare(a.enteredAt))
  return json({ visits })
}

export const config: Config = {
  path: '/api/admin/page-visits',
}
