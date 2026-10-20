// PRD v2 §3.2 R2 — 고민 카테고리 8개. Figma 75:1621 순서 그대로.
export type CategoryKey = 'money' | 'job' | 'relation' | 'health' | 'career' | 'mind' | 'love' | 'family'

export const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: 'money', label: '재물/돈' },
  { key: 'job', label: '취업/이직' },
  { key: 'relation', label: '인간관계' },
  { key: 'health', label: '건강' },
  { key: 'career', label: '커리어/사업 성장' },
  { key: 'mind', label: '마음/멘탈' },
  { key: 'love', label: '연애/결혼' },
  { key: 'family', label: '가족/육아' },
]
