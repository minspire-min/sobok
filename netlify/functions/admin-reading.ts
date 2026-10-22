import type { Config, Context } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import { CATEGORIES } from '../../src/lib/categories.ts'
import { computeSaju } from '../../src/lib/sajuPipeline.ts'
import { requireAdminSession } from './_shared/auth.ts'
import type { Submission } from './_shared/types.ts'

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })
}

// Sonnet 5.5는 실존하지 않는 모델명이라(최신은 Sonnet 5) PRD의 가정과 달리 실제 모델 ID로 맞춘다.
const READING_MODEL = 'claude-sonnet-5'

const SYSTEM_PROMPT = `당신은 사주 명리학을 쉬운 말로 설명하는 조력자입니다. 아래 규칙을 반드시 지키세요.
- 주어진 사주 계산 결과(오행·십신·신살)에서 벗어난 내용을 지어내지 않는다.
- 특정 사건·시기·수치를 단정하지 않는다("~할 것이다", "몇 년에 ~" 금지).
- 질병·사고·죽음 등 불길한 단정 표현을 쓰지 않는다.
- 미래를 예언하지 않고 "타고난 성향"으로만 서술한다.
- 존댓말로, 따뜻하고 담백한 톤으로 쓴다.
- 반드시 아래 5개 항목을 순서대로, 각 항목 제목 없이 줄바꿈으로만 구분해 출력한다.
  1) 어떤 사주인가 (1줄)
  2) 사주의 특징 — 오행 분포·십신 근거 (2~3문장)
  3) 밀고 나가야 할 것 — 장점 (2~3문장)
  4) 밀고 나가야 할 것 — 단점(보완점), 장점의 다른 면으로 서술 (2~3문장)
  5) 타고난 기질로 볼 때 잘 맞는 삶의 방향 — 단정·예언 금지, 성향 근거로만 서술 (정확히 2문장)`

function buildUserPrompt(submission: Submission): string {
  const computation = computeSaju({
    nickname: '참여자',
    gender: submission.gender,
    calendarType: submission.calendarType,
    isLeapMonth: submission.isLeapMonth,
    year: submission.year,
    month: submission.month,
    day: submission.day,
    hour: submission.hour,
    minute: submission.minute,
    timeUnknown: submission.timeUnknown,
    category: submission.category,
    consent: true,
  })
  const { result, timeUnknown } = computation
  const pillars: Array<'hour' | 'day' | 'month' | 'year'> = timeUnknown ? ['day', 'month', 'year'] : ['hour', 'day', 'month', 'year']
  const pillarLabel = { hour: '시주', day: '일주', month: '월주', year: '연주' } as const

  const pillarLines = pillars
    .map((key) => {
      const d = result.pillarDetails[key]
      const sals = [result.sals[key].twelveSal, ...result.sals[key].specialSals].join(', ')
      return `${pillarLabel[key]}: ${d.stem}${d.branch}(${d.stemKo}${d.branchKo}) · 십신 ${result.tenGods[key].stem}/${result.tenGods[key].branch} · 신살 ${sals}`
    })
    .join('\n')

  const fiveElementsLine = Object.entries(result.fiveElements)
    .map(([el, count]) => `${el} ${count}`)
    .join(', ')

  const categoryLabel = CATEGORIES.find((c) => c.key === submission.category)?.label ?? submission.category

  return `[사주 계산 결과]
${pillarLines}
오행 분포: ${fiveElementsLine}${timeUnknown ? ' (시간 미상 — 6글자 기준)' : ''}
일간: ${result.pillarDetails.day.stem}(${result.pillarDetails.day.stemKo})
부족한 오행: ${submission.lackingElement}
참여자가 고른 고민 카테고리: ${categoryLabel}

위 사주 계산 결과만 근거로 간단 풀이를 작성해 주세요.`
}

async function generateReading(submission: Submission): Promise<{ text: string } | { error: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { error: 'ANTHROPIC_API_KEY not configured' }

  let res: Response
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: READING_MODEL,
        // 768이었다가 5개 항목 풀이가 길어지면 중간에 잘리는 문제가 있어 여유있게 올림.
        max_tokens: 1536,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildUserPrompt(submission) }],
      }),
      // Netlify Functions 기본 실행 제한(약 10~26초) 안에서 명확히 실패하도록, 애매하게
      // 오래 매달리는 대신 20초에서 끊는다 — 원인 파악 안 되는 "그냥 에러남" 대신
      // 로그에 사유가 남도록.
      signal: AbortSignal.timeout(20000),
    })
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e)
    console.error(`[admin-reading] fetch failed: ${reason}`)
    return { error: `요청 실패: ${reason}` }
  }

  if (!res.ok) {
    const bodyText = (await res.text().catch(() => '')).slice(0, 500)
    console.error(`[admin-reading] anthropic api error ${res.status}: ${bodyText}`)
    return { error: `anthropic api error: ${res.status}` }
  }
  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>
    stop_reason?: string
    type?: string
    error?: { type?: string; message?: string }
  }
  const text = data.content?.find((c) => c.type === 'text')?.text
  if (text && data.stop_reason === 'max_tokens') {
    console.error(`[admin-reading] truncated by max_tokens, length=${text.length}`)
  }
  if (!text) {
    // console.error를 여러 인자로 쪼개서 넘기면 Netlify 로그 파이프라인에서 메시지가
    // 통째로 비어 보이는 문제가 있어(실제 확인됨) 문자열 하나로 합쳐서 남긴다.
    const blockTypes = (data.content ?? []).map((c) => c.type).join(',')
    console.error(
      `[admin-reading] empty response | type=${data.type} stop_reason=${data.stop_reason} blocks=[${blockTypes}] apiError=${data.error?.type}:${data.error?.message}`,
    )
    return { error: `empty response (stop_reason=${data.stop_reason ?? 'unknown'})` }
  }
  return { text }
}

export default async (req: Request, context: Context): Promise<Response> => {
  if (!(await requireAdminSession(req))) return json({ error: 'unauthorized' }, 401)
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const id = context.params.id
  if (!id) return json({ error: 'missing id' }, 400)

  const store = getStore('submissions')
  const submission = (await store.get(id, { type: 'json' }).catch(() => null)) as Submission | null
  if (!submission) return json({ error: 'not found' }, 404)

  // PRD §3.11 (4) — 처음 열 때 1회만 생성하고 이후 저장본 사용. [다시 생성] 없음.
  if (submission.reading) return json({ submission })

  const outcome = await generateReading(submission)
  if ('error' in outcome) {
    submission.readingFailedAt = new Date().toISOString()
    await store.setJSON(id, submission)
    return json({ error: outcome.error }, 502)
  }

  submission.reading = outcome.text
  submission.readingModel = READING_MODEL
  submission.readingFailedAt = null
  await store.setJSON(id, submission)
  return json({ submission })
}

export const config: Config = {
  path: '/api/admin/submissions/:id/reading',
}
