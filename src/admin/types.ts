import type { CategoryKey } from '../lib/categories'

// PRD v2 §4.3 서버 레코드와 필드를 맞춘 관리자 화면 전용 타입(netlify/functions/_shared/types.ts와 중복이지만
// 의도적 — 참여자 번들과 서버 함수 번들이 서로의 타입에 의존하지 않게 분리한다).
export type ElementKo = '목' | '화' | '토' | '금' | '수'

export type AdminSubmission = {
  id: string
  createdAt: string
  consentAt: string
  nickname: string
  gender: '남' | '여'
  calendarType: 'solar' | 'lunar'
  isLeapMonth: boolean
  year: number
  month: number
  day: number
  hour: number
  minute: number
  timeUnknown: boolean
  category: CategoryKey
  elementScores: Record<ElementKo, number>
  tiedElements: ElementKo[]
  lackingElement: ElementKo
  lackingReason: 'lowest' | 'category' | 'random'
  talismanIds: [string, string, string]
  selectedTalismanId: string | null
  selectedBy: 'user' | 'admin' | null
  selectedAt: string | null
  reading: string | null
  readingModel: string | null
  readingFailedAt: string | null
  memo: string
  memoUpdatedAt: string | null

  // 15일 경과 시 개인정보를 파기하고 집계 지표만 남긴 상태. anonymizedAt이 있으면 닉네임·생월일 등은
  // 비워져 있고, 첫/재방문은 파기 직전 동결된 visitType으로 읽는다(stats.classifyVisits 참고).
  anonymizedAt?: string | null
  visitType?: 'first' | 'repeat' | 'unknown'
  isTest?: boolean // 운영 테스트(?test=1)로 만든 레코드 — 통계 집계에서 제외
}

export type AdminPageVisit = {
  id: string
  page: 'main' | 'result'
  enteredAt: string
  lastSeenAt: string
  completed: boolean
  completedAt: string | null
  submissionId: string | null
  isTest?: boolean // 운영 테스트(?test=1)로 만든 방문 — 통계 집계에서 제외
}
