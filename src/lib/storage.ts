import type { SajuFormInput } from './types'

// PRD §5.2a — AI 해석 캐시(§6.4)와는 별개. "입력 폼을 다시 채울지"를 위한 저장.
const LAST_INPUT_KEY = 'saju:lastInput'

export function loadLastInput(): SajuFormInput | null {
  const raw = localStorage.getItem(LAST_INPUT_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as SajuFormInput
  } catch {
    return null
  }
}

export function saveLastInput(input: SajuFormInput): void {
  localStorage.setItem(LAST_INPUT_KEY, JSON.stringify(input))
}

export function clearLastInput(): void {
  localStorage.removeItem(LAST_INPUT_KEY)
}

// PRD v2 §3.8 R8 — 부적 선택 상태. 서버 저장(R12) 전까지는 기기 localStorage로 대신해
// 새로고침해도 잠금이 풀리지 않게 한다. 진짜 "새로고침·어드민에서 안 바뀜"은 R12에서 완성.
export type TalismanSelection = { talismanId: string | null; confirmed: boolean }
const TALISMAN_SELECTION_KEY = 'saju:talismanSelection'

export function loadTalismanSelection(): TalismanSelection | null {
  const raw = localStorage.getItem(TALISMAN_SELECTION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as TalismanSelection
  } catch {
    return null
  }
}

export function saveTalismanSelection(selection: TalismanSelection): void {
  localStorage.setItem(TALISMAN_SELECTION_KEY, JSON.stringify(selection))
}

export function clearTalismanSelection(): void {
  localStorage.removeItem(TALISMAN_SELECTION_KEY)
}
