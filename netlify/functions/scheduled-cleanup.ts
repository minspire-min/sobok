import type { Config } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import type { PageVisit, Submission } from './_shared/types.ts'

const RETENTION_MS = 15 * 24 * 60 * 60 * 1000 // PRD §3.12/§4.1 — 접수 후 15일

// PRD §4.1 ⑨ — 매일 돌면서 15일 지난 기록을 전부 삭제한다. 풀이·메모 포함 통째로.
// 체류시간 추적 기록(page-visits)도 submissionId로 참여자와 연결되는 데이터라 같은 보관기간을 적용한다.
export default async (): Promise<Response> => {
  const now = Date.now()

  const submissionsStore = getStore('submissions')
  const { blobs: submissionBlobs } = await submissionsStore.list()
  let deletedSubmissions = 0
  for (const b of submissionBlobs) {
    const submission = (await submissionsStore.get(b.key, { type: 'json' }).catch(() => null)) as Submission | null
    if (!submission) continue
    if (now - new Date(submission.createdAt).getTime() > RETENTION_MS) {
      await submissionsStore.delete(b.key)
      deletedSubmissions++
    }
  }

  const visitsStore = getStore('page-visits')
  const { blobs: visitBlobs } = await visitsStore.list()
  let deletedVisits = 0
  for (const b of visitBlobs) {
    const visit = (await visitsStore.get(b.key, { type: 'json' }).catch(() => null)) as PageVisit | null
    if (!visit) continue
    if (now - new Date(visit.enteredAt).getTime() > RETENTION_MS) {
      await visitsStore.delete(b.key)
      deletedVisits++
    }
  }

  return new Response(JSON.stringify({ deletedSubmissions, deletedVisits }), { status: 200, headers: { 'content-type': 'application/json' } })
}

export const config: Config = {
  schedule: '@daily',
}
