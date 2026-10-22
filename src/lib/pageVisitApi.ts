// R12 체류시간 추적 — 실패해도 참여자 경험은 전혀 막지 않는다(best-effort, 전부 조용히 무시).

export async function createPageVisit(page: 'main' | 'result'): Promise<string | null> {
  try {
    const res = await fetch('/api/page-visits', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ page }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { id: string }
    return data.id
  } catch {
    return null
  }
}

export function sendExitBeacon(id: string): void {
  const body = JSON.stringify({ lastSeenAt: new Date().toISOString() })
  // sendBeacon은 POST만 지원해서 탭 숨김/종료 시점에도 안정적으로 전송된다.
  navigator.sendBeacon?.(`/api/page-visits/${id}/exit`, new Blob([body], { type: 'application/json' }))
}

export async function markPageVisitCompleted(id: string, submissionId?: string): Promise<void> {
  try {
    await fetch(`/api/page-visits/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ completed: true, submissionId }),
    })
  } catch {
    // best-effort
  }
}
