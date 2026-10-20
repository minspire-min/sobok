import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { PillarKey } from 'ssaju'
import buttonBack from '../assets/button-back.svg'
import buttonComplete from '../assets/button-complete.svg'
import infoIcon from '../assets/icon-info.svg'
import { DetailModal } from '../components/DetailModal'
import { STEM_CHARACTER } from '../lib/characters'
import { computeElementScores, determineLackingElement, type Element } from '../lib/elementScore'
import { BRANCH_ANIMAL, ELEMENT_COLOR, ELEMENT_COLOR_WORD, ELEMENT_ORDER, ELEMENT_OUTLINE_COLOR } from '../lib/elements'
import { SINSAL_GLOSSARY, TEN_GOD_GLOSSARY, normalizeSinsalName, sinsalDisplayName } from '../lib/glossary'
import { computeSaju } from '../lib/sajuPipeline'
import { clearLastInput, clearTalismanSelection, loadTalismanSelection, saveTalismanSelection } from '../lib/storage'
import { getTalismans } from '../lib/talismans'
import { formatKoreanTime } from '../lib/time'
import type { SajuFormInput } from '../lib/types'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

type Props = {
  input: SajuFormInput
}

const PILLAR_ORDER: PillarKey[] = ['hour', 'day', 'month', 'year']
const PILLAR_LABEL: Record<PillarKey, string> = { hour: '시주', day: '일주', month: '월주', year: '연주' }

// Figma 48:224 "결과_계수" 기준. AI 해석(§5.3 [6])과 면책(§5.3 [7])은 Day 5 이후 범위 — 여기서는 다루지 않는다.
export function ResultScreen({ input }: Props) {
  const [modal, setModal] = useState<'tenGods' | 'sinsal' | 'talismanConfirm' | null>(null)
  const computation = useMemo(() => computeSaju(input), [input])
  const { result, timeUnknown, solarDate } = computation

  const dayDetail = result.pillarDetails.day
  const dayBadgeText = `${ELEMENT_COLOR_WORD[dayDetail.element.stem]} ${BRANCH_ANIMAL[dayDetail.branchKo]}`
  const characterImg = STEM_CHARACTER[dayDetail.stem]

  // PRD v2 §3.6/§3.7 R6·R7 — 부적 추천. category/gender는 입력 화면에서 전부 채워야만
  // 제출 가능하므로(R4) 이 시점엔 항상 값이 있다.
  const lacking = useMemo(
    () =>
      determineLackingElement(computeElementScores(result, timeUnknown), input.category!, dayDetail.element.stem as Element, input.gender!),
    [result, timeUnknown, input.category, input.gender, dayDetail.element.stem],
  )
  const talismanOptions = useMemo(() => getTalismans(input.category!, lacking.element), [input.category, lacking.element])

  // PRD v2 §3.8 R8 — 부적 선택 + [선택 완료]. 서버 저장(R12) 전까지는 기기 localStorage로 잠금을 유지한다.
  const [selectedTalismanId, setSelectedTalismanId] = useState<string | null>(() => loadTalismanSelection()?.talismanId ?? null)
  const [talismanConfirmed, setTalismanConfirmed] = useState(() => loadTalismanSelection()?.confirmed ?? false)

  const timeLabel = timeUnknown ? '시간 미상' : formatKoreanTime(input.hour, input.minute)

  const visiblePillars = PILLAR_ORDER.filter((key) => !(key === 'hour' && timeUnknown))

  // 신살 — 기둥별 표시용(중복 허용)과 팝업용(중복 제거) 두 가지로 사용
  const pillarSals = useMemo(
    () => visiblePillars.map((key) => [result.sals[key].twelveSal, ...result.sals[key].specialSals]),
    [result.sals, visiblePillars],
  )
  // 년살/도화살은 같은 별로 취급해 모달에 한 번만 — normalizeSinsalName()으로 묶어서 중복 제거
  const sinsalTags = useMemo(() => {
    const tags = new Set<string>()
    pillarSals.forEach((names) => names.forEach((n) => tags.add(normalizeSinsalName(n))))
    return Array.from(tags)
  }, [pillarSals])

  const maxElementCount = Math.max(1, ...ELEMENT_ORDER.map((el) => result.fiveElements[el] ?? 0))

  useEffect(() => {
    window.gtag?.('event', 'confirm_saju')
  }, [])

  function selectTalisman(id: string) {
    if (talismanConfirmed) return
    setSelectedTalismanId(id)
    saveTalismanSelection({ talismanId: id, confirmed: false })
  }

  function confirmTalisman() {
    if (!selectedTalismanId) return
    setTalismanConfirmed(true)
    saveTalismanSelection({ talismanId: selectedTalismanId, confirmed: true })
    setModal(null)
  }

  // PRD v2 §3.10 R10 — 공용 기기: 돌아가기 누르면 기기에 남은 입력값·부적 선택을 지운다.
  function handleBackToInput() {
    clearLastInput()
    clearTalismanSelection()
  }

  return (
    <div className="flex min-h-dvh flex-col items-center gap-[60px] bg-[#1a1a1a] px-4 py-[80px] text-white">
      <div className="flex w-full max-w-[345px] flex-col items-center gap-8">
        {/* 헤더 */}
        <div className="flex w-full flex-col items-center gap-4 text-center">
          <h1 className="font-['Mona12'] text-[32px] font-bold tracking-[1.28px]">{input.nickname}의 만세력</h1>
          <p className="font-['Pretendard'] text-[14px] tracking-[-0.15px] text-[#b1b1b1]">
            {solarDate.year}.{String(solarDate.month).padStart(2, '0')}.{String(solarDate.day).padStart(2, '0')} (
            {input.calendarType === 'solar' ? '양' : '음'}) {timeLabel} · {input.gender}
          </p>
        </div>

        {/* 일주 배지 */}
        <div className="flex items-center gap-6 rounded-[4px] bg-white/5 px-6 py-3">
          <div className="flex size-[56px] shrink-0 items-center justify-center p-[10px]">
            <img src={characterImg} alt="" className="size-full object-contain" style={{ imageRendering: 'pixelated' }} />
          </div>
          <span className="relative inline-block font-['Mona12'] text-[24px] font-bold">
            {/* 아웃라인을 글자 바깥쪽에만 두르기 위해 굵은 stroke 레이어를 흰색 채움 레이어 아래에 깐다 */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ WebkitTextStroke: `4px ${ELEMENT_OUTLINE_COLOR[dayDetail.element.stem]}`, color: 'transparent' }}
            >
              {dayBadgeText}
            </span>
            <span className="relative text-white [text-shadow:0px_2px_0px_black]">{dayBadgeText}</span>
          </span>
        </div>

        {/* 만세력 표 */}
        <div className="flex w-full flex-col items-center gap-3">
          <table className="w-full table-fixed rounded-[4px] border border-white/50 text-center">
            <thead>
              <tr className="border-b border-white/40">
                {PILLAR_ORDER.map((key) => (
                  <th key={key} className={`py-[2px] font-['Pretendard'] text-[10px] font-normal tracking-[0.06px] text-[#b1b1b1] ${key === 'day' ? 'bg-[#f31bc0]/15' : ''}`}>
                    {PILLAR_LABEL[key]}
                  </th>
                ))}
              </tr>
              <tr>
                {PILLAR_ORDER.map((key) => {
                  const isHourUnknown = key === 'hour' && timeUnknown
                  return (
                    <th key={key} className={`px-2 py-1 font-['Pretendard'] text-[12px] font-normal tracking-[0.06px] text-white ${key === 'day' ? 'bg-[#f31bc0]/15' : ''}`}>
                      {isHourUnknown ? <span className="text-white/30">?</span> : key === 'day' ? '(나)' : result.tenGods[key].stem}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-white/10">
                {PILLAR_ORDER.map((key) => {
                  const isHourUnknown = key === 'hour' && timeUnknown
                  const detail = result.pillarDetails[key]
                  return (
                    <td key={key} className={`py-2 ${key === 'day' ? 'bg-[#f31bc0]/15' : ''}`}>
                      {isHourUnknown ? (
                        <span className="text-[22px] text-white/30">?</span>
                      ) : (
                        <div className="flex flex-col items-center">
                          <span className="font-['Pretendard'] text-[22px] font-bold tracking-[-0.26px]" style={{ color: ELEMENT_COLOR[detail.element.stem] }}>
                            {detail.stem}
                          </span>
                          <span className="font-['Pretendard'] text-[11px] tracking-[0.06px] text-[#666]">({detail.stemKo})</span>
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
              <tr className="border-b border-white/10">
                {PILLAR_ORDER.map((key) => {
                  const isHourUnknown = key === 'hour' && timeUnknown
                  const detail = result.pillarDetails[key]
                  return (
                    <td key={key} className={`py-2 ${key === 'day' ? 'bg-[#f31bc0]/15' : ''}`}>
                      {isHourUnknown ? (
                        <span className="text-[22px] text-white/30">?</span>
                      ) : (
                        <div className="flex flex-col items-center">
                          <span className="font-['Pretendard'] text-[22px] font-bold tracking-[-0.26px]" style={{ color: ELEMENT_COLOR[detail.element.branch] }}>
                            {detail.branch}
                          </span>
                          <span className="font-['Pretendard'] text-[11px] tracking-[0.06px] text-[#666]">({detail.branchKo})</span>
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
              <tr>
                {PILLAR_ORDER.map((key) => {
                  const isHourUnknown = key === 'hour' && timeUnknown
                  return (
                    <td key={key} className={`px-2 py-1 font-['Pretendard'] text-[12px] tracking-[0.06px] text-white ${key === 'day' ? 'bg-[#f31bc0]/15' : ''}`}>
                      {isHourUnknown ? <span className="text-white/30">?</span> : result.tenGods[key].branch}
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
          <button type="button" onClick={() => setModal('tenGods')} className="min-h-[44px] font-['Mona12'] text-[12px] text-white">
            자세히 보기
          </button>
        </div>

        {/* 신살 */}
        <div className="flex w-full flex-col items-start gap-3">
          <div className="grid w-full grid-cols-[24px_1fr_24px] items-center gap-3">
            <div aria-hidden />
            <h2 className="text-center font-['Mona12'] text-[16px] font-bold tracking-[-0.31px]">신살</h2>
            <button type="button" onClick={() => setModal('sinsal')} className="-m-3 flex size-[44px] items-center justify-self-end">
              <img src={infoIcon} alt="신살 설명 보기" className="size-[16.667px]" />
            </button>
          </div>
          <div className="flex w-full">
            {visiblePillars.map((key, i) => (
              <div key={key} className={`flex flex-1 flex-col items-center gap-2 py-3 ${key === 'day' ? 'bg-[#f31bc0]/15' : ''}`}>
                {pillarSals[i].map((name) => (
                  <p key={name} className="font-['Pretendard'] text-[14px] tracking-[0.06px]">
                    {sinsalDisplayName(name)}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* 오행 분포 — 상단 간격만 40px (다른 섹션 사이는 32px) */}
        <div className="mt-2 flex w-full flex-col items-center gap-2">
          <h2 className="font-['Mona12'] text-[16px] font-bold tracking-[-0.31px]">오행 분포</h2>
          <div className="flex w-full items-end gap-2">
            {ELEMENT_ORDER.map((el) => {
              const count = result.fiveElements[el] ?? 0
              return (
                <div key={el} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-[68px] w-full items-end">
                    <div
                      className="w-full rounded-t-[2px]"
                      style={{ height: count > 0 ? `${(count / maxElementCount) * 100}%` : 0, backgroundColor: ELEMENT_COLOR[el] }}
                    />
                  </div>
                  <p className="font-['Pretendard'] text-[12px]">
                    {el} {count}
                  </p>
                </div>
              )
            })}
          </div>
          {timeUnknown && <p className="font-['Pretendard'] text-[12px] text-[#888]">6글자 기준</p>}
        </div>
      </div>

      {/* 부적 추천 */}
      <div className="flex w-full max-w-[345px] flex-col items-center gap-5">
        <div className="flex w-full flex-col items-start gap-3">
          <h2 className="w-full pt-[2px] text-center font-['Mona12'] text-[16px] font-bold tracking-[-0.31px]">부적 추천</h2>
          {talismanOptions.map((t) => {
            const selected = selectedTalismanId === t.id
            return (
              <button
                key={t.id}
                type="button"
                disabled={talismanConfirmed}
                onClick={() => selectTalisman(t.id)}
                className={`flex w-full flex-col items-start gap-2 rounded-[4px] bg-white/5 px-6 py-3 text-left ${
                  selected ? 'border-2 border-[#f31bc0]' : 'border border-white/50'
                }`}
              >
                <p
                  className="font-['Mona12'] text-[18px] font-bold text-white"
                  style={selected ? undefined : { textShadow: '0px 2px 0px black' }}
                >
                  {t.korean} - {t.hanja}
                </p>
                <p className="font-['Pretendard'] text-[16px] text-white/80">{t.description}</p>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          disabled={!selectedTalismanId || talismanConfirmed}
          onClick={() => setModal('talismanConfirm')}
          className="relative flex h-[40px] w-[200px] items-center justify-center disabled:opacity-40"
        >
          <span className="absolute inset-[-2.5%_-0.5%]">
            <img src={buttonComplete} alt="" className="block size-full" />
          </span>
          <span className="relative font-['Mona12'] text-[14px] text-white">선택 완료</span>
        </button>
      </div>

      {/* 안내 배너 + 하단 버튼 */}
      <div className="flex w-full max-w-[345px] flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-2">
          <p className="text-center text-[12px] text-[#888]">
            <span>※</span> <span className="font-['Pretendard']">연주는 1월 1일이 아니라 입춘(2월 초)을 기준으로 바뀌어요.</span>
          </p>
          <p className="text-center text-[12px] text-[#888]">
            <span>※</span>{' '}
            <span className="font-['Pretendard']">태어난 시각은 서울 기준으로 보정했어요. 경계 시각 근처에서는 시주가 달라질 수 있어요.</span>
          </p>
          {timeUnknown && (
            <p className="text-center text-[12px] text-[#888]">
              <span>※</span>{' '}
              <span className="font-['Pretendard']">시간을 몰라 시주 없이 계산했어요. 오행도 6글자(시주 제외) 기준입니다.</span>
            </p>
          )}
        </div>

        <Link
          to="/"
          state={{ forceNew: true }}
          onClick={handleBackToInput}
          className="relative flex h-[40px] w-[200px] items-center justify-center"
        >
          <span className="absolute inset-[-12.5%_-3.5%_-22.5%_-3.5%]">
            <img src={buttonBack} alt="" className="block size-full" />
          </span>
          <span className="relative font-['Mona12'] text-[14px] text-white">입력 화면으로 돌아가기</span>
        </Link>
      </div>

      {modal === 'tenGods' && (
        <DetailModal title="십신" onClose={() => setModal(null)}>
          <div className="flex flex-col gap-4 text-[16px]">
            {visiblePillars.map((key) => {
              const gods = result.tenGods[key]
              return (
                <div key={key} className="flex flex-col gap-2">
                  <p className="font-['Pretendard'] font-bold text-[#101010]">{PILLAR_LABEL[key]}</p>
                  {key === 'day' ? (
                    <p className="font-['Pretendard'] text-[#101010]">천간: (나)</p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <p className="font-['Pretendard'] text-[#101010]">천간: {gods.stem}</p>
                      <p className="font-['Pretendard'] text-[#8c8c8c]">{TEN_GOD_GLOSSARY[gods.stem] ?? ''}</p>
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <p className="font-['Pretendard'] text-[#101010]">지지: {gods.branch}</p>
                    <p className="font-['Pretendard'] text-[#8c8c8c]">{TEN_GOD_GLOSSARY[gods.branch] ?? ''}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </DetailModal>
      )}

      {modal === 'sinsal' && (
        <DetailModal title="신살" onClose={() => setModal(null)}>
          <div className="flex flex-col gap-4 text-[16px]">
            {sinsalTags.map((name) => (
              <div key={name} className="flex flex-col gap-2">
                <p className="font-['Pretendard'] font-bold text-[#101010]">{sinsalDisplayName(name)}</p>
                <p className="font-['Pretendard'] text-[#8c8c8c]">{SINSAL_GLOSSARY[name] ?? ''}</p>
              </div>
            ))}
          </div>
        </DetailModal>
      )}

      {modal === 'talismanConfirm' && (
        <DetailModal title="선택 완료" onClose={() => setModal(null)}>
          <div className="flex flex-col gap-6">
            <p className="font-['Pretendard'] text-[16px] text-[#101010]">선택 후에는 변경할 수 없어요.</p>
            <div className="flex w-full gap-3">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="h-[44px] flex-1 rounded-[4px] bg-white text-[16px] text-[#101010] shadow-[inset_0_3px_0_0_rgba(0,0,0,0.2)]"
              >
                취소
              </button>
              <button
                type="button"
                onClick={confirmTalisman}
                className="h-[44px] flex-1 rounded-[4px] bg-[#f31bc0] text-[16px] text-white shadow-[inset_0_3px_0_0_rgba(0,0,0,0.2)]"
              >
                선택 완료
              </button>
            </div>
          </div>
        </DetailModal>
      )}
    </div>
  )
}
