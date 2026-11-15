import type { SajuResult } from 'ssaju'
import { computeElementScores, relatedElement, type Element, type Relation } from './elementScore'
import { ELEMENT_ORDER } from './elements'

// PRD §8.2 v2 — 하위 고민(40) → 십성(표 A 초안) → 보충 오행(표 B: 상생상극 규칙).
// ⚠️ 표 A는 자료가 없어 초안으로 작성 — 지민 검수 대상(TALISMAN_TABLE_V2.md 안내 참고).
// 'spouse'(배우자성): 남=재성·여=관성, 'child'(자녀성): 남=관성·여=식상.
// 'lowest': 십성 대신 원국에서 가장 부족한 오행(건강·마음/멘탈·일과 쉼의 균형 — PRD 명시).
type ConcernRule = Relation | 'spouse' | 'child' | 'lowest'

const SUB_RULES: Record<string, ConcernRule> = {
  'work-first-job': '관성', 'work-change': '관성', 'work-return': '관성', 'work-quit': '식상',
  'growth-skill': '인성', 'growth-promotion': '관성', 'growth-confidence': '식상',
  'growth-balance': 'lowest', 'growth-challenge': '식상',
  'love-single': 'spouse', 'love-some': 'spouse', 'love-dating': 'spouse',
  'love-breakup': 'spouse', 'love-wedding': 'spouse', 'love-married': 'spouse',
  'rel-friend': '비겁', 'rel-coworker': '관성', 'rel-social': '비겁',
  'family-parents': '인성', 'family-siblings': '비겁', 'family-childplan': 'child',
  'family-parenting': 'child', 'family-education': 'child',
  'money-income': '재성', 'money-saving': '재성', 'money-invest': '재성',
  'money-debt': '재성', 'money-house': '재성',
  'health-energy': 'lowest', 'health-sleep': 'lowest', 'health-care': 'lowest',
  'mind-anxiety': 'lowest', 'mind-lethargy': 'lowest', 'mind-esteem': 'lowest',
  'mind-lonely': 'lowest', 'mind-stress': 'lowest',
  'study-entrance': '인성', 'study-license': '인성', 'study-exam': '인성', 'study-language': '인성',
}

// elementScore.determineLackingElement의 동점 처리와 같은 결정론 해시(djb2)
function hashIndex(seed: string, modulo: number): number {
  let hash = 5381
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 33 + seed.charCodeAt(i)) >>> 0
  }
  return hash % modulo
}

export function determineElementForConcern(
  subKey: string,
  result: SajuResult,
  timeUnknown: boolean,
  dayElement: Element,
  gender: '남' | '여',
): { element: Element; basis: string } {
  const rule = SUB_RULES[subKey] ?? 'lowest'

  if (rule === 'lowest') {
    const scores = computeElementScores(result, timeUnknown)
    const min = Math.min(...ELEMENT_ORDER.map((el) => scores[el]))
    const tied = ELEMENT_ORDER.filter((el) => scores[el] === min)
    const element = tied.length === 1 ? tied[0] : tied[hashIndex(`${subKey}-${ELEMENT_ORDER.map((el) => scores[el]).join(',')}`, tied.length)]
    return { element, basis: '원국에서 가장 부족한 오행' }
  }

  const relation: Relation =
    rule === 'spouse' ? (gender === '여' ? '관성' : '재성') : rule === 'child' ? (gender === '여' ? '식상' : '관성') : rule

  return { element: relatedElement(dayElement, relation), basis: `${relation} (일간 ${dayElement} 기준)` }
}
