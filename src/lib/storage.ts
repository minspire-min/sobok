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
// 새로고침해도 유지되게 한다. confirmedTalismanId는 [선택 완료]를 누른 시점의 선택을
// 저장해 둔다 — 지금 고른 것과 같으면 버튼이 비활성(완료 상태), 다르면 다시 활성화된다.
export type TalismanSelection = { talismanId: string | null; confirmedTalismanId: string | null }
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
