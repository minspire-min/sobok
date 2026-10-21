import { useMemo, useState } from 'react'
import type { PillarKey } from 'ssaju'
import infoIcon from '../assets/icon-info.svg'
import { STEM_CHARACTER } from '../lib/characters'
import { BRANCH_ANIMAL, ELEMENT_COLOR, ELEMENT_COLOR_WORD, ELEMENT_ORDER, ELEMENT_OUTLINE_COLOR } from '../lib/elements'
import { SINSAL_GLOSSARY, TEN_GOD_GLOSSARY, normalizeSinsalName, sinsalDisplayName } from '../lib/glossary'
import { computeSaju } from '../lib/sajuPipeline'
import { formatKoreanTime } from '../lib/time'
import type { SajuFormInput } from '../lib/types'
import { DetailModal } from './DetailModal'

type Props = {
  input: SajuFormInput
}

const PILLAR_ORDER: PillarKey[] = ['hour', 'day', 'month', 'year']
const PILLAR_LABEL: Record<PillarKey, string> = { hour: '시주', day: '일주', month: '월주', year: '연주' }

// ResultScreen(참여자)과 admin 상세 화면이 똑같이 보여주는 만세력 요약 블록 — 둘 다 재사용.
export function SajuSummaryCard({ input }: Props) {
  const [modal, setModal] = useState<'tenGods' | 'sinsal' | null>(null)
  const computation = useMemo(() => computeSaju(input), [input])
  const { result, timeUnknown, solarDate } = computation

  const dayDetail = result.pillarDetails.day
  const dayBadgeText = `${ELEMENT_COLOR_WORD[dayDetail.element.stem]} ${BRANCH_ANIMAL[dayDetail.branchKo]}`
  const characterImg = STEM_CHARACTER[dayDetail.stem]

  const timeLabel = timeUnknown ? '시간 미상' : formatKoreanTime(input.hour, input.minute)
  const visiblePillars = PILLAR_ORDER.filter((key) => !(key === 'hour' && timeUnknown))

  // ssaju가 같은 기둥에 twelveSal과 specialSals로 같은 별(또는 년살/도화살처럼 같은 별 취급되는
  // 쌍)을 중복으로 내려줄 때가 있어, 정규화한 이름 기준으로 기둥 내 중복을 한 번만 보이게 거른다.
  const pillarSals = useMemo(
    () =>
      visiblePillars.map((key) => {
        const raw = [result.sals[key].twelveSal, ...result.sals[key].specialSals]
        const seen = new Set<string>()
        return raw.filter((name) => {
          const normalized = normalizeSinsalName(name)
          if (seen.has(normalized)) return false
          seen.add(normalized)
          return true
        })
      }),
    [result.sals, visiblePillars],
  )
  const sinsalTags = useMemo(() => {
    const tags = new Set<string>()
    pillarSals.forEach((names) => names.forEach((n) => tags.add(normalizeSinsalName(n))))
    return Array.from(tags)
  }, [pillarSals])

  const maxElementCount = Math.max(1, ...ELEMENT_ORDER.map((el) => result.fiveElements[el] ?? 0))

  return (
    <div className="flex w-full max-w-[345px] flex-col items-center gap-8 md:max-w-[480px]">
      {/* 헤더 */}
      <div className="flex w-full flex-col items-center gap-4 text-center">
        <h1 className="font-['Mona12'] text-[32px] font-bold tracking-[1.28px] md:text-[40px]">{input.nickname}의 만세력</h1>
        <p className="font-['Pretendard'] text-[14px] tracking-[-0.15px] text-[#b1b1b1] md:text-[18px]">
          {solarDate.year}.{String(solarDate.month).padStart(2, '0')}.{String(solarDate.day).padStart(2, '0')} (
          {input.calendarType === 'solar' ? '양' : '음'}) {timeLabel} · {input.gender}
        </p>
      </div>

      {/* 일주 배지 */}
      <div className="flex items-center gap-6 rounded-[4px] bg-white/5 px-6 py-3 md:px-8 md:py-4">
        <div className="flex size-[56px] shrink-0 items-center justify-center p-[10px] md:size-[70px]">
          <img src={characterImg} alt="" className="size-full object-contain" style={{ imageRendering: 'pixelated' }} />
        </div>
        <span className="relative inline-block font-['Mona12'] text-[24px] font-bold md:text-[30px]">
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
                <th key={key} className={`py-[2px] font-['Pretendard'] text-[10px] font-normal tracking-[0.06px] text-[#b1b1b1] md:text-[13px] ${key === 'day' ? 'bg-[#f31bc0]/15' : ''}`}>
                  {PILLAR_LABEL[key]}
                </th>
              ))}
            </tr>
            <tr>
              {PILLAR_ORDER.map((key) => {
                const isHourUnknown = key === 'hour' && timeUnknown
                return (
                  <th key={key} className={`px-2 py-1 font-['Pretendard'] text-[12px] font-normal tracking-[0.06px] text-white md:text-[15px] ${key === 'day' ? 'bg-[#f31bc0]/15' : ''}`}>
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
                        <span className="font-['Pretendard'] text-[22px] font-bold tracking-[-0.26px] md:text-[28px]" style={{ color: ELEMENT_COLOR[detail.element.stem] }}>
                          {detail.stem}
                        </span>
                        <span className="font-['Pretendard'] text-[11px] tracking-[0.06px] text-[#666] md:text-[14px]">({detail.stemKo})</span>
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
                        <span className="font-['Pretendard'] text-[22px] font-bold tracking-[-0.26px] md:text-[28px]" style={{ color: ELEMENT_COLOR[detail.element.branch] }}>
                          {detail.branch}
                        </span>
                        <span className="font-['Pretendard'] text-[11px] tracking-[0.06px] text-[#666] md:text-[14px]">({detail.branchKo})</span>
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
                  <td key={key} className={`px-2 py-1 font-['Pretendard'] text-[12px] tracking-[0.06px] text-white md:text-[15px] ${key === 'day' ? 'bg-[#f31bc0]/15' : ''}`}>
                    {isHourUnknown ? <span className="text-white/30">?</span> : result.tenGods[key].branch}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
        <button type="button" onClick={() => setModal('tenGods')} className="min-h-[44px] font-['Mona12'] text-[12px] text-white md:text-[15px]">
          자세히 보기
        </button>
      </div>

      {/* 신살 */}
      <div className="flex w-full flex-col items-start gap-3">
        <div className="grid w-full grid-cols-[24px_1fr_24px] items-center gap-3">
          <div aria-hidden />
          <h2 className="text-center font-['Mona12'] text-[16px] font-bold tracking-[-0.31px] md:text-[20px]">신살</h2>
          <button type="button" onClick={() => setModal('sinsal')} className="-m-3 flex size-[44px] items-center justify-self-end">
            <img src={infoIcon} alt="신살 설명 보기" className="size-[16.667px] md:size-[22px]" />
          </button>
        </div>
        <div className="flex w-full">
          {visiblePillars.map((key, i) => (
            <div key={key} className={`flex flex-1 flex-col items-center gap-2 py-3 ${key === 'day' ? 'bg-[#f31bc0]/15' : ''}`}>
              {pillarSals[i].map((name) => (
                <p key={name} className="font-['Pretendard'] text-[14px] tracking-[0.06px] md:text-[17px]">
                  {sinsalDisplayName(name)}
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* 오행 분포 */}
      <div className="flex w-full flex-col items-center gap-3">
        <h2 className="font-['Mona12'] text-[16px] font-bold tracking-[-0.31px] md:text-[20px]">오행 분포</h2>
        <div className="flex w-full items-end gap-2">
          {ELEMENT_ORDER.map((el) => {
            const count = result.fiveElements[el] ?? 0
            return (
              <div key={el} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-[68px] w-full items-end md:h-[90px]">
                  <div
                    className="w-full rounded-t-[2px]"
                    style={{ height: count > 0 ? `${(count / maxElementCount) * 100}%` : 0, backgroundColor: ELEMENT_COLOR[el] }}
                  />
                </div>
                <p className="font-['Pretendard'] text-[12px] md:text-[15px]">
                  {el} {count}
                </p>
              </div>
            )
          })}
        </div>
        {timeUnknown && <p className="font-['Pretendard'] text-[12px] text-[#888] md:text-[15px]">6글자 기준</p>}
      </div>

      {modal === 'tenGods' && (
        <DetailModal title="십신" onClose={() => setModal(null)}>
          <div className="flex flex-col gap-4 text-[16px] md:text-[19px]">
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
          <div className="flex flex-col gap-4 text-[16px] md:text-[19px]">
            {sinsalTags.map((name) => (
              <div key={name} className="flex flex-col gap-2">
                <p className="font-['Pretendard'] font-bold text-[#101010]">{sinsalDisplayName(name)}</p>
                <p className="font-['Pretendard'] text-[#8c8c8c]">{SINSAL_GLOSSARY[name] ?? ''}</p>
              </div>
            ))}
          </div>
        </DetailModal>
      )}
    </div>
  )
}
