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

// 체류시간/이탈 추적용 — 제출 완료 여부와 무관하게 화면에 들어온 순간 생성된다
// (끝까지 안 채우고 나간 "중도이탈"까지 보려면 제출 시점이 아니라 진입 시점에 기록해야 함).
export type PageVisit = {
  id: string
  page: 'main' | 'result'
  enteredAt: string // ISO — 진입 시각
  lastSeenAt: string // ISO — 마지막으로 화면이 보였던 시각(탭 숨김/이탈 시점 근사치, beacon으로 갱신)
  completed: boolean // main: 제출 완료 / result: 부적 선택 완료
  completedAt: string | null
  submissionId: string | null
}
