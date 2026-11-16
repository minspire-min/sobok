'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { DetailModal } from '../components/DetailModal'
import { BankAppSheet } from '../components/BankAppSheet'
import { Loading } from '../components/Loading'
import { PixelButton } from '../components/PixelButton'
import { PixelCheckbox } from '../components/PixelCheckbox'
import { Toast } from '../components/Toast'
import { TOP_CONCERNS, findConcern, subConcernLabel } from '../lib/concerns'
import {
  createOrder,
  formatDate,
  getShipment,
  listOrdersForProfile,
  reportDeposit,
  requestExchange,
  requestReturn,
  upsertShippingAddress,
  PAYMENT_STATUS_COLOR,
  PAYMENT_STATUS_LABEL,
  SHIPPING_STATUS_LABEL,
  type OrderRow,
  type ShipmentRow,
} from '../lib/ordersApi'
import { listSajuProfiles, profileToFormInput, type SajuProfileRow } from '../lib/profilesApi'
import { BANK_ACCOUNT, bankAccountReady, formatWon, PRODUCTS, type ProductNo } from '../lib/products'
import { computeSaju } from '../lib/sajuPipeline'
import { determineElementForConcern } from '../lib/elementScore2'
import type { Element } from '../lib/elementScore'
import { issueTalismanPicks, selectTalisman, type TalismanPicks } from '../lib/talismansApi'
import { buildMockReading } from '../lib/mockReading'
import { markReadingViewed, saveReading, type ReadingRow } from '../lib/readingsApi'
import { downloadTalismanImage } from '../lib/talismanImage'

// PRD §6.5 고민 선택 → 상품 선택 → 주문 확인 → 입금 안내(§11.5).
// 금액·재구매 판정은 서버(create_order)가 다시 하므로 여기 계산은 표시용이다.
type Step = 'concern' | 'product' | 'confirm' | 'deposit' | 'reading' | 'talisman'

type Props = { profileId: string }

export function OrderScreen({ profileId }: Props) {
  const searchParams = useSearchParams()
  const [profile, setProfile] = useState<SajuProfileRow | null>(null)
  const [orders, setOrders] = useState<OrderRow[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  const [step, setStep] = useState<Step>('concern')
  const [topKey, setTopKey] = useState<string | null>(null)
  const [subKey, setSubKey] = useState<string | null>(null)
  const [concernText, setConcernText] = useState('')
  const [product, setProduct] = useState<ProductNo>(1)
  const [phone, setPhone] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [repurchaseAsk, setRepurchaseAsk] = useState<{ subKey: string; date: string } | null>(null)
  const [activeOrder, setActiveOrder] = useState<OrderRow | null>(null)
  const [bankSheetOpen, setBankSheetOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [picks, setPicks] = useState<TalismanPicks | null>(null)
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [confirmPick, setConfirmPick] = useState(false)
  const [reading, setReading] = useState<ReadingRow | null>(null)
  const [readingPage, setReadingPage] = useState(0)
  const [shipment, setShipment] = useState<ShipmentRow | null>(null)
  const [shipmentLoaded, setShipmentLoaded] = useState(false)

  const wantedOrderId = searchParams.get('order')
  const wantedShip = Boolean(searchParams.get('ship'))

  useEffect(() => {
    Promise.all([listSajuProfiles(), listOrdersForProfile(profileId)])
      .then(([profiles, orderRows]) => {
        const p = profiles.find((x) => x.id === profileId) ?? null
        setProfile(p)
        setOrders(orderRows)
        if (!p) setLoadFailed(true)
        // ?order= 로 들어오면 — 입금 대기면 입금 안내, 결제 완료면 분석으로 (?ship=1이면 배송 화면)
        if (wantedOrderId) {
          const o = orderRows.find((x) => x.id === wantedOrderId)
          if (o) {
            setActiveOrder(o)
            if (o.product > 1) void loadShipment(o.id)
            if (o.payment_status === 'paid' && !wantedShip) void goReading(o)
            else setStep('deposit')
          }
        }
      })
      .catch(() => setLoadFailed(true))
  }, [profileId, wantedOrderId, wantedShip])

  // 구매 이력(재구매 대상)·입금 대기 주문 — 서버 판정의 표시용 미러
  const purchasedBySub = useMemo(() => {
    const map = new Map<string, OrderRow>()
    for (const o of orders ?? []) {
      if (['paid', 'refund_requested', 'refund_reviewing'].includes(o.payment_status) && !map.has(o.sub_concern)) {
        map.set(o.sub_concern, o)
      }
    }
    return map
  }, [orders])

  const awaitingBySub = useMemo(() => {
    const map = new Map<string, OrderRow>()
    for (const o of orders ?? []) {
      if (o.payment_status === 'awaiting_deposit') map.set(o.sub_concern, o)
    }
    return map
  }, [orders])

  const isRepurchase = subKey ? purchasedBySub.has(subKey) : false
  const displayAmount = isRepurchase ? PRODUCTS[product].repurchasePrice : PRODUCTS[product].price

  function pickSub(key: string) {
    // 입금 대기 중인 같은 고민이 있으면 재결제 대신 그 주문으로 (PRD §6.7)
    const awaiting = awaitingBySub.get(key)
    if (awaiting) {
      setActiveOrder(awaiting)
      setStep('deposit')
      return
    }
    const purchased = purchasedBySub.get(key)
    if (purchased) {
      setRepurchaseAsk({ subKey: key, date: formatDate(purchased.paid_at ?? purchased.created_at) })
      return
    }
    setSubKey(key)
  }

  async function handleCreate() {
    if (!topKey || !subKey || !agreed || submitting) return
    setSubmitting(true)
    try {
      const order = await createOrder({
        profileId,
        product,
        topConcern: topKey,
        subConcern: subKey,
        concernText: concernText || undefined,
        cashReceiptPhone: phone || undefined,
      })
      setOrders((prev) => [order, ...(prev ?? [])])
      setActiveOrder(order)
      setStep('deposit')
    } catch {
      setToast('주문을 만들지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  async function loadShipment(orderId: string) {
    try {
      setShipment(await getShipment(orderId))
    } catch {
      setShipment(null)
    } finally {
      setShipmentLoaded(true)
    }
  }

  async function copy(text: string, message: string) {
    try {
      await navigator.clipboard.writeText(text)
      setToast(message)
    } catch {
      setToast('복사하지 못했어요. 길게 눌러 복사해 주세요.')
    }
  }

  // 주문 스냅샷 기준 사주 계산 + 보충 오행 결정(§8.2 v2) — 분석과 부적이 같은 결론을 쓴다(§8.6)
  function computeRecommendation(order: OrderRow) {
    const input = profileToFormInput(order.saju_snapshot)
    const computation = computeSaju(input)
    const dayElement = computation.result.pillarDetails.day.element.stem as Element
    const { element, basis } = determineElementForConcern(
      order.sub_concern,
      computation.result,
      computation.timeUnknown,
      dayElement,
      input.gender!,
    )
    return { input, computation, element, basis }
  }

  // 결제 완료 주문 → 분석 5페이지 (1회 생성 저장, 열람 기록 — 이후 환불 불가 결정 #4)
  async function goReading(order: OrderRow) {
    try {
      const { input, computation, element, basis } = computeRecommendation(order)
      const pages = buildMockReading({
        nickname: input.nickname,
        result: computation.result,
        timeUnknown: computation.timeUnknown,
        subKey: order.sub_concern,
        element,
        basis,
      })
      const saved = await saveReading(order.id, pages)
      await markReadingViewed(order.id)
      setReading(saved)
      setReadingPage(0)
      setActiveOrder(order)
      setStep('reading')
    } catch {
      setToast('분석을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.')
    }
  }

  // 부적 추천 발급(주문당 1회, 서버 저장) → 추천 화면
  async function goTalisman(order: OrderRow) {
    try {
      const { element, basis } = computeRecommendation(order)
      const issued = await issueTalismanPicks(order.id, element, basis)
      setPicks(issued)
      setPickedId(issued.chosen_id)
      setActiveOrder(order)
      setStep('talisman')
    } catch {
      setToast('부적 추천을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.')
    }
  }

  async function handleSelectTalisman() {
    if (!activeOrder || !pickedId) return
    try {
      const updated = await selectTalisman(activeOrder.id, pickedId)
      setPicks(updated)
      setConfirmPick(false)
      setToast('부적 선택이 완료됐어요.')
    } catch {
      setConfirmPick(false)
      setToast('선택에 실패했어요. 잠시 후 다시 시도해 주세요.')
    }
  }

  async function handleReportDeposit() {
    if (!activeOrder || activeOrder.deposit_reported_at) return
    try {
      await reportDeposit(activeOrder.id)
      const updated = { ...activeOrder, deposit_reported_at: new Date().toISOString() }
      setActiveOrder(updated)
      setOrders((prev) => (prev ?? []).map((o) => (o.id === updated.id ? updated : o)))
      setToast('입금 확인 요청이 접수됐어요.')
    } catch {
      setToast('요청에 실패했어요. 잠시 후 다시 시도해 주세요.')
    }
  }

  if (loadFailed) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <p className="font-['Pretendard'] text-[16px] text-white/80">정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
      </div>
    )
  }
  if (!profile || !orders) return <Loading />

  const selectedTop = TOP_CONCERNS.find((t) => t.key === topKey)

  return (
    <div className="flex flex-col items-center gap-8 px-4 py-10">
      <div className="flex w-full max-w-[361px] flex-col gap-8">
        {step !== 'deposit' && step !== 'talisman' && step !== 'reading' && (
          <p className="text-center font-['Mona12'] text-[20px] font-bold tracking-[1.28px]">
            {step === 'concern' ? `${profile.nickname}님의 고민` : step === 'product' ? '상품 선택' : '주문 확인'}
          </p>
        )}

        {/* 1) 고민 선택 — 상위 9 → 하위 40 + 자유 입력 (§6.5, 결정 #22) */}
        {step === 'concern' && (
          <>
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-[14px]">
              {TOP_CONCERNS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    setTopKey(t.key)
                    setSubKey(null)
                  }}
                  className={`rounded-[4px] px-4 pt-[11px] pb-[10px] font-['Mona12'] text-[14px] tracking-[1.12px] shadow-[inset_0_3px_0_0_rgba(0,0,0,0.4)] ${
                    topKey === t.key ? 'bg-[#f31bc0] text-white' : 'bg-white text-[#101010]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {selectedTop && (
              <div className="flex flex-col gap-4 rounded-[4px] border border-white/50 bg-white/5 px-4 py-5">
                <p className="text-center font-['Pretendard'] text-[14px] text-white/80">어떤 고민인가요?</p>
                <div className="flex flex-wrap justify-center gap-x-2 gap-y-3">
                  {selectedTop.subs.map((s) => {
                    const purchased = purchasedBySub.get(s.key)
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => pickSub(s.key)}
                        className={`rounded-[4px] px-3 pt-[9px] pb-2 font-['Pretendard'] text-[13px] shadow-[inset_0_3px_0_0_rgba(0,0,0,0.4)] ${
                          subKey === s.key ? 'bg-[#f31bc0] text-white' : 'bg-white text-[#101010]'
                        }`}
                      >
                        {s.label}
                        {purchased && (
                          <span className="ml-1 text-[11px] text-[#8c8c8c]">
                            구매함 · {formatDate(purchased.paid_at ?? purchased.created_at)}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {subKey && (
              <div className="flex flex-col gap-2">
                <textarea
                  value={concernText}
                  maxLength={200}
                  onChange={(e) => setConcernText(e.target.value)}
                  placeholder="구체적인 고민을 적어 주시면 분석과 부적에 참고해요. (선택)"
                  className="h-[96px] w-full resize-none rounded-[4px] bg-white px-4 py-3 font-['Pretendard'] text-[16px] text-[#101010] shadow-[inset_0_3px_0_0_rgba(0,0,0,0.4)] placeholder:text-[#b1b1b1] focus:outline-none"
                />
                <p className="text-right font-['Pretendard'] text-[12px] text-[#888]">{concernText.length}/200</p>
              </div>
            )}

            <PixelButton onClick={() => setStep('product')} disabled={!topKey || !subKey}>
              다음
            </PixelButton>
          </>
        )}

        {/* 2) 상품 선택 — 결제2·3은 단계 3에서 오픈 (PRD §15) */}
        {step === 'product' && (
          <>
            <div className="flex flex-col gap-3">
              {([1, 2, 3] as ProductNo[]).map((no) => {
                const p = PRODUCTS[no]
                const price = isRepurchase ? p.repurchasePrice : p.price
                const selected = product === no
                return (
                  <button
                    key={no}
                    type="button"
                    disabled={!p.available}
                    onClick={() => setProduct(no)}
                    className={`flex flex-col gap-2 rounded-[4px] bg-white/5 px-4 py-5 text-left disabled:opacity-40 ${
                      selected && p.available ? 'border-2 border-[#f31bc0]' : 'border border-white/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-['Mona12'] text-[14px] tracking-[1.12px]">{p.name}</span>
                      <span className="font-['Pretendard'] text-[16px] font-bold text-[#f31bc0]">{formatWon(price)}</span>
                    </div>
                    <p className="font-['Pretendard'] text-[13px] leading-relaxed text-white/70">{p.desc}</p>
                    {!p.available && <p className="font-['Pretendard'] text-[12px] text-[#888]">실물 배송 준비 중이에요</p>}
                  </button>
                )
              })}
            </div>
            {isRepurchase && (
              <p className="text-center text-[12px] text-[#888]">
                <span>※</span>{' '}
                <span className="font-['Pretendard']">같은 고민 재구매라 재구매 가격이 적용돼요. 새 분석 없이 부적만 새로 받아요.</span>
              </p>
            )}
            <div className="flex flex-col gap-3">
              <PixelButton onClick={() => setStep('confirm')}>다음</PixelButton>
              <button
                type="button"
                onClick={() => setStep('concern')}
                className="font-['Pretendard'] text-[13px] text-[#888] underline underline-offset-2"
              >
                이전으로
              </button>
            </div>
          </>
        )}

        {/* 3) 주문 확인 — 금액·동의·현금영수증 (§6.5, §17.6) */}
        {step === 'confirm' && topKey && subKey && (
          <>
            <div className="flex flex-col gap-3 rounded-[4px] border border-white/50 bg-white/5 px-4 py-5">
              <Row label="사주" value={profile.nickname} />
              <Row label="고민" value={`${findConcern(topKey, subKey)?.top.label} · ${subConcernLabel(subKey)}`} />
              {concernText && <Row label="작성한 고민" value={concernText} multiline />}
              <Row label="상품" value={PRODUCTS[product].name} />
              <div className="flex items-center justify-between border-t border-white/10 pt-3">
                <span className="font-['Pretendard'] text-[14px] text-white/70">결제 금액</span>
                <span className="font-['Pretendard'] text-[20px] font-bold text-[#f31bc0]">
                  {formatWon(displayAmount)}
                  <span className="ml-1 text-[12px] font-normal text-[#888]">부가세 별도</span>
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 11))}
                placeholder="현금영수증 휴대폰 번호 (선택)"
                className="h-[48px] w-full rounded-[4px] bg-white px-4 font-['Pretendard'] text-[16px] text-[#101010] shadow-[inset_0_3px_0_0_rgba(0,0,0,0.4)] placeholder:text-[#b1b1b1] focus:outline-none"
              />
              <p className="font-['Pretendard'] text-[12px] leading-relaxed text-[#888]">
                계좌이체도 현금 거래라 현금영수증을 받을 수 있어요. 번호를 남기면 발급해 드려요.
              </p>
            </div>

            <PixelCheckbox
              id="order-agree"
              label="결제 후에는 고민을 바꿀 수 없고, 분석 열람 후에는 환불이 되지 않는 것에 동의합니다."
              className="font-['Pretendard']"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />

            <div className="flex flex-col gap-3">
              <PixelButton onClick={() => void handleCreate()} disabled={!agreed || submitting}>
                입금 안내 받기
              </PixelButton>
              <button
                type="button"
                onClick={() => setStep('product')}
                className="font-['Pretendard'] text-[13px] text-[#888] underline underline-offset-2"
              >
                이전으로
              </button>
            </div>
          </>
        )}

        {/* 4) 입금 안내 — §11.5 입금 대기 화면 */}
        {step === 'deposit' && activeOrder && (
          <>
            <DepositPanel
              order={activeOrder}
              nickname={profile.nickname}
              onCopy={copy}
              onOpenBankSheet={() => setBankSheetOpen(true)}
              onReportDeposit={() => void handleReportDeposit()}
            />
            {activeOrder.payment_status === 'paid' && (
              <PixelButton onClick={() => void goReading(activeOrder)}>고민별 사주 보기</PixelButton>
            )}
            {activeOrder.payment_status === 'paid' && activeOrder.product > 1 && shipmentLoaded && (
              <ShippingSection
                order={activeOrder}
                shipment={shipment}
                onSaved={setShipment}
                onToast={setToast}
                onOrderUpdated={(o) => {
                  setActiveOrder(o)
                  setOrders((prev) => (prev ?? []).map((x) => (x.id === o.id ? o : x)))
                }}
              />
            )}
          </>
        )}

        {/* 5) 분석 5페이지 — 가로 스와이프 + 페이지 점, 마지막에 [부적 추천 보기] (§6.5, 2-9) */}
        {step === 'reading' && activeOrder && reading && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col items-center gap-2">
              <p className="font-['Mona12'] text-[20px] font-bold tracking-[1.28px]">고민별 사주 분석</p>
              <span className="rounded-full border-2 border-[#f3b526] px-3 py-[2px] font-['Mona12'] text-[11px] text-[#f3b526]">
                임시 분석 · 정식 분석 준비 중
              </span>
            </div>

            <div
              className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
              onScroll={(e) => {
                const el = e.currentTarget
                setReadingPage(Math.round(el.scrollLeft / (el.clientWidth * 0.92)))
              }}
            >
              {reading.pages.map((page, i) => (
                <div
                  key={page.title}
                  className="flex w-[92%] shrink-0 snap-center flex-col gap-4 rounded-[4px] border border-white/50 bg-white/5 px-5 py-6"
                >
                  <p className="text-center font-['Mona12'] text-[15px] font-bold tracking-[1.12px] text-[#f31bc0]">
                    {i + 1}. {page.title}
                  </p>
                  <p className="font-['Pretendard'] text-[15px] leading-relaxed break-keep text-white/90">{page.body}</p>
                </div>
              ))}
            </div>

            {/* 페이지 점 — 픽셀 점 5개, 현재 위치 마젠타 (§9.5) */}
            <div className="flex items-center justify-center gap-2">
              {reading.pages.map((_, i) => (
                <span key={i} className={`size-2 ${i === readingPage ? 'bg-[#f31bc0]' : 'bg-white/30'}`} />
              ))}
            </div>

            <PixelButton onClick={() => void goTalisman(activeOrder)}>부적 추천 보기</PixelButton>
          </div>
        )}

        {/* 5) 부적 추천·선택 — 3종 중 1종, 확인 팝업 후 잠금 (§6.5, 2-10) */}
        {step === 'talisman' && activeOrder && picks && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col items-center gap-2">
              <p className="font-['Mona12'] text-[20px] font-bold tracking-[1.28px]">부적 추천</p>
              <p className="font-['Pretendard'] text-[13px] text-white/70">
                {subConcernLabel(activeOrder.sub_concern)} · 보충 오행 {picks.element}
              </p>
            </div>

            <div className="flex w-full flex-col items-start gap-3">
              {picks.recommended.map((t) => {
                const locked = Boolean(picks.chosen_id)
                const isChosen = picks.chosen_id === t.id
                const selected = locked ? isChosen : pickedId === t.id
                if (locked && !isChosen) return null
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={locked}
                    onClick={() => setPickedId(t.id)}
                    className={`relative flex w-full flex-col items-center gap-4 rounded-[4px] bg-white/5 px-4 py-5 text-center ${
                      selected ? 'border-2 border-[#f31bc0]' : 'border border-white/50'
                    }`}
                  >
                    {t.personal && (
                      <span className="absolute top-3 left-3 rounded-full border-2 border-[#f31bc0] px-2 py-[2px] font-['Mona12'] text-[11px] text-[#f31bc0]">
                        퍼스널 추천
                      </span>
                    )}
                    <div
                      className="flex items-center justify-center gap-3 pt-2 font-['Mona12'] text-[18px] font-bold text-white"
                      style={{ textShadow: '0px 2px 0px black' }}
                    >
                      <p>{t.korean}</p>
                      <p>|</p>
                      <p>{t.hanja}</p>
                    </div>
                    <div className="flex w-full flex-col items-center gap-2">
                      <p className="font-['Pretendard'] text-[16px] font-bold text-white" style={{ textShadow: '0px 2px 0px black' }}>
                        {t.meaning}
                      </p>
                      <p className="font-['Pretendard'] text-[14px] text-white/80">{t.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>

            {picks.chosen_id ? (
              <div className="flex flex-col items-center gap-3">
                <p className="text-center font-['Pretendard'] text-[14px] text-white/85">부적 선택이 완료됐어요.</p>
                {/* 이미지 저장 — 임시 디자인(시트 #4), 픽셀 템플릿이 나오면 교체 (2-11·2-12) */}
                <div className="flex w-full gap-2">
                  {(() => {
                    const chosen = picks.recommended.find((t) => t.id === picks.chosen_id)
                    if (!chosen) return null
                    return (
                      <>
                        <button
                          type="button"
                          onClick={() => downloadTalismanImage(chosen, 'wallpaper')}
                          className="h-[44px] flex-1 rounded-[4px] border border-white/50 font-['Pretendard'] text-[13px] text-white active:translate-y-[2px]"
                        >
                          배경화면용 저장 (9:16)
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadTalismanImage(chosen, 'square')}
                          className="h-[44px] flex-1 rounded-[4px] border border-white/50 font-['Pretendard'] text-[13px] text-white active:translate-y-[2px]"
                        >
                          정사각 저장 (1:1)
                        </button>
                      </>
                    )
                  })()}
                </div>
                <p className="text-center text-[12px] text-[#888]">
                  <span>※</span> <span className="font-['Pretendard']">지금 이미지는 임시 디자인이에요. 정식 픽셀 디자인이 준비되면 다시 받을 수 있어요.</span>
                </p>
              </div>
            ) : (
              <PixelButton onClick={() => setConfirmPick(true)} disabled={!pickedId}>
                선택 완료
              </PixelButton>
            )}

            <button
              type="button"
              onClick={() => activeOrder && void goReading(activeOrder)}
              className="font-['Pretendard'] text-[13px] text-[#888] underline underline-offset-2"
            >
              분석 다시 보기
            </button>
          </div>
        )}
      </div>

      {/* 재구매 확인 알럿 (PRD §6.7) */}
      {repurchaseAsk && (
        <DetailModal title="다시 선택할까요?" onClose={() => setRepurchaseAsk(null)}>
          <div className="flex flex-col gap-4">
            <p className="font-['Pretendard'] text-[14px] leading-relaxed text-[#101010]">
              {repurchaseAsk.date}에 선택한 기록이 있습니다. 다시 선택하시겠습니까?
              <br />
              <span className="text-[#8c8c8c]">재구매 가격이 적용되고, 새 분석 없이 부적만 새로 받아요.</span>
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRepurchaseAsk(null)}
                className="h-[44px] flex-1 rounded-[4px] border border-[#101010] font-['Pretendard'] text-[14px] text-[#101010]"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubKey(repurchaseAsk.subKey)
                  setRepurchaseAsk(null)
                }}
                className="h-[44px] flex-1 rounded-[4px] bg-[#f31bc0] font-['Pretendard'] text-[14px] text-white"
              >
                다시 선택
              </button>
            </div>
          </div>
        </DetailModal>
      )}

      {/* 부적 선택 확인 팝업 — "선택 후에는 변경할 수 없어요" (§4 잠금 규칙) */}
      {confirmPick && (
        <DetailModal title="이 부적으로 할까요?" onClose={() => setConfirmPick(false)}>
          <div className="flex flex-col gap-4">
            <p className="font-['Pretendard'] text-[14px] leading-relaxed text-[#101010]">선택 후에는 변경할 수 없어요.</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmPick(false)}
                className="h-[44px] flex-1 rounded-[4px] border border-[#101010] font-['Pretendard'] text-[14px] text-[#101010]"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void handleSelectTalisman()}
                className="h-[44px] flex-1 rounded-[4px] bg-[#f31bc0] font-['Pretendard'] text-[14px] text-white"
              >
                선택 완료
              </button>
            </div>
          </div>
        </DetailModal>
      )}

      {bankSheetOpen && activeOrder && (
        <BankAppSheet account={BANK_ACCOUNT.account} onCopied={setToast} onClose={() => setBankSheetOpen(false)} />
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

// 배송지 입력·배송 상태 (§6.5 — 발송 전까지만 수정, 3-1·3-2)
function ShippingSection({
  order,
  shipment,
  onSaved,
  onToast,
  onOrderUpdated,
}: {
  order: OrderRow
  shipment: ShipmentRow | null
  onSaved: (s: ShipmentRow) => void
  onToast: (m: string) => void
  onOrderUpdated: (o: OrderRow) => void
}) {
  const [editing, setEditing] = useState(!shipment)
  const [receiver, setReceiver] = useState(shipment?.receiver ?? '')
  const [phone, setPhone] = useState(shipment?.phone ?? '')
  const [postcode, setPostcode] = useState(shipment?.postcode ?? '')
  const [address, setAddress] = useState(shipment?.address ?? '')
  const [detail, setDetail] = useState(shipment?.address_detail ?? '')
  const [memo, setMemo] = useState(shipment?.memo ?? '')
  const [saving, setSaving] = useState(false)

  // 교환·반품 (3-5) — 배송 완료 후 7일 내(서버도 검증)
  const [claimOpen, setClaimOpen] = useState<'exchange' | 'return' | null>(null)
  const [claimReason, setClaimReason] = useState('')
  const [rBank, setRBank] = useState('')
  const [rAccount, setRAccount] = useState('')
  const [rHolder, setRHolder] = useState('')
  const [claimBusy, setClaimBusy] = useState(false)

  const status = order.shipping_status ?? 'awaiting'
  const canEdit = status === 'awaiting'
  const [mountedAt] = useState(() => Date.now()) // 렌더 중 Date.now() 호출 방지(순수성)
  const within7Days = shipment?.delivered_at
    ? mountedAt - new Date(shipment.delivered_at).getTime() < 7 * 24 * 60 * 60 * 1000
    : false

  async function submitClaim() {
    if (claimBusy || !claimOpen) return
    if (claimReason.trim().length < 5) {
      onToast('사유를 5자 이상 적어 주세요.')
      return
    }
    if (claimOpen === 'return' && (!rBank.trim() || !rAccount.trim() || !rHolder.trim())) {
      onToast('환불받을 계좌 정보를 모두 입력해 주세요.')
      return
    }
    setClaimBusy(true)
    try {
      const updated =
        claimOpen === 'exchange'
          ? await requestExchange(order.id, claimReason)
          : await requestReturn({ orderId: order.id, reason: claimReason, bank: rBank, account: rAccount, holder: rHolder })
      onOrderUpdated(updated)
      setClaimOpen(null)
      setClaimReason('')
      onToast(claimOpen === 'exchange' ? '교환 신청이 접수됐어요.' : '반품 신청이 접수됐어요.')
    } catch (e) {
      onToast(
        e instanceof Error && e.message.includes('PERIOD_OVER')
          ? '배송 완료 후 7일이 지나 신청할 수 없어요. 문의하기로 남겨 주세요.'
          : '신청에 실패했어요. 잠시 후 다시 시도해 주세요.',
      )
    } finally {
      setClaimBusy(false)
    }
  }

  const inputCls =
    "h-[48px] w-full rounded-[4px] bg-white px-4 font-['Pretendard'] text-[16px] text-[#101010] shadow-[inset_0_3px_0_0_rgba(0,0,0,0.4)] placeholder:text-[#b1b1b1] focus:outline-none"

  async function save() {
    if (saving) return
    if (!receiver.trim() || !phone.trim() || !postcode.trim() || !address.trim()) {
      onToast('받는 사람, 연락처, 우편번호, 주소를 입력해 주세요.')
      return
    }
    setSaving(true)
    try {
      const row = await upsertShippingAddress({
        orderId: order.id,
        receiver,
        phone,
        postcode,
        address,
        addressDetail: detail || undefined,
        memo: memo || undefined,
      })
      onSaved(row)
      setEditing(false)
      onToast('배송지가 저장됐어요. 부적을 그려서 보내 드릴게요.')
    } catch {
      onToast('배송지 저장에 실패했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-[4px] border border-white/50 bg-white/5 px-4 py-5">
      <div className="flex items-center justify-between">
        <p className="font-['Mona12'] text-[14px] font-bold tracking-[1.12px]">배송</p>
        <span className="rounded-full border-2 border-[#f31bc0] px-2 py-[2px] font-['Mona12'] text-[11px] text-[#f31bc0]">
          {SHIPPING_STATUS_LABEL[status]}
        </span>
      </div>

      {editing && canEdit ? (
        <div className="flex flex-col gap-2">
          <input className={inputCls} value={receiver} onChange={(e) => setReceiver(e.target.value)} placeholder="받는 사람" />
          <input
            className={inputCls}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/[^0-9-]/g, ''))}
            placeholder="연락처"
            inputMode="tel"
          />
          <input
            className={inputCls}
            value={postcode}
            onChange={(e) => setPostcode(e.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
            placeholder="우편번호 (숫자 5자리)"
            inputMode="numeric"
          />
          <input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="주소" />
          <input className={inputCls} value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="상세주소 (선택)" />
          <input className={inputCls} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="배송 메모 (선택)" />
          <p className="text-[12px] text-[#888]">
            <span>※</span> <span className="font-['Pretendard']">우편번호 검색은 준비 중이에요. 숫자 5자리를 직접 입력해 주세요.</span>
          </p>
          <PixelButton onClick={() => void save()} disabled={saving}>
            배송지 저장
          </PixelButton>
        </div>
      ) : shipment ? (
        <div className="flex flex-col gap-2">
          <p className="font-['Pretendard'] text-[14px] text-white/90">
            {shipment.receiver} · {shipment.phone}
          </p>
          <p className="font-['Pretendard'] text-[14px] leading-relaxed break-keep text-white/80">
            ({shipment.postcode}) {shipment.address} {shipment.address_detail ?? ''}
          </p>
          {shipment.memo && <p className="font-['Pretendard'] text-[13px] text-[#888]">메모: {shipment.memo}</p>}

          {status === 'awaiting' && (
            <>
              <p className="font-['Pretendard'] text-[13px] text-white/70">부적을 그리고 있어요. 발송되면 송장번호를 알려 드릴게요.</p>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="self-start font-['Pretendard'] text-[13px] text-[#888] underline underline-offset-2"
              >
                배송지 수정 (발송 전까지)
              </button>
            </>
          )}
          {status === 'shipping' && shipment.carrier && shipment.tracking_no && (
            <a
              href={`https://search.naver.com/search.naver?query=${encodeURIComponent(`${shipment.carrier} ${shipment.tracking_no}`)}`}
              target="_blank"
              rel="noreferrer"
              className="font-['Pretendard'] text-[14px] text-[#f31bc0] underline underline-offset-2"
            >
              {shipment.carrier} {shipment.tracking_no} — 배송 조회
            </a>
          )}
          {status === 'delivered' && (
            <>
              <p className="font-['Pretendard'] text-[13px] leading-relaxed text-white/70">
                배송이 완료됐어요. 부적이 마음에 닿았길 바라요.
              </p>
              {within7Days && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setClaimOpen('exchange')}
                    className="font-['Pretendard'] text-[13px] text-white/60 underline underline-offset-2"
                  >
                    교환 신청
                  </button>
                  <button
                    type="button"
                    onClick={() => setClaimOpen('return')}
                    className="font-['Pretendard'] text-[13px] text-white/60 underline underline-offset-2"
                  >
                    반품 신청
                  </button>
                  <span className="font-['Pretendard'] text-[12px] text-[#888]">(배송 완료 후 7일 내)</span>
                </div>
              )}
            </>
          )}
          {status === 'exchange_requested' && (
            <p className="font-['Pretendard'] text-[13px] leading-relaxed text-white/70">
              교환 신청이 접수됐어요. 확인 후 새로 그려서 보내 드릴게요.
            </p>
          )}
          {status === 'exchange_shipping' && shipment.carrier && shipment.tracking_no && (
            <a
              href={`https://search.naver.com/search.naver?query=${encodeURIComponent(`${shipment.carrier} ${shipment.tracking_no}`)}`}
              target="_blank"
              rel="noreferrer"
              className="font-['Pretendard'] text-[14px] text-[#f31bc0] underline underline-offset-2"
            >
              새 부적이 가고 있어요 — {shipment.carrier} {shipment.tracking_no} 배송 조회
            </a>
          )}
          {status === 'exchange_done' && (
            <p className="font-['Pretendard'] text-[13px] text-white/70">교환이 완료됐어요.</p>
          )}
          {status === 'return_requested' && (
            <p className="font-['Pretendard'] text-[13px] leading-relaxed break-keep text-white/70">
              반품 신청이 접수됐어요. 반품 보낼 주소와 방법을 이메일로 안내드릴게요.
            </p>
          )}
          {status === 'return_shipping' && (
            <p className="font-['Pretendard'] text-[13px] text-white/70">반품 확인 중이에요. 확인되면 환불해 드려요.</p>
          )}
          {status === 'return_done' && (
            <p className="font-['Pretendard'] text-[13px] text-white/70">반품과 환불이 완료됐어요. 이용해 주셔서 감사해요.</p>
          )}
        </div>
      ) : (
        <p className="font-['Pretendard'] text-[13px] text-white/70">배송지를 입력해 주세요.</p>
      )}

      {/* 교환·반품 신청 모달 — 하자 사진 첨부는 보류(시트 #14), 사유 텍스트로 확인 */}
      {claimOpen && (
        <DetailModal
          title={claimOpen === 'exchange' ? '교환 신청' : '반품 신청'}
          onClose={() => setClaimOpen(null)}
        >
          <div className="flex flex-col gap-3">
            <p className="font-['Pretendard'] text-[13px] leading-relaxed break-keep text-[#8c8c8c]">
              {claimOpen === 'exchange'
                ? '파손·오배송 등 사유를 적어 주세요. 확인 후 새로 그려서 보내 드려요.'
                : `사유와 환불받을 계좌를 적어 주세요. 분석을 이미 열람한 경우 분석 금액을 뺀 차액이 환불돼요${
                    order.refund_amount ? '' : order.reading_first_viewed_at ? ` (예상 ${formatWon(order.amount - (order.kind === 'new' ? 10000 : 2000))})` : ` (전액 ${formatWon(order.amount)})`
                  }. 반품 보낼 주소는 접수 후 안내드려요.`}
            </p>
            <textarea
              value={claimReason}
              onChange={(e) => setClaimReason(e.target.value.slice(0, 300))}
              placeholder="사유를 적어 주세요"
              className="h-[88px] resize-none rounded-[4px] border border-[#ddd] px-3 py-2 font-['Pretendard'] text-[14px] text-[#101010] focus:outline-none"
            />
            {claimOpen === 'return' && (
              <>
                <input
                  value={rBank}
                  onChange={(e) => setRBank(e.target.value)}
                  placeholder="환불받을 은행명"
                  className="h-[44px] rounded-[4px] border border-[#ddd] px-3 font-['Pretendard'] text-[14px] text-[#101010] focus:outline-none"
                />
                <input
                  value={rAccount}
                  onChange={(e) => setRAccount(e.target.value.replace(/[^0-9-]/g, ''))}
                  placeholder="계좌번호"
                  inputMode="numeric"
                  className="h-[44px] rounded-[4px] border border-[#ddd] px-3 font-['Pretendard'] text-[14px] text-[#101010] focus:outline-none"
                />
                <input
                  value={rHolder}
                  onChange={(e) => setRHolder(e.target.value)}
                  placeholder="예금주"
                  className="h-[44px] rounded-[4px] border border-[#ddd] px-3 font-['Pretendard'] text-[14px] text-[#101010] focus:outline-none"
                />
              </>
            )}
            <button
              type="button"
              disabled={claimBusy}
              onClick={() => void submitClaim()}
              className="h-[44px] rounded-[4px] bg-[#f31bc0] font-['Pretendard'] text-[14px] text-white disabled:opacity-40"
            >
              {claimOpen === 'exchange' ? '교환 신청하기' : '반품 신청하기'}
            </button>
          </div>
        </DetailModal>
      )}
    </div>
  )
}

function Row({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className={`flex ${multiline ? 'flex-col gap-1' : 'items-center justify-between'}`}>
      <span className="shrink-0 font-['Pretendard'] text-[14px] text-white/70">{label}</span>
      <span className={`font-['Pretendard'] text-[14px] break-keep ${multiline ? 'leading-relaxed text-white/85' : ''}`}>{value}</span>
    </div>
  )
}

function DepositPanel({
  order,
  nickname,
  onCopy,
  onOpenBankSheet,
  onReportDeposit,
}: {
  order: OrderRow
  nickname: string
  onCopy: (text: string, message: string) => Promise<void>
  onOpenBankSheet: () => void
  onReportDeposit: () => void
}) {
  // 은행 앱 버튼은 모바일에서만 (§11.5)
  const [isMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches)
  const reported = Boolean(order.deposit_reported_at)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2">
        <p className="font-['Mona12'] text-[20px] font-bold tracking-[1.28px]">입금 안내</p>
        <span
          className={`rounded-full border-2 px-3 py-1 font-['Mona12'] text-[12px] ${PAYMENT_STATUS_COLOR[order.payment_status]}`}
        >
          {PAYMENT_STATUS_LABEL[order.payment_status]}
        </span>
      </div>

      {/* 계좌 안내 카드 — 숫자는 Pretendard (§9.2) */}
      <div className="flex flex-col gap-3 rounded-[4px] bg-white px-4 py-5">
        {bankAccountReady ? (
          <>
            <div className="flex items-center justify-between">
              <span className="font-['Pretendard'] text-[14px] text-[#8c8c8c]">계좌</span>
              <span className="font-['Pretendard'] text-[16px] font-bold text-[#101010]">
                {BANK_ACCOUNT.bank} {BANK_ACCOUNT.account}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-['Pretendard'] text-[14px] text-[#8c8c8c]">예금주</span>
              <span className="font-['Pretendard'] text-[14px] text-[#101010]">{BANK_ACCOUNT.holder}</span>
            </div>
          </>
        ) : (
          <p className="font-['Pretendard'] text-[14px] leading-relaxed text-[#101010]">
            입금 계좌를 준비하고 있어요. 계좌가 등록되면 이 화면과 이메일로 안내해 드릴게요.
          </p>
        )}
        <div className="flex items-center justify-between border-t border-[#eee] pt-3">
          <span className="font-['Pretendard'] text-[14px] text-[#8c8c8c]">입금 금액</span>
          <span className="font-['Pretendard'] text-[22px] font-bold text-[#101010]">{formatWon(order.amount)}</span>
        </div>
        <p className="font-['Pretendard'] text-[13px] leading-relaxed text-[#101010]">
          입금자명 뒤에 주문 코드 <span className="font-bold">{order.order_code}</span>를 붙여 주세요.
          <br />
          <span className="text-[#8c8c8c]">예: {nickname}{order.order_code}</span>
        </p>
        <div className="flex gap-2">
          {bankAccountReady && (
            <button
              type="button"
              onClick={() => void onCopy(BANK_ACCOUNT.account, '계좌번호를 복사했어요')}
              className="h-[40px] flex-1 rounded-[4px] border border-[#101010] font-['Pretendard'] text-[13px] text-[#101010]"
            >
              계좌번호 복사
            </button>
          )}
          <button
            type="button"
            onClick={() => void onCopy(String(order.amount), '금액을 복사했어요')}
            className="h-[40px] flex-1 rounded-[4px] border border-[#101010] font-['Pretendard'] text-[13px] text-[#101010]"
          >
            금액 복사
          </button>
        </div>
        {isMobile && bankAccountReady && (
          <button
            type="button"
            onClick={onOpenBankSheet}
            className="h-[40px] w-full rounded-[4px] bg-[#101010] font-['Pretendard'] text-[13px] text-white"
          >
            은행 앱으로 보내기
          </button>
        )}
      </div>

      {order.payment_status === 'awaiting_deposit' && (
        <>
          <PixelButton onClick={onReportDeposit} disabled={reported}>
            {reported ? '입금 확인 요청 접수됨' : '입금했어요'}
          </PixelButton>
          <div className="flex flex-col items-center gap-2">
            {reported && (
              <p className="text-center text-[12px] text-[#888]">
                <span>※</span> <span className="font-['Pretendard']">평일 기준 반나절 안에 확인해 드려요.</span>
              </p>
            )}
            <p className="text-center text-[12px] text-[#888]">
              <span>※</span>{' '}
              <span className="font-['Pretendard']">
                입금 기한은 {formatDate(order.deposit_due_at)}까지예요. 기한이 지나면 주문이 자동으로 취소돼요.
              </span>
            </p>
          </div>
        </>
      )}
      {order.payment_status === 'paid' && (
        <p className="text-center font-['Pretendard'] text-[14px] leading-relaxed text-white/85">
          결제가 확인됐어요. 아래에서 부적 추천을 받아 보세요. 분석 5페이지는 준비 중이에요.
        </p>
      )}
    </div>
  )
}
