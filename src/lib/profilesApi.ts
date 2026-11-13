import { supabase } from './supabase'
import type { SajuFormInput } from './types'

// PRD §10.1 saju_profiles — 입력값만 저장하고 계산 결과는 저장하지 않는다(매번 계산).
export type SajuProfileRow = {
  id: string
  nickname: string
  gender: '남' | '여'
  calendar_type: 'solar' | 'lunar'
  is_leap_month: boolean
  birth_year: number
  birth_month: number
  birth_day: number
  birth_hour: number | null
  birth_minute: number | null
  time_unknown: boolean
  subject_consent: boolean
  sort_order: number
  created_at: string
}

export const MAX_PROFILES = 8

export async function listSajuProfiles(): Promise<SajuProfileRow[]> {
  const { data, error } = await supabase
    .from('saju_profiles')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as SajuProfileRow[]
}

export async function createSajuProfile(input: SajuFormInput): Promise<SajuProfileRow> {
  const { data, error } = await supabase
    .from('saju_profiles')
    .insert({
      nickname: input.nickname.trim(),
      gender: input.gender,
      calendar_type: input.calendarType,
      is_leap_month: input.isLeapMonth,
      birth_year: input.year,
      birth_month: input.month,
      birth_day: input.day,
      birth_hour: input.timeUnknown ? null : input.hour,
      birth_minute: input.timeUnknown ? null : input.minute,
      time_unknown: input.timeUnknown,
      subject_consent: input.consent,
      user_id: (await supabase.auth.getUser()).data.user?.id,
    })
    .select('*')
    .single()
  if (error) {
    if (error.message.includes('PROFILE_LIMIT_REACHED')) throw new Error('PROFILE_LIMIT_REACHED')
    throw error
  }
  return data as SajuProfileRow
}

export function profileToFormInput(row: SajuProfileRow): SajuFormInput {
  return {
    nickname: row.nickname,
    calendarType: row.calendar_type,
    isLeapMonth: row.is_leap_month,
    year: row.birth_year,
    month: row.birth_month,
    day: row.birth_day,
    hour: row.birth_hour ?? 0,
    minute: row.birth_minute ?? 0,
    timeUnknown: row.time_unknown,
    gender: row.gender,
    category: null,
    consent: row.subject_consent,
  }
}
