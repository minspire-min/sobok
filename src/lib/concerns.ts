// PRD §8.1 — 고민 카테고리 v2: 상위 9 × 하위 40.
// 이벤트 버전의 categories.ts(상위 8)와 별개 — 회원 서비스 주문 플로우가 쓴다.

export type TopConcernKey =
  | 'work'
  | 'growth'
  | 'love'
  | 'relationship'
  | 'family'
  | 'money'
  | 'health'
  | 'mind'
  | 'study'

export type Concern = { key: string; label: string }

export const TOP_CONCERNS: Array<{ key: TopConcernKey; label: string; subs: Concern[] }> = [
  {
    key: 'work',
    label: '회사',
    subs: [
      { key: 'work-first-job', label: '첫 취업' },
      { key: 'work-change', label: '이직' },
      { key: 'work-return', label: '재취업' },
      { key: 'work-quit', label: '퇴사' },
    ],
  },
  {
    key: 'growth',
    label: '성장',
    subs: [
      { key: 'growth-skill', label: '실력·전문성' },
      { key: 'growth-promotion', label: '인정·승진' },
      { key: 'growth-confidence', label: '일하는 자신감' },
      { key: 'growth-balance', label: '일과 쉼의 균형' },
      { key: 'growth-challenge', label: '새로운 도전(부업·창업)' },
    ],
  },
  {
    key: 'love',
    label: '연애/결혼',
    subs: [
      { key: 'love-single', label: '솔로' },
      { key: 'love-some', label: '썸' },
      { key: 'love-dating', label: '연애 중' },
      { key: 'love-breakup', label: '이별/재회' },
      { key: 'love-wedding', label: '결혼 준비' },
      { key: 'love-married', label: '결혼 생활' },
    ],
  },
  {
    key: 'relationship',
    label: '인간관계',
    subs: [
      { key: 'rel-friend', label: '친구' },
      { key: 'rel-coworker', label: '직장 동료/상사' },
      { key: 'rel-social', label: '지인/모임' },
    ],
  },
  {
    key: 'family',
    label: '가족/육아',
    subs: [
      { key: 'family-parents', label: '부모님' },
      { key: 'family-siblings', label: '형제자매' },
      { key: 'family-childplan', label: '자녀 계획' },
      { key: 'family-parenting', label: '육아' },
      { key: 'family-education', label: '자녀 교육' },
    ],
  },
  {
    key: 'money',
    label: '재물/돈',
    subs: [
      { key: 'money-income', label: '수입 늘리기' },
      { key: 'money-saving', label: '저축/지출 관리' },
      { key: 'money-invest', label: '투자' },
      { key: 'money-debt', label: '빚/대출' },
      { key: 'money-house', label: '내 집 마련' },
    ],
  },
  {
    key: 'health',
    label: '건강',
    subs: [
      { key: 'health-energy', label: '체력/컨디션' },
      { key: 'health-sleep', label: '수면' },
      { key: 'health-care', label: '몸 관리' },
    ],
  },
  {
    key: 'mind',
    label: '마음/멘탈',
    subs: [
      { key: 'mind-anxiety', label: '불안/걱정' },
      { key: 'mind-lethargy', label: '무기력' },
      { key: 'mind-esteem', label: '자존감' },
      { key: 'mind-lonely', label: '외로움' },
      { key: 'mind-stress', label: '스트레스' },
    ],
  },
  {
    key: 'study',
    label: '학업/시험',
    subs: [
      { key: 'study-entrance', label: '입시' },
      { key: 'study-license', label: '자격증' },
      { key: 'study-exam', label: '공무원/고시' },
      { key: 'study-language', label: '어학' },
    ],
  },
]

export function findConcern(topKey: string, subKey: string): { top: Concern; sub: Concern } | null {
  const top = TOP_CONCERNS.find((t) => t.key === topKey)
  const sub = top?.subs.find((s) => s.key === subKey)
  return top && sub ? { top: { key: top.key, label: top.label }, sub } : null
}

export function subConcernLabel(subKey: string): string {
  for (const t of TOP_CONCERNS) {
    const s = t.subs.find((x) => x.key === subKey)
    if (s) return s.label
  }
  return subKey
}
