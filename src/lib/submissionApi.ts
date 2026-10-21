import type { SajuFormInput } from './types'

// R12 — 참여자 화면을 서버(netlify/functions/submissions.ts)에 연결한다. 행사 당일 네트워크
// 문제로 서버 기록이 실패해도 참여자 결과 확인 자체는 막지 않아야 해서, 실패 시 null/false로
// 조용히 넘기고 화면 흐름은 그대로 진행한다(localStorage 기반 UI가 그대로 백업 역할을 함).

export type CreateSubmissionResponse = { id: string; talismanIds: [string, string, string] }

export async function createSubmission(input: SajuFormInput): Promise<CreateSubmissionResponse | null> {
  try {
    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) return null
    return (await res.json()) as CreateSubmissionResponse
  } catch {
    return null
  }
}

export async function updateSubmissionSelection(id: string, talismanId: string | null): Promise<boolean> {
  try {
    const res = await fetch(`/api/submissions/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ talismanId }),
    })
    return res.ok
  } catch {
    return false
  }
}
