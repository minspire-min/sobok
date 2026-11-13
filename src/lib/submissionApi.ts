import { isTestMode } from './testMode'
import type { SajuFormInput } from './types'

// R12 — 참여자 화면을 서버(netlify/functions/submissions.ts)에 연결한다. 행사 당일 네트워크
// 문제로 서버 기록이 실패해도 참여자 결과 확인 자체는 막지 않아야 해서, 실패 시 null/false로
// 조용히 넘기고 화면 흐름은 그대로 진행한다(localStorage 기반 UI가 그대로 백업 역할을 함).

export type CreateSubmissionResponse = { id: string; talismanIds: [string, string, string] }

// POST는 PATCH와 달리 재시도하면 매번 새 레코드가 생길 수 있어, id를 미리 만들어 매 시도마다
// 같은 값으로 보낸다 — 서버가 응답을 못 받았을 뿐 실제로는 저장에 성공했어도 같은 id로 재시도하면
// 중복 생성 없이 그 레코드를 그대로 돌려받는다(서버의 멱등 처리, submissions.ts 참고).
export async function createSubmission(input: SajuFormInput): Promise<CreateSubmissionResponse | null> {
  const id = crypto.randomUUID()
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...input, id, isTest: isTestMode() }),
      })
      if (res.ok) return (await res.json()) as CreateSubmissionResponse
    } catch {
      // 재시도
    }
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 500))
  }
  return null
}

// 이 요청이 조용히 한 번 실패하면 관리자 통계의 "확인 수"가 그대로 누락된다(행사장
// 네트워크 혼잡 때 실제로 발생). 최대 3번, 짧은 대기를 두고 재시도한다.
export async function updateSubmissionSelection(id: string, talismanId: string | null): Promise<boolean> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`/api/submissions/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ talismanId }),
      })
      if (res.ok) return true
    } catch {
      // 재시도
    }
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 500))
  }
  return false
}
