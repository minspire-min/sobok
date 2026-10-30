import { useEffect, useRef } from 'react'
import { createPageVisit, markPageVisitCompleted, sendExitBeacon } from './pageVisitApi'

// 메인/결과 화면이 공통으로 쓰는 체류시간 추적 — 마운트 시 진입 기록을 만들고, 탭이
// 숨겨지는 순간(앱 전환·화면 끄기·창 닫기 등)을 이탈 시점 근사치로 beacon 전송한다.
export function usePageVisitTracking(page: 'main' | 'result') {
  const visitIdRef = useRef<string | null>(null)
  // 생성 요청이 끝나기 전에 완료 처리가 먼저 호출되는 경쟁 상태(두 비동기 작업의 완료
  // 순서가 보장되지 않아 생기는 버그) 대응 — markCompleted가 이 Promise를 기다려서
  // visitIdRef가 아직 안 채워졌어도 완료 기록이 조용히 씹히지 않게 한다.
  const visitIdPromiseRef = useRef<Promise<string | null> | null>(null)

  useEffect(() => {
    visitIdPromiseRef.current = createPageVisit(page).then((id) => {
      visitIdRef.current = id
      return id
    })

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden' && visitIdRef.current) {
        sendExitBeacon(visitIdRef.current)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function markCompleted(submissionId?: string) {
    const id = visitIdRef.current ?? (await visitIdPromiseRef.current)
    if (id) void markPageVisitCompleted(id, submissionId)
  }

  return { markCompleted }
}
