import { useEffect, useRef } from 'react'
import { createPageVisit, markPageVisitCompleted, sendExitBeacon } from './pageVisitApi'

// 메인/결과 화면이 공통으로 쓰는 체류시간 추적 — 마운트 시 진입 기록을 만들고, 탭이
// 숨겨지는 순간(앱 전환·화면 끄기·창 닫기 등)을 이탈 시점 근사치로 beacon 전송한다.
export function usePageVisitTracking(page: 'main' | 'result') {
  const visitIdRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    createPageVisit(page).then((id) => {
      if (!cancelled) visitIdRef.current = id
    })

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden' && visitIdRef.current) {
        sendExitBeacon(visitIdRef.current)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function markCompleted(submissionId?: string) {
    if (visitIdRef.current) void markPageVisitCompleted(visitIdRef.current, submissionId)
  }

  return { markCompleted }
}
