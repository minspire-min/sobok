import type { Config, Context } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import { CATEGORIES } from '../../src/lib/categories.ts'
import { computeElementScores, determineLackingElement } from '../../src/lib/elementScore.ts'
import { computeSaju } from '../../src/lib/sajuPipeline.ts'
import { getTalismans } from '../../src/lib/talismans.ts'
import { validateForm } from '../../src/lib/validation.ts'
import { isRateLimited } from './_shared/rateLimit.ts'
import type { Submission, SubmissionInput } from './_shared/types.ts'

const CATEGORY_KEYS = new Set(CATEGORIES.map((c) => c.key))
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })
}

// PRD v2 §4.4 C3 — 화면 검증만 믿지 않고 서버에서도 다시 검사한다.
function validateInput(body: unknown): { ok: true; id: string; input: SubmissionInput } | { ok: false; error: string } {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'invalid body' }
  const b = body as Record<string, unknown>

  // 클라이언트가 생성 시점에 만든 id — 응답을 못 받아 재시도해도 같은 id면 같은 레코드로
  // 취급해 중복 제출을 막는다(멱등 생성).
  if (typeof b.id !== 'string' || !UUID_RE.test(b.id)) return { ok: false, error: 'invalid id' }

  if (typeof b.nickname !== 'string' || !b.nickname.trim() || b.nickname.trim().length > 20) {
    return { ok: false, error: 'invalid nickname' }
  }
  if (b.gender !== '남' && b.gender !== '여') return { ok: false, error: 'invalid gender' }
  if (b.calendarType !== 'solar' && b.calendarType !== 'lunar') return { ok: false, error: 'invalid calendarType' }
  if (typeof b.isLeapMonth !== 'boolean') return { ok: false, error: 'invalid isLeapMonth' }
  if (typeof b.timeUnknown !== 'boolean') return { ok: false, error: 'invalid timeUnknown' }
  if (!Number.isInteger(b.year) || !Number.isInteger(b.month) || !Number.isInteger(b.day)) {
    return { ok: false, error: 'invalid date' }
  }
  if (!Number.isInteger(b.hour) || (b.hour as number) < 0 || (b.hour as number) > 23) return { ok: false, error: 'invalid time' }
  if (!Number.isInteger(b.minute) || (b.minute as number) < 0 || (b.minute as number) > 59) return { ok: false, error: 'invalid time' }
  if (typeof b.category !== 'string' || !CATEGORY_KEYS.has(b.category as (typeof CATEGORIES)[number]['key'])) {
    return { ok: false, error: 'invalid category' }
  }
  if (b.consent !== true) return { ok: false, error: 'consent required' }

  const nickname = b.nickname.trim()
  const errors = validateForm({
    nickname,
    year: b.year as number,
    month: b.month as number,
    day: b.day as number,
    calendarType: b.calendarType as 'solar' | 'lunar',
    isLeapMonth: b.isLeapMonth as boolean,
    hour: 0,
    minute: 0,
    timeUnknown: true,
    gender: null,
    category: null,
    consent: false,
  })
  if (errors.nickname || errors.date) return { ok: false, error: errors.nickname ?? errors.date ?? 'invalid input' }

  return {
    ok: true,
    id: b.id,
    input: {
      nickname,
      gender: b.gender,
      calendarType: b.calendarType,
      isLeapMonth: b.isLeapMonth,
      year: b.year as number,
      month: b.month as number,
      day: b.day as number,
      hour: b.hour as number,
      minute: b.minute as number,
      timeUnknown: b.timeUnknown,
      category: b.category as SubmissionInput['category'],
      consent: true,
    },
  }
}

// PRD v2 §4.4 C4 — 짧은 시간 대량 요청 차단. 50명 규모라 정밀할 필요는 없음.
// key는 호출하는 쪽이 정한다: 생성(POST)은 IP 기준(한 사람이 대량 제출하는 걸 막는 목적),
// 수정(PATCH)/이탈 beacon은 id 기준(특정 id가 유출돼 남용되는 걸 막는 목적 — 행사장 공유
// 와이파이에서 다른 사람들 때문에 내 요청이 막히면 안 되니 IP로 묶지 않는다).

async function handleCreate(req: Request, context: Context): Promise<Response> {
  const ip = context.ip ?? 'unknown'
  if (await isRateLimited(ip, 'submission-rate-limit', 10)) return json({ error: '잠시 후 다시 시도해 주세요' }, 429)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }

  const result = validateInput(body)
  if (!result.ok) return json({ error: result.error }, 400)
  const { id, input } = result

  const store = getStore('submissions')
  // 응답을 못 받아 클라이언트가 같은 id로 재시도한 경우 — 새로 계산/저장하지 않고 그대로
  // 돌려준다(POST 재시도로 인한 중복 생성 방지).
  const already = (await store.get(id, { type: 'json' }).catch(() => null)) as Submission | null
  if (already) return json({ id: already.id, talismanIds: already.talismanIds }, 201)

  // PRD "절대 원칙" — 계산은 코드가 한다. 클라이언트와 동일한 lib을 그대로 재사용.
  // SubmissionInput은 SajuFormInput과 구조가 같아(닉네임/성별/달력/시각/카테고리/동의) 그대로 넘길 수 있다.
  const computation = computeSaju(input)
  const elementScores = computeElementScores(computation.result, computation.timeUnknown)
  const dayElement = computation.result.pillarDetails.day.element.stem as keyof typeof elementScores
  const lacking = determineLackingElement(elementScores, input.category, dayElement, input.gender)
  const talismans = getTalismans(input.category, lacking.element)
  const talismanIds = talismans.map((t) => t.id) as [string, string, string]

  const now = new Date().toISOString()
  const submission: Submission = {
    id,
    createdAt: now,
    consentAt: now,
    nickname: input.nickname,
    gender: input.gender,
    calendarType: input.calendarType,
    isLeapMonth: input.isLeapMonth,
    year: input.year,
    month: input.month,
    day: input.day,
    hour: input.hour,
    minute: input.minute,
    timeUnknown: input.timeUnknown,
    category: input.category,
    elementScores,
    tiedElements: lacking.tiedElements,
    lackingElement: lacking.element,
    lackingReason: lacking.reason,
    talismanIds,
    selectedTalismanId: null,
    selectedBy: null,
    selectedAt: null,
    reading: null,
    readingModel: null,
    readingFailedAt: null,
    memo: '',
    memoUpdatedAt: null,
  }

  await store.setJSON(submission.id, submission)

  return json({ id: submission.id, talismanIds }, 201)
}

async function handleUpdateSelection(req: Request, id: string): Promise<Response> {
  // id 기준(위 isRateLimited 주석 참고) — 완료 후에도 재선택 가능해서(§3.8 R8) 같은 사람이
  // 여러 번 호출할 수 있고, 클라이언트 재시도(최대 3회)도 여기로 들어온다.
  if (await isRateLimited(id, 'submission-patch-rate-limit', 20)) return json({ error: '잠시 후 다시 시도해 주세요' }, 429)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }
  const b = body as { talismanId?: unknown; confirmed?: unknown }

  const store = getStore('submissions')
  const submission = (await store.get(id, { type: 'json' }).catch(() => null)) as Submission | null
  if (!submission) return json({ error: 'not found' }, 404)

  // PRD v2 §3.8 R8(사용자 지시로 변경) — 완료해도 다시 고를 수 있어 서버도 재선택을 막지 않는다.
  if (b.talismanId !== null && typeof b.talismanId !== 'string') return json({ error: 'invalid talismanId' }, 400)
  if (b.talismanId && !submission.talismanIds.includes(b.talismanId)) {
    return json({ error: 'talismanId not in recommended set' }, 400)
  }

  submission.selectedTalismanId = (b.talismanId as string | null) ?? null
  submission.selectedBy = submission.selectedTalismanId ? 'user' : null
  submission.selectedAt = submission.selectedTalismanId ? new Date().toISOString() : null
  await store.setJSON(id, submission)

  return json({ ok: true })
}

export default async (req: Request, context: Context): Promise<Response> => {
  const id = context.params.id

  if (req.method === 'POST' && !id) return handleCreate(req, context)
  if (req.method === 'PATCH' && id) return handleUpdateSelection(req, id)

  return json({ error: 'method not allowed' }, 405)
}

export const config: Config = {
  path: ['/api/submissions', '/api/submissions/:id'],
}
