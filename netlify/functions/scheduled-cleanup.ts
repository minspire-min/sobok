import type { Config } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import { classifyVisits } from '../../src/admin/stats.ts'
import type { AdminSubmission } from '../../src/admin/types.ts'
import type { PageVisit, Submission } from './_shared/types.ts'

const RETENTION_MS = 15 * 24 * 60 * 60 * 1000 // PRD §3.12/§4.1 — 접수 후 15일

// _shared/rateLimit.ts의 isRateLimited가 쓰는 분당 버킷 저장소들 — 버킷 키가
// "...:분단위타임스탬프" 형태라 1분만 지나도 다시 안 쓰인다. @netlify/blobs엔 TTL(자동 만료)이
// 없어서 안 지우면 영구히 쌓인다 — 1시간(버킷 수명보다 충분히 긴 여유)보다 오래된 건 전부 지운다.
// 새 rate limit을 추가하면 여기도 같이 등록해야 한다.
const RATE_LIMIT_STORES = [
  'submission-rate-limit',
  'submission-patch-rate-limit',
  'page-visit-rate-limit',
  'page-visit-complete-rate-limit',
  'page-visit-exit-rate-limit',
  'admin-reading-rate-limit',
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

// 로그인 시도 기록(10분 차단 지나도 lastAttemptAt만 보고 24시간 지나면 정리)과 세션(만료
// 시각 지난 것) — 둘 다 자동 만료가 없어 안 지우면 영구히 쌓인다.
const LOGIN_ATTEMPT_STALE_MS = 24 * 60 * 60 * 1000

async function cleanupLoginAttempts(now: number): Promise<number> {
  const store = getStore('admin-login-attempts')
  const { blobs } = await store.list()
  let deleted = 0
  for (const b of blobs) {
    const record = (await store.get(b.key, { type: 'json' }).catch(() => null)) as { lastAttemptAt?: number } | null
    if (!record || !record.lastAttemptAt || now - record.lastAttemptAt > LOGIN_ATTEMPT_STALE_MS) {
      await store.delete(b.key)
      deleted++
    }
  }
  return deleted
}

async function cleanupSessions(now: number): Promise<number> {
  const store = getStore('admin-sessions')
  const { blobs } = await store.list()
  let deleted = 0
  for (const b of blobs) {
    const record = (await store.get(b.key, { type: 'json' }).catch(() => null)) as { expiresAt?: number } | null
    if (!record || !record.expiresAt || record.expiresAt < now) {
      await store.delete(b.key)
      deleted++
    }
  }
  return deleted
}

// 15일 경과 레코드에서 개인정보를 파기할 때 남겨야 하는 집계 지표 필드 — 나머지(식별정보)는 비운다.
// 통계(StatsUsersPage)가 쓰는 값: createdAt(기간 버킷)·category/subcategory(카테고리 분포)·
// gender(성별)·year(연령대)·selectedTalismanId(확인 수)·element* / lacking*(부적 집계).
function anonymizeSubmission(s: Submission, nowIso: string, visitType: AdminSubmission['visitType']): Submission {
  return {
    ...s,
    // 개인 식별 정보 파기
    nickname: '',
    consentAt: '',
    month: 0,
    day: 0,
    hour: 0,
    minute: 0,
    reading: null,
    readingModel: null,
    readingFailedAt: null,
    memo: '',
    memoUpdatedAt: null,
    aiTalisman: null,
    // 집계/감사용으로 남기는 값 — year·gender·category·subcategory·elementScores·selectedTalismanId은 ...s로 유지
    anonymizedAt: nowIso,
    visitType,
  }
}

// PRD §3.12/§4.1 ⑨ — 매일 돌면서 15일 지난 기록의 "개인정보만" 파기하고 집계 지표는 남긴다(GA처럼
// 집계는 영구 보존, 개인정보는 비식별화). 삭제가 아니라 익명화하는 이유: 통계 화면이 submissions/
// page-visits를 집계 소스로 쓰기 때문에, 통째로 지우면 지표까지 사라진다(실제로 10월 데이터가 이렇게 유실됨).
// rate-limit/로그인 시도/세션은 지표가 아니므로 기존대로 삭제한다.
// ponytail: 익명화 레코드를 영구 보존 → 블롭이 무한 증가(행사 규모 50명 수준이라 무시 가능,
// 커지면 월별 집계 롤업 후 원본 삭제로 전환).
export default async (): Promise<Response> => {
  const now = Date.now()
  const nowIso = new Date(now).toISOString()

  const submissionsStore = getStore('submissions')
  const { blobs: submissionBlobs } = await submissionsStore.list()
  const allSubs = (
    await Promise.all(submissionBlobs.map((b) => submissionsStore.get(b.key, { type: 'json' }) as Promise<Submission | null>))
  ).filter((s): s is Submission => s !== null)

  // 첫/재방문 판정은 닉네임+생년월일이 필요하다 — 파기 전에 전체 기준으로 한 번 계산해 이번에
  // 익명화할 레코드의 값을 동결한다(이후엔 재계산 불가). 서버 Submission은 AdminSubmission과 구조가
  // 같아 집계 함수를 그대로 재사용한다.
  // ponytail: 15일 경계를 서로 다른 날 넘는 동일인 재방문은 '첫방문'으로 오분류될 수 있음(행사 특성상 드묾).
  const visitTypeById = classifyVisits(allSubs as unknown as AdminSubmission[])

  let anonymizedSubmissions = 0
  for (const s of allSubs) {
    if (s.anonymizedAt) continue // 이미 파기됨 — 멱등
    if (now - new Date(s.createdAt).getTime() <= RETENTION_MS) continue
    await submissionsStore.setJSON(s.id, anonymizeSubmission(s, nowIso, visitTypeById.get(s.id) ?? 'unknown'))
    anonymizedSubmissions++
  }

  // page-visits엔 이름 같은 식별정보가 없고 방문 퍼널 지표에 필요하므로 삭제하지 않는다 —
  // 익명화된 제출과의 연결(submissionId)만 끊어 비식별화한다.
  const visitsStore = getStore('page-visits')
  const { blobs: visitBlobs } = await visitsStore.list()
  let anonymizedVisits = 0
  for (const b of visitBlobs) {
    const visit = (await visitsStore.get(b.key, { type: 'json' }).catch(() => null)) as PageVisit | null
    if (!visit) continue
    if (visit.submissionId === null) continue // 이미 끊겼거나 원래 없음 — 멱등
    if (now - new Date(visit.enteredAt).getTime() <= RETENTION_MS) continue
    await visitsStore.setJSON(b.key, { ...visit, submissionId: null })
    anonymizedVisits++
  }

  let deletedRateLimitBuckets = 0
  for (const storeName of RATE_LIMIT_STORES) {
    deletedRateLimitBuckets += await cleanupRateLimitStore(now, storeName)
  }

  const deletedLoginAttempts = await cleanupLoginAttempts(now)
  const deletedSessions = await cleanupSessions(now)

  return new Response(
    JSON.stringify({ anonymizedSubmissions, anonymizedVisits, deletedRateLimitBuckets, deletedLoginAttempts, deletedSessions }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
}

export const config: Config = {
  schedule: '@daily',
}
