import type { PillarKey, SajuResult } from 'ssaju'
import type { CategoryKey } from './categories.ts'
import { ELEMENT_ORDER } from './elements.ts'

export type Element = (typeof ELEMENT_ORDER)[number]
type Row = 'stem' | 'branch'

const PILLAR_ORDER: PillarKey[] = ['hour', 'day', 'month', 'year']

// PRD v2 §3.6 점수표 — 8칸, 합계 100점 (시간 미상 시 시주 제외 75점)
const POINTS: Record<Row, Record<PillarKey, number>> = {
  stem: { hour: 10, day: 10, month: 10, year: 10 },
  branch: { hour: 15, day: 15, month: 20, year: 10 },
}

type Cell = { row: Row; pillar: PillarKey; element: Element; points: number }

// 같은 기둥의 천간↔지지(위·아래), 이웃 기둥의 같은 줄(왼쪽·오른쪽)로 이어진 같은 오행을
// 하나의 덩어리로 묶어 합계×1.3, 떨어진 칸은 그대로 더한다 (§3.6 "연속 가중치" 규칙).
export function computeElementScores(result: SajuResult, timeUnknown: boolean): Record<Element, number> {
  const pillars = timeUnknown ? PILLAR_ORDER.filter((p) => p !== 'hour') : PILLAR_ORDER
  const cells = new Map<string, Cell>()
  for (const pillar of pillars) {
    for (const row of ['stem', 'branch'] as const) {
      const key = `${row}-${pillar}`
      const element = result.pillarDetails[pillar].element[row] as Element
      cells.set(key, { row, pillar, element, points: POINTS[row][pillar] })
    }
  }

  function neighborsOf(key: string): string[] {
    const cell = cells.get(key)!
    const idx = pillars.indexOf(cell.pillar)
    const keys: string[] = []
    const vertical = `${cell.row === 'stem' ? 'branch' : 'stem'}-${cell.pillar}`
    keys.push(vertical)
    if (idx > 0) keys.push(`${cell.row}-${pillars[idx - 1]}`)
    if (idx < pillars.length - 1) keys.push(`${cell.row}-${pillars[idx + 1]}`)
    return keys
  }

  const visited = new Set<string>()
  const scores = Object.fromEntries(ELEMENT_ORDER.map((el) => [el, 0])) as Record<Element, number>

  for (const key of cells.keys()) {
    if (visited.has(key)) continue
    const start = cells.get(key)!
    const component: Cell[] = []
    const stack = [key]
    visited.add(key)
    while (stack.length) {
      const cur = stack.pop()!
      const cell = cells.get(cur)!
      component.push(cell)
      for (const n of neighborsOf(cur)) {
        const neighbor = cells.get(n)
        if (neighbor && !visited.has(n) && neighbor.element === start.element) {
          visited.add(n)
          stack.push(n)
        }
      }
    }
    const sum = component.reduce((acc, c) => acc + c.points, 0)
    const value = component.length >= 2 ? sum * 1.3 : sum
    scores[start.element] += Math.round(value * 10) / 10
  }

  return scores
}

// §3.6 동점 처리 — 일간 오행과의 십신 관계(재성/관성/인성/식상/비겁)로 카테고리별 연관 오행을 구한다.
const GENERATES: Record<Element, Element> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }
const OVERCOMES: Record<Element, Element> = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' }
const GENERATED_BY: Record<Element, Element> = { 화: '목', 토: '화', 금: '토', 수: '금', 목: '수' }
const OVERCOME_BY: Record<Element, Element> = { 토: '목', 수: '토', 화: '수', 금: '화', 목: '금' }

type Relation = '비겁' | '식상' | '재성' | '관성' | '인성'

function relatedElement(dayElement: Element, relation: Relation): Element {
  if (relation === '비겁') return dayElement
  if (relation === '식상') return GENERATES[dayElement]
  if (relation === '재성') return OVERCOMES[dayElement]
  if (relation === '관성') return OVERCOME_BY[dayElement]
  return GENERATED_BY[dayElement]
}

// 연애/결혼은 성별에 따라 관계가 달라진다 (§3.6). 나머지 카테고리는 고정.
function categoryRelation(category: CategoryKey, gender: '남' | '여'): Relation | null {
  switch (category) {
    case 'money':
      return '재성'
    case 'career':
    case 'job':
      return '관성'
    case 'relation':
      return '비겁'
    case 'mind':
      return '인성'
    case 'love':
      return gender === '여' ? '관성' : '재성'
    case 'health':
    case 'family':
      return null
  }
}

// 오행 분포 막대그래프용 — 글자 개수 그대로(가중치 없음). PRD §3.6 "오행 분포 막대는 개수 기준".
// ssaju가 반환하는 result.fiveElements는 시간 미상이어도 시(時)=00:00을 진짜 시각처럼 계산해
// 가짜 시주를 끼워 넣는다 — computeElementScores와 똑같이 시주를 직접 제외해 다시 센다.
export function computeFiveElementCounts(result: SajuResult, timeUnknown: boolean): Record<Element, number> {
  const pillars = timeUnknown ? PILLAR_ORDER.filter((p) => p !== 'hour') : PILLAR_ORDER
  const counts = Object.fromEntries(ELEMENT_ORDER.map((el) => [el, 0])) as Record<Element, number>
  for (const pillar of pillars) {
    const detail = result.pillarDetails[pillar]
    counts[detail.element.stem as Element]++
    counts[detail.element.branch as Element]++
  }
  return counts
}

export type LackingResult = {
  element: Element
  reason: 'lowest' | 'category' | 'random'
  tiedElements: Element[]
}

// ③에서 Math.random() 대신 쓰는 결정론적 선택 — 같은 입력(점수·카테고리·일간·성별)이면
// 클라이언트/서버/재방문 어디서 계산해도 항상 같은 결과가 나오게 한다(djb2 해시).
function hashIndex(seed: string, modulo: number): number {
  let hash = 5381
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 33 + seed.charCodeAt(i)) >>> 0
  }
  return hash % modulo
}

// 판정 순서(§3.6): ① 최저 1개면 그대로 ② 동점+카테고리 연관 오행이 그 안에 있으면 그 오행
// ③ 동점+연관 없음(또는 연관 없는 카테고리)이면 동점 중 랜덤
export function determineLackingElement(
  scores: Record<Element, number>,
  category: CategoryKey,
  dayElement: Element,
  gender: '남' | '여',
): LackingResult {
  const min = Math.min(...ELEMENT_ORDER.map((el) => scores[el]))
  const tiedElements = ELEMENT_ORDER.filter((el) => scores[el] === min)

  if (tiedElements.length === 1) {
    return { element: tiedElements[0], reason: 'lowest', tiedElements }
  }

  const relation = categoryRelation(category, gender)
  if (relation) {
    const related = relatedElement(dayElement, relation)
    if (tiedElements.includes(related)) {
      return { element: related, reason: 'category', tiedElements }
    }
  }

  const seed = `${category}-${gender}-${dayElement}-${ELEMENT_ORDER.map((el) => scores[el]).join(',')}`
  const picked = tiedElements[hashIndex(seed, tiedElements.length)]
  return { element: picked, reason: 'random', tiedElements }
}
