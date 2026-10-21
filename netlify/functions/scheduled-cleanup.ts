import type { Config } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import type { Submission } from './_shared/types.ts'

const RETENTION_MS = 15 * 24 * 60 * 60 * 1000 // PRD §3.12/§4.1 — 접수 후 15일

// PRD §4.1 ⑨ — 매일 돌면서 15일 지난 기록을 전부 삭제한다. 풀이·메모 포함 통째로.
export default async (): Promise<Response> => {
  const store = getStore('submissions')
  const { blobs } = await store.list()
  const now = Date.now()
  let deleted = 0

  for (const b of blobs) {
    const submission = (await store.get(b.key, { type: 'json' }).catch(() => null)) as Submission | null
    if (!submission) continue
    if (now - new Date(submission.createdAt).getTime() > RETENTION_MS) {
      await store.delete(b.key)
      deleted++
    }
  }

  return new Response(JSON.stringify({ deleted }), { status: 200, headers: { 'content-type': 'application/json' } })
}

export const config: Config = {
  schedule: '@daily',
}
