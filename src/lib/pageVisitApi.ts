import { isTestMode } from './testMode'

// R12 체류시간 추적 — 실패해도 참여자 경험은 전혀 막지 않는다(best-effort, 전부 조용히 무시).

// id를 미리 만들어 매 시도마다 같은 값으로 보낸다 — submissionApi.ts의 createSubmission과
// 같은 이유(POST 재시도로 인한 중복 생성 방지, 서버의 멱등 처리는 page-visits.ts 참고).
export async function createPageVisit(page: 'main' | 'result'): Promise<string | null> {
  const id = crypto.randomUUID()
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch('/api/page-visits', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ page, id, isTest: isTestMode() }),
      })
      if (res.ok) return id
    } catch {
      // 재시도
    }
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 500))
  }
  return null
}

export function sendExitBeacon(id: string): void {
  const body = JSON.stringify({ lastSeenAt: new Date().toISOString() })
  // sendBeacon은 POST만 지원해서 탭 숨김/종료 시점에도 안정적으로 전송된다.
  navigator.sendBeacon?.(`/api/page-visits/${id}/exit`, new Blob([body], { type: 'application/json' }))
}

// 이 요청이 조용히 한 번 실패하면 관리자 통계의 체류시간 퍼널 "완료" 수치가 그대로
// 누락된다(행사장 네트워크 혼잡 때 실제로 발생). 최대 3번, 짧은 대기를 두고 재시도한다.
export async function markPageVisitCompleted(id: string, submissionId?: string): Promise<void> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`/api/page-visits/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ completed: true, submissionId }),
      })
      if (res.ok) return
    } catch {
      // 재시도
    }
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 500))
  }
}
