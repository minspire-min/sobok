import { Check, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { SajuSummaryCard } from '../components/SajuSummaryCard'
import { CATEGORIES } from '../lib/categories'
import { TALISMANS } from '../lib/talismans'
import type { SajuFormInput } from '../lib/types'
import { AdminLayout } from './AdminLayout'
import { AdminAuthError, generateReading, getSubmission, updateSubmission } from './api'
import type { AdminSubmission } from './types'

function categoryLabel(key: string): string {
  return CATEGORIES.find((c) => c.key === key)?.label ?? key
}

function talisman(id: string) {
  return TALISMANS.find((t) => t.id === id)
}

const LACKING_REASON_LABEL = { lowest: '최저점', category: '카테고리 기준', random: '무작위' } as const

// admin에서 참여자가 보는 만세력을 그대로 보여주기 위해 SajuFormInput 형태로 맞춘다.
function toSajuFormInput(s: AdminSubmission): SajuFormInput {
  return {
    nickname: s.nickname,
    calendarType: s.calendarType,
    isLeapMonth: s.isLeapMonth,
    year: s.year,
    month: s.month,
    day: s.day,
    hour: s.hour,
    minute: s.minute,
    timeUnknown: s.timeUnknown,
    gender: s.gender,
    category: s.category,
    consent: true,
  }
}

export function DetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [submission, setSubmission] = useState<AdminSubmission | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingTalismanId, setPendingTalismanId] = useState<string | null>(null)
  const [memo, setMemo] = useState('')
  const [saving, setSaving] = useState(false)
  const [readingLoading, setReadingLoading] = useState(false)
  const [readingError, setReadingError] = useState<string | null>(null)
  const [talismanRefreshing, setTalismanRefreshing] = useState(false)

  useEffect(() => {
    if (!id) return
    getSubmission(id)
      .then((s) => {
        setSubmission(s)
        setMemo(s.memo)
        setPendingTalismanId(s.selectedTalismanId)
      })
      .catch((e) => {
        if (e instanceof AdminAuthError) {
          navigate('../login', { replace: true })
          return
        }
        setError(e instanceof Error ? e.message : String(e))
      })
  }, [id, navigate])

  if (error) return <AdminLayout><div className="p-6 text-sm text-destructive">{error}</div></AdminLayout>
  if (!submission) return <AdminLayout><div className="p-6 text-sm text-muted-foreground">불러오는 중...</div></AdminLayout>

  async function handleConfirmTalisman() {
    if (pendingTalismanId === submission!.selectedTalismanId) return
    const updated = await updateSubmission(submission!.id, { selectedTalismanId: pendingTalismanId })
    setSubmission(updated)
  }

  // 참여자가 폰에서 고르는 걸 보면서 확인할 때 전체 페이지를 새로고침하지 않아도 되게 한다.
  async function handleRefreshTalisman() {
    setTalismanRefreshing(true)
    try {
      const fresh = await getSubmission(submission!.id)
      setSubmission(fresh)
      setPendingTalismanId(fresh.selectedTalismanId)
    } catch (e) {
      if (e instanceof AdminAuthError) {
        navigate('../login', { replace: true })
        return
      }
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setTalismanRefreshing(false)
    }
  }

  async function handleMemoSave() {
    setSaving(true)
    try {
      const updated = await updateSubmission(submission!.id, { memo })
      setSubmission(updated)
    } finally {
      setSaving(false)
    }
  }

  async function handleGenerateReading() {
    setReadingLoading(true)
    setReadingError(null)
    try {
      const updated = await generateReading(submission!.id)
      setSubmission(updated)
    } catch (e) {
      setReadingError(e instanceof Error ? e.message : String(e))
    } finally {
      setReadingLoading(false)
    }
  }

  return (
    <AdminLayout>
      <div className="mx-auto w-[1105px] p-6">
        <Button
          variant="outline"
          className="mb-6 rounded-[10px] border-[#c9c9c9] px-4 py-1.5 text-sm font-medium text-[#0a0a0a]"
          onClick={() => navigate('..')}
        >
          ← 목록으로
        </Button>

        <div className="flex items-start gap-10">
          <div className="w-[393px] shrink-0 overflow-hidden bg-[#1a1a1a] px-4 py-20 text-white">
            {submission.anonymizedAt ? (
              <p className="text-center text-sm text-white/60">
                접수 15일 경과로 개인정보(생년월일시 등)가 파기되어 만세력을 표시할 수 없어요.
                <br />
                집계 지표만 통계 화면에 남아 있습니다.
              </p>
            ) : (
              <SajuSummaryCard input={toSajuFormInput(submission)} />
            )}
          </div>

          <div className="flex w-[624px] shrink-0 flex-col gap-4">
          <Card className="rounded-[14px] border-0 py-5 shadow-[0_0_0_1px_rgba(10,10,10,0.1)]">
            <CardHeader>
              <CardTitle className="text-lg">{submission.anonymizedAt ? '(개인정보 파기됨)' : submission.nickname}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-3 text-base text-[#0a0a0a]">
                <span>고민 카테고리:</span>
                <span className="rounded-[12px] bg-[#f31bc0]/15 px-3 py-1 text-sm text-[#0a0a0a]">{categoryLabel(submission.category)}</span>
              </div>
              <div className="flex items-center gap-5 text-base text-[#0a0a0a]">
                <span>부족 오행:</span>
                <span>
                  {submission.lackingElement} ({LACKING_REASON_LABEL[submission.lackingReason]})
                </span>
              </div>
              <div className="flex items-center gap-5 text-base text-[#0a0a0a]">
                <span>확인일시:</span>
                <span>{new Date(submission.createdAt).toLocaleString('ko-KR')}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[14px] border-0 py-5 shadow-[0_0_0_1px_rgba(10,10,10,0.1)]">
            <CardHeader>
              <CardTitle className="text-base">부적 선택</CardTitle>
              <CardAction>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="부적 선택 새로고침"
                  onClick={handleRefreshTalisman}
                  disabled={talismanRefreshing}
                >
                  <RefreshCw className={talismanRefreshing ? 'animate-spin' : ''} />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                {submission.talismanIds.map((tid) => {
                  const t = talisman(tid)
                  const selected = pendingTalismanId === tid
                  return (
                    <button
                      key={tid}
                      type="button"
                      onClick={() => setPendingTalismanId(tid)}
                      className={`flex w-full items-center justify-between gap-2 rounded-[10px] border py-2 pr-2 pl-2.5 text-left ${
                        selected ? 'border-[#f31bc0] bg-[#f31bc0]/15' : 'border-[#e5e5e5] bg-white'
                      }`}
                    >
                      <p className="text-base text-[#0a0a0a]">
                        <span className="font-bold">{t?.korean} </span>
                        <span>
                          ({t?.hanja}) — {t?.meaning} / {t?.description}
                        </span>
                      </p>
                      {selected && <Check className="size-4 shrink-0 text-[#f31bc0]" />}
                    </button>
                  )
                })}
              </div>
              <div className="flex w-full items-center justify-between">
                <p className="text-xs text-[#737373]">
                  {submission.selectedBy &&
                    submission.selectedAt &&
                    `${submission.selectedBy === 'admin' ? '관리자가 변경' : '참여자가 선택'} · ${new Date(submission.selectedAt).toLocaleString('ko-KR')}`}
                </p>
                <Button
                  size="sm"
                  className="rounded-[12px] px-2.5 py-2"
                  disabled={pendingTalismanId === submission.selectedTalismanId}
                  onClick={handleConfirmTalisman}
                >
                  선택 수정
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[14px] border-0 py-5 shadow-[0_0_0_1px_rgba(10,10,10,0.1)]">
            <CardHeader>
              <CardTitle className="text-base">메모</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Textarea
                className="rounded-[10px] border-[#e5e5e5]"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={3}
              />
              <div className="flex w-full justify-end">
                <Button size="sm" className="rounded-[12px] px-2.5 py-2" onClick={handleMemoSave} disabled={saving}>
                  {saving ? '저장 중...' : '메모 저장'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[14px] border-0 py-5 shadow-[0_0_0_1px_rgba(10,10,10,0.1)]">
            <CardHeader>
              <CardTitle className="text-base">AI 간단 풀이</CardTitle>
            </CardHeader>
            <CardContent>
              {submission.reading ? (
                <p className="whitespace-pre-line text-sm">{submission.reading}</p>
              ) : (
                <div className="flex items-center gap-5">
                  <Button size="sm" className="rounded-[12px] px-2.5 py-2" onClick={handleGenerateReading} disabled={readingLoading}>
                    {readingLoading ? '생성 중...' : '풀이 생성'}
                  </Button>
                  {submission.readingFailedAt && (
                    <p className="text-xs text-[#e7000b]">이전 생성 실패 ({new Date(submission.readingFailedAt).toLocaleString('ko-KR')})</p>
                  )}
                  {readingError && <p className="text-xs text-[#e7000b]">{readingError}</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    </AdminLayout>
  )
}
