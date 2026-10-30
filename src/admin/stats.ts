import type { AdminPageVisit, AdminSubmission } from './types'

export type Granularity = 'daily' | 'weekly' | 'monthly' | 'yearly'

export type Bucket = { key: number; label: string; entered: number; confirmed: number }

// 날짜 하나를 로컬 타임존 기준 연/월/일로 쪼갠다 — 다른 화면들도 toLocaleString('ko-KR')로
// 로컬 시간대 기준으로 보여주고 있어서 통계도 거기 맞춘다.
function ymd(d: Date): { y: number; m: number; day: number } {
  return { y: d.getFullYear(), m: d.getMonth() + 1, day: d.getDate() }
}

// 간단한 "N주차" 규칙: 매월 1일을 1주차 시작으로 보고 7일 단위로 끊는다(달력 주 정렬 아님,
// 행사 규모에서 직관적으로 맞으면 충분하다고 판단).
function weekOfMonth(day: number): number {
  return Math.ceil(day / 7)
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dow = copy.getDay() // 0=일 ... 6=토
  const diffToMonday = dow === 0 ? -6 : 1 - dow
  copy.setDate(copy.getDate() + diffToMonday)
  return copy
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}

const WEEKDAY_LABEL = ['일', '월', '화', '수', '목', '금', '토']

export type DailyRange = { start: string; end: string } // YYYY-MM-DD
export type WeeklyRange = { start: number; end: number } // key = y*1000+m*10+week
export type MonthlyRange = { start: number; end: number } // key = y*100+m
export type YearlyRange = { start: number; end: number } // key = y

export function defaultDailyRange(today: Date): DailyRange {
  const start = startOfWeek(today)
  const end = addDays(start, 6)
  return { start: toDateInput(start), end: toDateInput(end) }
}

export function toDateInput(d: Date): string {
  const { y, m, day } = ymd(d)
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function weekKey(y: number, m: number, day: number): number {
  return y * 1000 + m * 10 + weekOfMonth(day)
}

export function monthKey(y: number, m: number): number {
  return y * 100 + m
}

export function defaultWeeklyRange(today: Date, spanWeeks = 4): WeeklyRange {
  const end = weekKey(ymd(today).y, ymd(today).m, ymd(today).day)
  // spanWeeks-1번 만큼 이전 주로 거슬러 올라간 key를 구하려면 날짜 기준으로 계산해야 안전하다
  // (월 경계를 넘을 때 1주차/5주차 숫자가 단순 뺄셈으로는 안 맞을 수 있어서).
  const startDate = addDays(startOfWeek(today), -(spanWeeks - 1) * 7)
  const sd = ymd(startDate)
  const start = weekKey(sd.y, sd.m, sd.day)
  return { start, end }
}

export function defaultMonthlyRange(today: Date, spanMonths = 6): MonthlyRange {
  const { y, m } = ymd(today)
  const end = monthKey(y, m)
  const startDate = new Date(y, m - 1 - (spanMonths - 1), 1)
  const start = monthKey(startDate.getFullYear(), startDate.getMonth() + 1)
  return { start, end }
}

export function defaultYearlyRange(today: Date, spanYears = 2): YearlyRange {
  const y = ymd(today).y
  return { start: y - (spanYears - 1), end: y }
}

export const MAX_DAILY_SPAN_DAYS = 7
export const MAX_WEEKLY_SPAN_WEEKS = 6
export const MAX_MONTHLY_SPAN_MONTHS = 12
export const MAX_YEARLY_SPAN_YEARS = 10

function countInBucket(items: AdminSubmission[], match: (d: Date) => boolean): { entered: number; confirmed: number } {
  let entered = 0
  let confirmed = 0
  for (const s of items) {
    if (!match(new Date(s.createdAt))) continue
    entered++
    if (s.selectedTalismanId) confirmed++
  }
  return { entered, confirmed }
}

export function buildDailyBuckets(items: AdminSubmission[], range: DailyRange): Bucket[] {
  const start = new Date(`${range.start}T00:00:00`)
  const end = new Date(`${range.end}T00:00:00`)
  const buckets: Bucket[] = []
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const { y, m, day } = ymd(d)
    const key = y * 10000 + m * 100 + day
    const { entered, confirmed } = countInBucket(items, (sd) => {
      const sv = ymd(sd)
      return sv.y === y && sv.m === m && sv.day === day
    })
    buckets.push({ key, label: `${m}/${day}(${WEEKDAY_LABEL[d.getDay()]})`, entered, confirmed })
  }
  return buckets
}

export function buildWeeklyBuckets(items: AdminSubmission[], range: WeeklyRange): Bucket[] {
  const buckets: Bucket[] = []
  // range.start/end 사이에 존재하는 모든 (월, 주차) 조합을 날짜를 훑어서 찾아낸다.
  const startYear = Math.floor(range.start / 1000)
  const endYear = Math.floor(range.end / 1000)
  const seen = new Map<number, { year: number; month: number; week: number }>()
  for (let y = startYear; y <= endYear; y++) {
    for (let m = 1; m <= 12; m++) {
      const daysInMonth = new Date(y, m, 0).getDate()
      for (let day = 1; day <= daysInMonth; day++) {
        const key = weekKey(y, m, day)
        if (key < range.start || key > range.end) continue
        if (!seen.has(key)) seen.set(key, { year: y, month: m, week: weekOfMonth(day) })
      }
    }
  }
  const sortedKeys = Array.from(seen.keys()).sort((a, b) => a - b)
  for (const key of sortedKeys) {
    const { month, week } = seen.get(key)!
    const { entered, confirmed } = countInBucket(items, (sd) => weekKey(sd.getFullYear(), sd.getMonth() + 1, sd.getDate()) === key)
    buckets.push({ key, label: `${month}월 ${week}주차`, entered, confirmed })
  }
  return buckets
}

export function buildMonthlyBuckets(items: AdminSubmission[], range: MonthlyRange): Bucket[] {
  const buckets: Bucket[] = []
  const startY = Math.floor(range.start / 100)
  const startM = range.start % 100
  const endY = Math.floor(range.end / 100)
  const endM = range.end % 100
  const sameYear = startY === endY
  let y = startY
  let m = startM
  while (y < endY || (y === endY && m <= endM)) {
    const key = monthKey(y, m)
    const { entered, confirmed } = countInBucket(items, (sd) => sd.getFullYear() === y && sd.getMonth() + 1 === m)
    buckets.push({ key, label: sameYear ? `${m}월` : `${String(y).slice(2)}.${m}월`, entered, confirmed })
    m++
    if (m > 12) {
      m = 1
      y++
    }
  }
  return buckets
}

export function buildYearlyBuckets(items: AdminSubmission[], range: YearlyRange): Bucket[] {
  const buckets: Bucket[] = []
  for (let y = range.start; y <= range.end; y++) {
    const { entered, confirmed } = countInBucket(items, (sd) => sd.getFullYear() === y)
    buckets.push({ key: y, label: `${y}년`, entered, confirmed })
  }
  return buckets
}

export type Option = { key: number; label: string }

// 기간 선택 <select> 채울 목록. 과거/미래 범위는 넉넉히 잡아 실제로 쓸 일 없는 끝단은
// 그냥 안 고르면 그만 — 매번 정확한 데이터 경계를 계산할 필요는 없다.
export function listWeekOptions(today: Date, backWeeks = 104, forwardWeeks = 4): Option[] {
  const options: Option[] = []
  const monday = startOfWeek(today)
  for (let i = -backWeeks; i <= forwardWeeks; i++) {
    const d = addDays(monday, i * 7)
    const { y, m, day } = ymd(d)
    options.push({ key: weekKey(y, m, day), label: `${m}월 ${weekOfMonth(day)}주차` })
  }
  return options
}

export function listMonthOptions(today: Date, backMonths = 36, forwardMonths = 3): Option[] {
  const options: Option[] = []
  const { y, m } = ymd(today)
  for (let i = -backMonths; i <= forwardMonths; i++) {
    const d = new Date(y, m - 1 + i, 1)
    options.push({ key: monthKey(d.getFullYear(), d.getMonth() + 1), label: `${d.getFullYear()}년 ${d.getMonth() + 1}월` })
  }
  return options
}

export function listYearOptions(today: Date, backYears = 15, forwardYears = 2): Option[] {
  const y = ymd(today).y
  const options: Option[] = []
  for (let i = -backYears; i <= forwardYears; i++) options.push({ key: y + i, label: `${y + i}년` })
  return options
}

export type DateRange = DailyRange | WeeklyRange | MonthlyRange | YearlyRange

// 일간/주간/월간/연간 선택 범위 안에 들어오는 항목만 거른다 — 버킷을 쪼개지 않고 전체
// 집합이 필요한 차트(카테고리별 도넛, 첫방문/재방문 막대, 체류시간 퍼널)에 공통으로 쓴다.
function filterByRangeGeneric<T>(items: T[], granularity: Granularity, range: DateRange, getDate: (item: T) => string): T[] {
  if (granularity === 'daily') {
    const r = range as DailyRange
    return items.filter((item) => {
      const key = toDateInput(new Date(getDate(item)))
      return key >= r.start && key <= r.end
    })
  }
  if (granularity === 'weekly') {
    const r = range as WeeklyRange
    return items.filter((item) => {
      const d = new Date(getDate(item))
      const key = weekKey(d.getFullYear(), d.getMonth() + 1, d.getDate())
      return key >= r.start && key <= r.end
    })
  }
  if (granularity === 'monthly') {
    const r = range as MonthlyRange
    return items.filter((item) => {
      const d = new Date(getDate(item))
      const key = monthKey(d.getFullYear(), d.getMonth() + 1)
      return key >= r.start && key <= r.end
    })
  }
  const r = range as YearlyRange
  return items.filter((item) => {
    const y = new Date(getDate(item)).getFullYear()
    return y >= r.start && y <= r.end
  })
}

export function filterByRange(items: AdminSubmission[], granularity: Granularity, range: DateRange): AdminSubmission[] {
  return filterByRangeGeneric(items, granularity, range, (s) => s.createdAt)
}

export function filterVisitsByRange(visits: AdminPageVisit[], granularity: Granularity, range: DateRange): AdminPageVisit[] {
  return filterByRangeGeneric(visits, granularity, range, (v) => v.enteredAt)
}

// 완료됐으면 completedAt까지, 아니면 beacon으로 받은 마지막 생존 시각까지를 체류시간으로 본다.
// beacon이 한 번도 안 온 경우(enteredAt과 lastSeenAt이 같음)는 체류시간을 모른다고 보고 평균에서 뺀다.
function dwellSeconds(v: AdminPageVisit): number | null {
  const end = v.completedAt ?? (v.lastSeenAt !== v.enteredAt ? v.lastSeenAt : null)
  if (!end) return null
  const seconds = (new Date(end).getTime() - new Date(v.enteredAt).getTime()) / 1000
  return seconds >= 0 ? seconds : null
}

function avgDwellSeconds(visits: AdminPageVisit[]): number | null {
  const dwells = visits.map(dwellSeconds).filter((d): d is number => d !== null)
  return dwells.length > 0 ? dwells.reduce((a, b) => a + b, 0) / dwells.length : null
}

export type JourneySummary = {
  entered: number
  enteredAvgDwellSeconds: number | null // 메인 화면 평균 체류시간
  dropped: number // 정보 작성 중 이탈 / 결과 페이지 미진입
  completed: number // 결과 페이지까지 도달
  completedAvgDwellSeconds: number | null // 결과 화면 평균 체류시간
}

// 메인 진입 → (중도이탈 | 결과 페이지 도달) → 결과 화면에서 결국 이탈, 전체 여정을 하나로 합친 퍼널.
export function summarizeJourney(mainVisits: AdminPageVisit[], resultVisits: AdminPageVisit[]): JourneySummary {
  return {
    entered: mainVisits.length,
    enteredAvgDwellSeconds: avgDwellSeconds(mainVisits),
    dropped: mainVisits.filter((v) => !v.completed).length,
    completed: resultVisits.length,
    completedAvgDwellSeconds: avgDwellSeconds(resultVisits),
  }
}

export type VisitType = 'first' | 'repeat' | 'unknown'

// 닉네임+생년월일시+성별이 똑같은 제출을 "같은 사람"으로 추정하는 임시 휴리스틱(로그인
// 없이는 이게 최선 — 고도화 때 로그인 붙으면 이 함수를 그걸로 교체하면 된다).
// 시간을 모른 채 제출한 건(timeUnknown)은 겹침 판단 신뢰도가 낮아 '미확인'으로 따로 둔다.
function visitFingerprint(s: AdminSubmission): string {
  return `${s.nickname.trim()}|${s.calendarType}|${s.year}-${s.month}-${s.day}|${s.hour}:${s.minute}|${s.gender}`
}

// 전체 제출(기간 필터 전)을 기준으로 판정해야, 선택한 기간 밖에 있던 "진짜 첫 방문"을
// 놓치고 이번 기간 걸 첫방문으로 잘못 세는 일이 없다.
export function classifyVisits(allItems: AdminSubmission[]): Map<string, VisitType> {
  const earliestIdByFingerprint = new Map<string, string>()
  const sorted = [...allItems].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  for (const s of sorted) {
    if (s.timeUnknown) continue
    const fp = visitFingerprint(s)
    if (!earliestIdByFingerprint.has(fp)) earliestIdByFingerprint.set(fp, s.id)
  }

  const result = new Map<string, VisitType>()
  for (const s of allItems) {
    if (s.timeUnknown) {
      result.set(s.id, 'unknown')
      continue
    }
    const fp = visitFingerprint(s)
    result.set(s.id, earliestIdByFingerprint.get(fp) === s.id ? 'first' : 'repeat')
  }
  return result
}

export function genderDistribution(items: AdminSubmission[]): { gender: '남' | '여'; count: number }[] {
  const counts = { 남: 0, 여: 0 }
  for (const s of items) counts[s.gender]++
  return (['남', '여'] as const).map((gender) => ({ gender, count: counts[gender] }))
}

const AGE_BUCKET_LABELS = ['10대', '20대', '30대', '40대', '50대', '60대', '70대', '80대 이상'] as const

// 만 나이까지는 필요 없는 분포 차트라 "올해 연도 - 출생 연도"로 간단히 센다(음력 출생이면
// 생일 전후로 ±1 오차가 날 수 있지만 연령대 분포에선 무시할 수준). 10세 미만/80세 초과는
// 각각 가장 가까운 끝 구간(10대/80대 이상)으로 묶는다.
export function ageDistribution(items: AdminSubmission[], today: Date): { label: string; count: number }[] {
  const counts = new Map<string, number>(AGE_BUCKET_LABELS.map((label) => [label, 0]))
  for (const s of items) {
    const age = today.getFullYear() - s.year
    const decade = Math.min(80, Math.max(10, Math.floor(age / 10) * 10))
    const label = decade >= 80 ? '80대 이상' : `${decade}대`
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  return AGE_BUCKET_LABELS.map((label) => ({ label, count: counts.get(label) ?? 0 }))
}
