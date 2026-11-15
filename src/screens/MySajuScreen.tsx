'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
const heart = '/assets/heart.png'
import { Loading } from '../components/Loading'
import { PixelButton } from '../components/PixelButton'
import { SajuSummaryCard } from '../components/SajuSummaryCard'
import { Toast } from '../components/Toast'
import { ILGAN_READINGS } from '../lib/ilganReadings'
import {
  formatDate,
  listOrdersForProfile,
  PAYMENT_STATUS_COLOR,
  PAYMENT_STATUS_LABEL,
  type OrderRow,
} from '../lib/ordersApi'
import { listSajuProfiles, profileToFormInput, MAX_PROFILES, type SajuProfileRow } from '../lib/profilesApi'
import { subConcernLabel } from '../lib/concerns'
import { computeSaju } from '../lib/sajuPipeline'

// PRD §6.5 — 내 사주(무료 구간): 사주 탭(최대 8) + 일간 5줄 해석 + 만세력.
// 유료 구간(고민 선택·분석·부적)은 단계 2에서 하단 버튼으로 이어진다.
const LAST_PROFILE_KEY = 'saju:lastProfileId'

export function MySajuScreen() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<SajuProfileRow[] | null>(null)
  // SSR 중에는 localStorage가 없으므로 가드 — 클라이언트 첫 렌더에서 읽는다.
  const [activeId, setActiveId] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : localStorage.getItem(LAST_PROFILE_KEY),
  )
  const [toast, setToast] = useState<string | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [orders, setOrders] = useState<OrderRow[]>([])

  useEffect(() => {
    listSajuProfiles()
      .then(setProfiles)
      .catch(() => setLoadFailed(true))
  }, [])

  const active = useMemo(() => {
    if (!profiles || profiles.length === 0) return null
    return profiles.find((p) => p.id === activeId) ?? profiles[0]
  }, [profiles, activeId])

  // 선택된 사주의 주문(구매한 고민 카드) — PRD §6.7
  useEffect(() => {
    if (!active) return
    let cancelled = false
    listOrdersForProfile(active.id)
      .then((rows) => {
        if (!cancelled) setOrders(rows)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [active])

  const input = useMemo(() => (active ? profileToFormInput(active) : null), [active])
  const computation = useMemo(() => (input ? computeSaju(input) : null), [input])
  const reading = computation ? ILGAN_READINGS[computation.result.pillarDetails.day.stem] : null

  function selectProfile(id: string) {
    setActiveId(id)
    localStorage.setItem(LAST_PROFILE_KEY, id)
  }

  function handleAdd() {
    if (profiles && profiles.length >= MAX_PROFILES) {
      setToast('최대 8명까지 등록할 수 있어요.')
      return
    }
    router.push('/saju/new')
  }

  if (loadFailed) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
        <p className="font-['Pretendard'] text-[16px] text-white/80">사주를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
      </div>
    )
  }

  if (!profiles) return <Loading />

  // 빈 상태 — PRD §6.5 "사주 정보를 등록해 주세요 :-)"
  if (profiles.length === 0) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-8 px-4">
        <img src={heart} alt="" className="h-16 w-[69px] object-cover" />
        <p className="font-['Pretendard'] text-[16px] text-white">사주 정보를 등록해 주세요 :-)</p>
        <div className="w-full max-w-[361px]">
          <PixelButton onClick={() => router.push('/saju/new')}>사주 정보 등록하기</PixelButton>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-10 px-4 py-10 md:px-8">
      {/* 사주 탭 — 가로 스크롤, 끝에 [+] */}
      <div className="w-full max-w-[345px] overflow-x-auto md:max-w-[480px]">
        <div className="flex w-max items-center gap-2 pb-1">
          {profiles.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => selectProfile(p.id)}
              className={`shrink-0 rounded-[4px] px-4 pt-[11px] pb-[10px] font-['Mona12'] text-[14px] tracking-[1.12px] shadow-[inset_0_3px_0_0_rgba(0,0,0,0.4)] ${
                active?.id === p.id ? 'bg-[#f31bc0] text-white' : 'bg-white text-[#101010]'
              }`}
            >
              {p.nickname}
            </button>
          ))}
          <button
            type="button"
            onClick={handleAdd}
            disabled={profiles.length >= MAX_PROFILES}
            className="shrink-0 rounded-[4px] border border-white/30 px-4 pt-[11px] pb-[10px] font-['Mona12'] text-[14px] text-white/80 disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>

      {input && <SajuSummaryCard input={input} />}

      {/* 일간 5줄 해석 (무료) */}
      {reading && (
        <div className="flex w-full max-w-[345px] flex-col items-center gap-5 md:max-w-[480px]">
          <h2 className="font-['Mona12'] text-[16px] font-bold md:text-[20px]">일간 이야기</h2>
          <div className="flex w-full flex-col gap-4 rounded-[4px] border border-white/50 bg-white/5 px-4 py-5 md:px-6">
            <p className="text-center font-['Mona12'] text-[14px] tracking-[1.12px] text-[#f31bc0]">{reading.title}</p>
            <ul className="flex flex-col gap-3">
              {reading.lines.map((line) => (
                <li key={line} className="font-['Pretendard'] text-[14px] leading-relaxed break-keep text-white/85 md:text-[16px]">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 구매한 고민 카드 목록 (PRD §6.7) */}
      {active && orders.filter((o) => o.payment_status !== 'canceled').length > 0 && (
        <div className="flex w-full max-w-[345px] flex-col gap-3 md:max-w-[480px]">
          <h2 className="text-center font-['Mona12'] text-[16px] font-bold md:text-[20px]">나의 고민</h2>
          {orders
            .filter((o) => o.payment_status !== 'canceled')
            .map((o) => (
              <div key={o.id} className="flex flex-col gap-2 rounded-[4px] border border-white/50 bg-white/5 px-4 py-4">
                <div className="flex items-center justify-between">
                  <span className="font-['Pretendard'] text-[14px] font-bold">{subConcernLabel(o.sub_concern)}</span>
                  <span className={`rounded-full border-2 px-2 py-[2px] font-['Mona12'] text-[11px] ${PAYMENT_STATUS_COLOR[o.payment_status]}`}>
                    {PAYMENT_STATUS_LABEL[o.payment_status]}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-['Pretendard'] text-[12px] text-[#888]">{formatDate(o.created_at)}</span>
                  {o.payment_status === 'awaiting_deposit' && (
                    <Link
                      href={`/saju/${active.id}/order?order=${o.id}`}
                      className="font-['Pretendard'] text-[13px] text-[#f31bc0] underline underline-offset-2"
                    >
                      입금 안내 보기
                    </Link>
                  )}
                  {o.payment_status === 'paid' && (
                    <Link
                      href={`/saju/${active.id}/order?order=${o.id}`}
                      className="font-['Pretendard'] text-[13px] text-[#f31bc0] underline underline-offset-2"
                    >
                      부적 보러 가기
                    </Link>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* 유료 구간 진입 — 고민 선택 → 결제 (단계 2) */}
      {active && (
        <Link
          href={`/saju/${active.id}/order`}
          className="rounded-full border border-white/30 px-5 py-3 font-['Mona12'] text-[14px] text-white active:translate-y-[2px]"
        >
          내 고민에 맞는 부적 보기
        </Link>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
