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

  // §3.12 — 접수 15일 경과 시 개인정보(닉네임·생월일·시분·메모·풀이)만 파기하고 집계 지표는 남긴다.
  // anonymizedAt: 파기 시각(멱등 처리/감사용). 익명화되면 닉네임·생년월일이 사라져 첫/재방문
  // 재계산이 불가능하므로 visitType에 파기 직전 판정값을 동결해 둔다.
  anonymizedAt?: string | null
  visitType?: 'first' | 'repeat' | 'unknown'

  // 운영 사이트에서 직접 테스트하며 만든 레코드 표시(?test=1). 관리자 통계 집계에서 제외된다.
  isTest?: boolean
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

  // 운영 사이트에서 직접 테스트하며 만든 방문 표시(?test=1). 관리자 통계 집계에서 제외된다.
  isTest?: boolean
}
