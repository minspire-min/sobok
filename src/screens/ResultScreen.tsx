import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import buttonBack from '../assets/button-back.svg'
import buttonComplete from '../assets/button-complete.svg'
import { SajuSummaryCard } from '../components/SajuSummaryCard'
import { computeElementScores, determineLackingElement, type Element } from '../lib/elementScore'
import { computeSaju } from '../lib/sajuPipeline'
import {
  clearLastInput,
  clearSubmissionId,
  clearTalismanSelection,
  loadSubmissionId,
  loadTalismanSelection,
  saveTalismanSelection,
} from '../lib/storage'
import { updateSubmissionSelection } from '../lib/submissionApi'
import { getTalismans } from '../lib/talismans'
import type { SajuFormInput } from '../lib/types'
import { usePageVisitTracking } from '../lib/usePageVisitTracking'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

type Props = {
  input: SajuFormInput
}

// Figma 48:224 "결과_계수" 기준. AI 해석(§5.3 [6])과 면책(§5.3 [7])은 Day 5 이후 범위 — 여기서는 다루지 않는다.
export function ResultScreen({ input }: Props) {
  const computation = useMemo(() => computeSaju(input), [input])
  const { result, timeUnknown } = computation
  const dayDetail = result.pillarDetails.day

  // PRD v2 §3.6/§3.7 R6·R7 — 부적 추천. category/gender는 입력 화면에서 전부 채워야만
  // 제출 가능하므로(R4) 이 시점엔 항상 값이 있다.
  const lacking = useMemo(
    () =>
      determineLackingElement(computeElementScores(result, timeUnknown), input.category!, dayDetail.element.stem as Element, input.gender!),
    [result, timeUnknown, input.category, input.gender, dayDetail.element.stem],
  )
  const talismanOptions = useMemo(() => getTalismans(input.category!, lacking.element), [input.category, lacking.element])

  // PRD v2 §3.8 R8 — 부적 선택 + [선택 완료]. 카드는 항상 다시 고를 수 있고, 지금 고른 것이
  // 마지막으로 완료한 것과 같을 때만 버튼이 비활성화된다(완료 후에도 다른 카드를 고르면 버튼이
  // 다시 활성화된다). 서버 저장(R12) 전까지는 기기 localStorage로 선택을 유지한다.
  const [selectedTalismanId, setSelectedTalismanId] = useState<string | null>(() => loadTalismanSelection()?.talismanId ?? null)
  const [confirmedTalismanId, setConfirmedTalismanId] = useState<string | null>(() => loadTalismanSelection()?.confirmedTalismanId ?? null)
  const { markCompleted } = usePageVisitTracking('result')

  useEffect(() => {
    window.gtag?.('event', 'confirm_saju')
  }, [])

  function selectTalisman(id: string) {
    setSelectedTalismanId(id)
    saveTalismanSelection({ talismanId: id, confirmedTalismanId })
  }

  function confirmTalisman() {
    if (!selectedTalismanId) return
    setConfirmedTalismanId(selectedTalismanId)
    saveTalismanSelection({ talismanId: selectedTalismanId, confirmedTalismanId: selectedTalismanId })
    const submissionId = loadSubmissionId()
    if (submissionId) void updateSubmissionSelection(submissionId, selectedTalismanId)
    markCompleted(submissionId ?? undefined)
  }

  // PRD v2 §3.10 R10 — 공용 기기: 돌아가기 누르면 기기에 남은 입력값·부적 선택을 지운다.
  function handleBackToInput() {
    clearLastInput()
    clearTalismanSelection()
    clearSubmissionId()
  }

  return (
    <div className="flex min-h-dvh flex-col items-center gap-[60px] bg-[#1a1a1a] px-4 py-[80px] text-white md:px-8">
      <SajuSummaryCard input={input} />

      {/* 부적 추천 */}
      <div className="flex w-full max-w-[345px] flex-col items-center gap-6 md:max-w-[480px]">
        <h2 className="w-full pt-[2px] text-center font-['Mona12'] text-[16px] font-bold tracking-[-0.31px] md:text-[20px]">부적 추천</h2>

        <div className="flex w-full flex-col items-start gap-3">
          {talismanOptions.map((t) => {
            const selected = selectedTalismanId === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTalisman(t.id)}
                className={`flex w-full flex-col items-center gap-4 rounded-[4px] bg-white/5 px-4 py-5 text-center md:gap-5 md:px-6 md:py-6 ${
                  selected ? 'border-2 border-[#f31bc0]' : 'border border-white/50'
                }`}
              >
                <div
                  className="flex items-center justify-center gap-3 font-['Mona12'] text-[18px] font-bold text-white md:text-[22px]"
                  style={{ textShadow: '0px 2px 0px black' }}
                >
                  <p>{t.korean}</p>
                  <p>|</p>
                  <p>{t.hanja}</p>
                </div>
                <div className="flex w-full flex-col items-center gap-2">
                  <p
                    className="font-['Pretendard'] text-[16px] font-bold text-white md:text-[20px]"
                    style={{ textShadow: '0px 2px 0px black' }}
                  >
                    {t.meaning}
                  </p>
                  <p className="font-['Pretendard'] text-[14px] text-white/80 md:text-[18px]">{t.description}</p>
                </div>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          disabled={!selectedTalismanId || selectedTalismanId === confirmedTalismanId}
          onClick={confirmTalisman}
          className="relative flex h-[40px] w-[200px] items-center justify-center disabled:opacity-40 md:h-[48px] md:w-[240px]"
        >
          <span className="absolute inset-[-2.5%_-0.5%]">
            <img src={buttonComplete} alt="" className="block size-full" />
          </span>
          <span className="relative font-['Mona12'] text-[14px] text-white md:text-[17px]">선택 완료</span>
        </button>
      </div>

      {/* 안내 배너 + 하단 버튼 */}
      <div className="flex w-full max-w-[345px] flex-col items-center gap-6 md:max-w-[480px]">
        <div className="flex flex-col items-center gap-2">
          <p className="text-center text-[12px] text-[#888] md:text-[15px]">
            <span>※</span> <span className="font-['Pretendard']">연주는 1월 1일이 아니라 입춘(2월 초)을 기준으로 바뀌어요.</span>
          </p>
          <p className="text-center text-[12px] text-[#888] md:text-[15px]">
            <span>※</span>{' '}
            <span className="font-['Pretendard']">태어난 시각은 서울 기준으로 보정했어요. 경계 시각 근처에서는 시주가 달라질 수 있어요.</span>
          </p>
          {timeUnknown && (
            <p className="text-center text-[12px] text-[#888] md:text-[15px]">
              <span>※</span>{' '}
              <span className="font-['Pretendard']">시간을 몰라 시주 없이 계산했어요. 오행도 6글자(시주 제외) 기준입니다.</span>
            </p>
          )}
        </div>

        <Link
          to="/event"
          state={{ forceNew: true }}
          onClick={handleBackToInput}
          className="relative flex h-[40px] w-[200px] items-center justify-center md:h-[48px] md:w-[240px]"
        >
          <span className="absolute inset-[-12.5%_-3.5%_-22.5%_-3.5%]">
            <img src={buttonBack} alt="" className="block size-full" />
          </span>
          <span className="relative font-['Mona12'] text-[14px] text-white md:text-[17px]">입력 화면으로 돌아가기</span>
        </Link>
      </div>
    </div>
  )
}
