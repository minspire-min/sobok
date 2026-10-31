import type { Config } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import type { PageVisit, Submission } from './_shared/types.ts'

const RETENTION_MS = 15 * 24 * 60 * 60 * 1000 // PRD §3.12/§4.1 — 접수 후 15일

// submissions.ts/page-visits.ts의 isRateLimited가 쓰는 분당 버킷 저장소들 — 버킷 키가
// "...:분단위타임스탬프" 형태라 1분만 지나도 다시 안 쓰인다. @netlify/blobs엔 TTL(자동 만료)이
// 없어서 안 지우면 영구히 쌓인다 — 1시간(버킷 수명보다 충분히 긴 여유)보다 오래된 건 전부 지운다.
const RATE_LIMIT_STORES = [
  'submission-rate-limit',
  'submission-patch-rate-limit',
  'page-visit-rate-limit',
  'page-visit-complete-rate-limit',
  'page-visit-exit-rate-limit',
]
const RATE_LIMIT_BUCKET_MAX_AGE_MS = 60 * 60 * 1000

async function cleanupRateLimitStore(now: number, storeName: string): Promise<number> {
  const store = getStore(storeName)
  const { blobs } = await store.list()
  let deleted = 0
  for (const b of blobs) {
    // IPv6 주소도 콜론을 포함하므로, 맨 뒤 콜론 기준으로 잘라야 분단위 버킷 값만 정확히 뽑힌다.
    const minuteBucket = Number(b.key.slice(b.key.lastIndexOf(':') + 1))
    if (!Number.isFinite(minuteBucket)) continue
    if (now - minuteBucket * 60000 > RATE_LIMIT_BUCKET_MAX_AGE_MS) {
      await store.delete(b.key)
      deleted++
    }
  }
  return deleted
}

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

  let deletedRateLimitBuckets = 0
  for (const storeName of RATE_LIMIT_STORES) {
    deletedRateLimitBuckets += await cleanupRateLimitStore(now, storeName)
  }

  return new Response(
    JSON.stringify({ deletedSubmissions, deletedVisits, deletedRateLimitBuckets }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
}

export const config: Config = {
  schedule: '@daily',
}
