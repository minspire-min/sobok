import type { CategoryKey } from './categories.ts'

export type SajuFormInput = {
  nickname: string
  calendarType: 'solar' | 'lunar'
  isLeapMonth: boolean
  year: number
  month: number
  day: number
  hour: number // 0~23
  minute: number // 0~59
  timeUnknown: boolean
  gender: '남' | '여' | null
  category: CategoryKey | null
  consent: boolean
}
