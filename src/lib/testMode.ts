// 운영 사이트에서 직접 테스트할 때 생긴 방문/제출을 관리자 통계에서 빼기 위한 플래그.
// 한 번 `?test=1`로 켜두면 그 기기(localStorage)에서 만든 기록은 전부 isTest로 표시돼 집계에서 제외된다.
// 끄려면 `?test=0`. 통계에서만 빠지고, 관리자 목록에는 그대로 보인다.
const KEY = 'saju_test_mode'

export function syncTestModeFromUrl(): void {
  try {
    const p = new URLSearchParams(location.search).get('test')
    if (p === '1') localStorage.setItem(KEY, '1')
    else if (p === '0') localStorage.removeItem(KEY)
  } catch {
    // localStorage 접근 불가(프라이빗 모드 등) — 테스트 플래그는 있으면 좋은 부가기능이라 조용히 무시.
  }
}

export function isTestMode(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}
