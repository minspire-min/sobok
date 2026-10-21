// PRD v2 §4.3 저장 데이터 구조. 클라이언트 lib/types.ts의 SajuFormInput과 필드가 겹치지만,
// 서버 레코드는 여기(함수 쪽)에서 독립적으로 관리한다 — 클라이언트 번들에 안 들어가게.
export type CategoryKey = 'money' | 'job' | 'relation' | 'health' | 'career' | 'mind' | 'love' | 'family'
export type ElementKo = '목' | '화' | '토' | '금' | '수'

export type Submission = {
  id: string
  createdAt: string // ISO — 15일 삭제 기준
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
}

export type SubmissionInput = {
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
  consent: boolean
}
