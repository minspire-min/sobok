import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CATEGORIES } from '../lib/categories'
import { AdminLayout } from './AdminLayout'
import { AdminAuthError, listPageVisits, listSubmissions } from './api'
import {
  ageDistribution,
  type Bucket,
  type DateRange,
  type Granularity,
  genderDistribution,
  type JourneySummary,
  buildDailyBuckets,
  buildMonthlyBuckets,
  buildWeeklyBuckets,
  buildYearlyBuckets,
  classifyVisits,
  defaultDailyRange,
  defaultMonthlyRange,
  defaultWeeklyRange,
  defaultYearlyRange,
  filterByRange,
  filterVisitsByRange,
  listMonthOptions,
  listWeekOptions,
  listYearOptions,
  MAX_DAILY_SPAN_DAYS,
  MAX_MONTHLY_SPAN_MONTHS,
  MAX_WEEKLY_SPAN_WEEKS,
  MAX_YEARLY_SPAN_YEARS,
  summarizeJourney,
} from './stats'
import type { AdminPageVisit, AdminSubmission } from './types'

const ENTERED_COLOR = 'rgba(243,27,192,0.35)' // 연분홍 — 진입 수
const CONFIRMED_COLOR = '#f31bc0' // 진분홍 — 확인 수

const DONUT_COLORS = ['#f31bc0', '#1c84e5', '#17c666', '#f3b526', '#8b5cf6', '#e03131', '#0ea5a5', '#737373']

const GRANULARITY_LABEL: Record<Granularity, string> = { daily: '일간', weekly: '주간', monthly: '월간', yearly: '연간' }

const VISIT_LABEL = { first: '첫방문', repeat: '재방문', unknown: '미확인' } as const
const VISIT_COLOR = { first: '#f31bc0', repeat: '#1c84e5', unknown: '#9a9a9a' } as const
const GENDER_COLOR = { 남: '#1c84e5', 여: '#f31bc0' } as const

function formatDwell(seconds: number | null): string {
  if (seconds === null) return '-'
  const s = Math.round(seconds)
  if (s < 60) return `${s}초`
  return `${Math.floor(s / 60)}분 ${s % 60}초`
}

function BarChart({ buckets }: { buckets: Bucket[] }) {
  const max = Math.max(1, ...buckets.map((b) => Math.max(b.entered, b.confirmed)))
  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs text-[#525252]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: ENTERED_COLOR }} />
          진입 수
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: CONFIRMED_COLOR }} />
          확인 수
        </span>
      </div>
      <div className="flex items-end gap-3 overflow-x-auto pb-2">
        {buckets.map((b) => (
          <div key={b.key} className="flex min-w-[48px] flex-1 flex-col items-center gap-2">
            <div className="flex h-[160px] w-full items-end justify-center gap-1">
              <div
                className="w-full rounded-t-[3px]"
                style={{ height: `${(b.entered / max) * 100}%`, backgroundColor: ENTERED_COLOR }}
                title={`진입 수\n${b.entered}명`}
              />
              <div
                className="w-full rounded-t-[3px]"
                style={{ height: `${(b.confirmed / max) * 100}%`, backgroundColor: CONFIRMED_COLOR }}
                title={`확인 수\n${b.confirmed}명`}
              />
            </div>
            <p className="text-center text-[11px] whitespace-nowrap text-[#525252]">{b.label}</p>
            <p className="text-xs font-bold text-[#0a0a0a]">{b.entered}/{b.confirmed}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function DonutChart({ data }: { data: { label: string; count: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0)
  if (total === 0) return <p className="text-sm text-[#737373]">아직 데이터가 없어요.</p>

  const radius = 70
  const circumference = 2 * Math.PI * radius

  // 각 슬라이스가 시작할 오프셋을 먼저 다 계산해 둔다 — reduce로 누적해 render 중 변수 재할당을 피한다.
  const slices = data.reduce<Array<{ label: string; count: number; dash: number; offset: number }>>((acc, d) => {
    const dash = (d.count / total) * circumference
    const offset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].dash : 0
    acc.push({ ...d, dash, offset })
    return acc
  }, [])

  return (
    <div className="flex items-center justify-center gap-8">
      <div className="relative size-[180px] shrink-0">
        <svg viewBox="0 0 180 180" className="size-full -rotate-90">
          {slices.map((d, i) => {
            if (d.count === 0) return null
            return (
              <circle
                key={d.label}
                cx={90}
                cy={90}
                r={radius}
                fill="none"
                stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
                strokeWidth={28}
                strokeDasharray={`${d.dash} ${circumference - d.dash}`}
                strokeDashoffset={-d.offset}
              >
                <title>{`${d.label}\n${Math.round((d.count / total) * 100)}%`}</title>
              </circle>
            )
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-xs text-[#737373]">총 진입</p>
          <p className="text-lg font-bold text-[#0a0a0a]">{total}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center gap-2 text-sm">
            <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            <span className="text-[#0a0a0a]">{d.label}</span>
            <span className="text-[#737373]">
              {d.count}건{total > 0 ? ` (${Math.round((d.count / total) * 100)}%)` : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

type SimpleBar = { key: string; label: string; count: number; color: string; hint?: string; sublabel?: string }

// percentBase를 안 주면 막대들 자기들끼리의 합을 분모로 쓴다(카테고리별 분포처럼 서로 겹치지
// 않는 항목들일 때 맞는 계산). 진입/중도이탈/완료처럼 "진입 = 중도이탈 + 완료"인 퍼널형
// 차트는 막대 합이 아니라 진입 수를 분모로 넘겨줘야 퍼센트가 말이 된다.
function SimpleBarChart({ bars, percentBase }: { bars: SimpleBar[]; percentBase?: number }) {
  const sum = bars.reduce((s, b) => s + b.count, 0)
  const base = percentBase ?? sum
  const max = Math.max(1, ...bars.map((b) => b.count))
  if (sum === 0) return <p className="text-sm text-[#737373]">아직 데이터가 없어요.</p>

  return (
    <div className="flex items-end justify-center gap-10 overflow-x-auto pb-1">
      {bars.map((b) => (
        <div key={b.key} className="flex flex-col items-center gap-2">
          <div className="flex h-[180px] w-[64px] items-end">
            <div
              className="w-full rounded-t-[4px]"
              style={{ height: `${(b.count / max) * 100}%`, backgroundColor: b.color }}
              title={b.hint ?? `${b.label}\n${b.count}건`}
            />
          </div>
          <p className="text-sm text-[#525252]">{b.label}</p>
          <p className="text-base font-bold text-[#0a0a0a]">
            {b.count}건{base > 0 ? ` (${Math.round((b.count / base) * 100)}%)` : ''}
          </p>
          {b.sublabel && <p className="text-xs text-[#9a9a9a]">{b.sublabel}</p>}
        </div>
      ))}
    </div>
  )
}

export function StatsUsersPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<AdminSubmission[] | null>(null)
  const [visits, setVisits] = useState<AdminPageVisit[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [granularity, setGranularity] = useState<Granularity>('daily')

  const today = useMemo(() => new Date(), [])
  const [dailyRange, setDailyRange] = useState(() => defaultDailyRange(today))
  const [weeklyRange, setWeeklyRange] = useState(() => defaultWeeklyRange(today))
  const [monthlyRange, setMonthlyRange] = useState(() => defaultMonthlyRange(today))
  const [yearlyRange, setYearlyRange] = useState(() => defaultYearlyRange(today))

  const weekOptions = useMemo(() => listWeekOptions(today), [today])
  const monthOptions = useMemo(() => listMonthOptions(today), [today])
  const yearOptions = useMemo(() => listYearOptions(today), [today])

  useEffect(() => {
    Promise.all([listSubmissions(), listPageVisits()])
      .then(([s, v]) => {
        // 운영 테스트(?test=1)로 만든 레코드는 모든 통계 집계에서 제외한다(관리자 목록엔 그대로 보임).
        setItems(s.filter((x) => !x.isTest))
        setVisits(v.filter((x) => !x.isTest))
      })
      .catch((e) => {
        if (e instanceof AdminAuthError) {
          navigate('/admin-mingminjimin/login', { replace: true })
          return
        }
        setError(e instanceof Error ? e.message : String(e))
      })
  }, [navigate])

  if (error) return <AdminLayout><div className="p-6 text-sm text-destructive">{error}</div></AdminLayout>
  if (!items || !visits) return <AdminLayout><div className="p-6 text-sm text-muted-foreground">불러오는 중...</div></AdminLayout>

  const currentRange: DateRange =
    granularity === 'daily' ? dailyRange
    : granularity === 'weekly' ? weeklyRange
    : granularity === 'monthly' ? monthlyRange
    : yearlyRange

  // 진입=메인 화면 진입, 확인=결과 화면 진입 — 바 차트도 퍼널과 같은 page-visits 기준으로 센다.
  const mainVisits = visits.filter((v) => v.page === 'main')
  const resultVisits = visits.filter((v) => v.page === 'result')

  const buckets: Bucket[] =
    granularity === 'daily' ? buildDailyBuckets(mainVisits, resultVisits, dailyRange)
    : granularity === 'weekly' ? buildWeeklyBuckets(mainVisits, resultVisits, weeklyRange)
    : granularity === 'monthly' ? buildMonthlyBuckets(mainVisits, resultVisits, monthlyRange)
    : buildYearlyBuckets(mainVisits, resultVisits, yearlyRange)

  const periodEntered = buckets.reduce((sum, b) => sum + b.entered, 0)
  const periodConfirmed = buckets.reduce((sum, b) => sum + b.confirmed, 0)
  const periodRate = periodEntered > 0 ? Math.round((periodConfirmed / periodEntered) * 100) : 0

  // 카테고리/방문유형 차트는 선택한 기간에 맞춰 같이 움직인다. 첫방문 여부는 전체 제출
  // 기준으로 판정해야 기간 밖의 진짜 첫 방문을 놓치지 않는다(classifyVisits는 items 전체로 호출).
  const periodItems = filterByRange(items, granularity, currentRange)
  const visitTypeById = classifyVisits(items)

  const byCategory = CATEGORIES.map((c) => ({
    label: c.label,
    count: periodItems.filter((s) => s.category === c.key).length,
  }))

  const visitCounts = { first: 0, repeat: 0, unknown: 0 }
  for (const s of periodItems) visitCounts[visitTypeById.get(s.id) ?? 'unknown']++
  const visitTypeBars: SimpleBar[] = (['first', 'repeat', 'unknown'] as const).map((type) => ({
    key: type,
    label: VISIT_LABEL[type],
    count: visitCounts[type],
    color: VISIT_COLOR[type],
  }))

  const genderBars: SimpleBar[] = genderDistribution(periodItems).map((g) => ({
    key: g.gender,
    label: g.gender,
    count: g.count,
    color: GENDER_COLOR[g.gender],
  }))

  const ageBars: SimpleBar[] = ageDistribution(periodItems, today).map((a, i) => ({
    key: a.label,
    label: a.label,
    count: a.count,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
  }))

  // 메인 진입 → (중도이탈 | 결과 페이지 도달) → 결과 화면에서 이탈, 하나로 합친 여정 퍼널.
  // 선택한 기간에 맞춰 같이 움직인다.
  const journey: JourneySummary = summarizeJourney(
    filterVisitsByRange(mainVisits, granularity, currentRange),
    filterVisitsByRange(resultVisits, granularity, currentRange),
  )

  const journeyBars: SimpleBar[] = [
    {
      key: 'entered',
      label: '진입',
      count: journey.entered,
      color: '#f31bc0',
      hint: `진입\n${journey.entered}건`,
      sublabel: `메인 평균 ${formatDwell(journey.enteredAvgDwellSeconds)}`,
    },
    {
      key: 'dropped',
      label: '중도이탈',
      count: journey.dropped,
      color: '#9a9a9a',
      hint: `중도이탈\n${journey.dropped}건`,
      sublabel: `평균 이탈률 ${journey.entered > 0 ? Math.round((journey.dropped / journey.entered) * 100) : 0}%`,
    },
    {
      key: 'completed',
      label: '이탈(완료)',
      count: journey.completed,
      color: '#1c84e5',
      hint: `이탈(완료)\n${journey.completed}건`,
      sublabel: `결과 평균 ${formatDwell(journey.completedAvgDwellSeconds)}`,
    },
  ]

  // 선택한 시작/종료 인덱스 간격이 최대치를 넘으면, 방금 바꾼 쪽 반대편을 같이 당겨서 범위를 맞춘다.
  function clampByIndex<T extends { start: number; end: number }>(
    options: { key: number }[],
    range: T,
    changed: 'start' | 'end',
    max: number,
  ): T {
    const startIdx = options.findIndex((o) => o.key === range.start)
    const endIdx = options.findIndex((o) => o.key === range.end)
    if (startIdx === -1 || endIdx === -1) return range
    if (endIdx - startIdx + 1 <= max) return range
    if (changed === 'start') return { ...range, end: options[Math.min(options.length - 1, startIdx + max - 1)].key }
    return { ...range, start: options[Math.max(0, endIdx - max + 1)].key }
  }

  return (
    <AdminLayout>
      <div className="mx-auto w-[1120px] p-6">
        <h1 className="mb-6 text-2xl font-bold text-[#0a0a0a]">사용자</h1>

        <div className="mb-4 flex items-center gap-1 rounded-[10px] bg-[#f5f5f5] p-1 w-fit">
          {(['daily', 'weekly', 'monthly', 'yearly'] as Granularity[]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGranularity(g)}
              className={`rounded-[8px] px-4 py-1.5 text-sm font-medium ${
                granularity === g ? 'bg-white text-[#0a0a0a] shadow-[0_0_0_1px_rgba(10,10,10,0.1)]' : 'text-[#737373]'
              }`}
            >
              {GRANULARITY_LABEL[g]}
            </button>
          ))}
        </div>

        <div className="mb-6 flex items-center gap-2">
          {granularity === 'daily' && (
            <>
              <input
                type="date"
                value={dailyRange.start}
                onChange={(e) => {
                  // 시작일을 고르면 그날부터 7일 창으로 종료일을 자동 설정한다.
                  const start = e.target.value
                  const end = new Date(new Date(start).getTime() + (MAX_DAILY_SPAN_DAYS - 1) * 86400000).toISOString().slice(0, 10)
                  setDailyRange({ start, end })
                }}
                className="rounded-[8px] border border-[#e5e5e5] px-3 py-1.5 text-sm"
              />
              <span className="text-sm text-[#737373]">~</span>
              <input
                type="date"
                value={dailyRange.end}
                min={dailyRange.start}
                onChange={(e) => {
                  const end = e.target.value
                  const span = (new Date(end).getTime() - new Date(dailyRange.start).getTime()) / 86400000
                  const start = span >= MAX_DAILY_SPAN_DAYS
                    ? new Date(new Date(end).getTime() - (MAX_DAILY_SPAN_DAYS - 1) * 86400000).toISOString().slice(0, 10)
                    : dailyRange.start
                  setDailyRange({ start, end })
                }}
                className="rounded-[8px] border border-[#e5e5e5] px-3 py-1.5 text-sm"
              />
              <span className="text-xs text-[#9a9a9a]">(최대 {MAX_DAILY_SPAN_DAYS}일)</span>
            </>
          )}

          {granularity === 'weekly' && (
            <>
              <select
                value={weeklyRange.start}
                onChange={(e) => setWeeklyRange(clampByIndex(weekOptions, { ...weeklyRange, start: Number(e.target.value) }, 'start', MAX_WEEKLY_SPAN_WEEKS))}
                className="rounded-[8px] border border-[#e5e5e5] px-3 py-1.5 text-sm"
              >
                {weekOptions.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
              <span className="text-sm text-[#737373]">~</span>
              <select
                value={weeklyRange.end}
                onChange={(e) => setWeeklyRange(clampByIndex(weekOptions, { ...weeklyRange, end: Number(e.target.value) }, 'end', MAX_WEEKLY_SPAN_WEEKS))}
                className="rounded-[8px] border border-[#e5e5e5] px-3 py-1.5 text-sm"
              >
                {weekOptions.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
              <span className="text-xs text-[#9a9a9a]">(최대 {MAX_WEEKLY_SPAN_WEEKS}주)</span>
            </>
          )}

          {granularity === 'monthly' && (
            <>
              <select
                value={monthlyRange.start}
                onChange={(e) => setMonthlyRange(clampByIndex(monthOptions, { ...monthlyRange, start: Number(e.target.value) }, 'start', MAX_MONTHLY_SPAN_MONTHS))}
                className="rounded-[8px] border border-[#e5e5e5] px-3 py-1.5 text-sm"
              >
                {monthOptions.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
              <span className="text-sm text-[#737373]">~</span>
              <select
                value={monthlyRange.end}
                onChange={(e) => setMonthlyRange(clampByIndex(monthOptions, { ...monthlyRange, end: Number(e.target.value) }, 'end', MAX_MONTHLY_SPAN_MONTHS))}
                className="rounded-[8px] border border-[#e5e5e5] px-3 py-1.5 text-sm"
              >
                {monthOptions.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
              <span className="text-xs text-[#9a9a9a]">(최대 {MAX_MONTHLY_SPAN_MONTHS}개월)</span>
            </>
          )}

          {granularity === 'yearly' && (
            <>
              <select
                value={yearlyRange.start}
                onChange={(e) => setYearlyRange(clampByIndex(yearOptions, { ...yearlyRange, start: Number(e.target.value) }, 'start', MAX_YEARLY_SPAN_YEARS))}
                className="rounded-[8px] border border-[#e5e5e5] px-3 py-1.5 text-sm"
              >
                {yearOptions.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
              <span className="text-sm text-[#737373]">~</span>
              <select
                value={yearlyRange.end}
                onChange={(e) => setYearlyRange(clampByIndex(yearOptions, { ...yearlyRange, end: Number(e.target.value) }, 'end', MAX_YEARLY_SPAN_YEARS))}
                className="rounded-[8px] border border-[#e5e5e5] px-3 py-1.5 text-sm"
              >
                {yearOptions.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
              <span className="text-xs text-[#9a9a9a]">(최대 {MAX_YEARLY_SPAN_YEARS}년)</span>
            </>
          )}
        </div>

        <div className="mb-4 grid grid-cols-3 gap-4">
          <Card className="rounded-[14px] border-0 shadow-[0_0_0_1px_rgba(10,10,10,0.1)]">
            <CardContent>
              <p className="text-sm text-[#737373]">진입한 수</p>
              <p className="mt-2 text-3xl font-bold text-[#0a0a0a]">{periodEntered}</p>
            </CardContent>
          </Card>
          <Card className="rounded-[14px] border-0 shadow-[0_0_0_1px_rgba(10,10,10,0.1)]">
            <CardContent>
              <p className="text-sm text-[#737373]">확인한 수</p>
              <p className="mt-2 text-3xl font-bold text-[#0a0a0a]">{periodConfirmed}</p>
            </CardContent>
          </Card>
          <Card className="rounded-[14px] border-0 shadow-[0_0_0_1px_rgba(10,10,10,0.1)]">
            <CardContent>
              <p className="text-sm text-[#737373]">확인율</p>
              <p className="mt-2 text-3xl font-bold text-[#0a0a0a]">{periodRate}%</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-4 rounded-[14px] border-0 shadow-[0_0_0_1px_rgba(10,10,10,0.1)]">
          <CardHeader>
            <CardTitle className="text-base">{GRANULARITY_LABEL[granularity]} 진입/확인 수</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart buckets={buckets} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card className="rounded-[14px] border-0 shadow-[0_0_0_1px_rgba(10,10,10,0.1)]">
            <CardHeader>
              <CardTitle className="text-base">첫방문 / 재방문 / 미확인</CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleBarChart bars={visitTypeBars} />
            </CardContent>
          </Card>

          <Card className="rounded-[14px] border-0 shadow-[0_0_0_1px_rgba(10,10,10,0.1)]">
            <CardHeader>
              <CardTitle className="text-base">화면 체류 · 이탈 퍼널</CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleBarChart bars={journeyBars} percentBase={journey.entered} />
            </CardContent>
          </Card>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <Card className="rounded-[14px] border-0 shadow-[0_0_0_1px_rgba(10,10,10,0.1)]">
            <CardHeader>
              <CardTitle className="text-base">고민 카테고리별 진입 수</CardTitle>
            </CardHeader>
            <CardContent>
              <DonutChart data={byCategory} />
            </CardContent>
          </Card>

          <Card className="rounded-[14px] border-0 shadow-[0_0_0_1px_rgba(10,10,10,0.1)]">
            <CardHeader>
              <CardTitle className="text-base">성별 분포</CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleBarChart bars={genderBars} />
            </CardContent>
          </Card>
        </div>

        <Card className="mt-4 rounded-[14px] border-0 shadow-[0_0_0_1px_rgba(10,10,10,0.1)]">
          <CardHeader>
            <CardTitle className="text-base">연령 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleBarChart bars={ageBars} />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
