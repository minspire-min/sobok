import { useState } from 'react'
import heart from '../assets/heart.png'
import { Bezel } from '../components/Bezel'
import { DetailModal } from '../components/DetailModal'
import { Loading } from '../components/Loading'
import { PixelButton } from '../components/PixelButton'
import { PixelCheckbox } from '../components/PixelCheckbox'
import { TimePickerModal } from '../components/TimePickerModal'
import { CATEGORIES } from '../lib/categories'
import { formatKoreanTime } from '../lib/time'
import { formatDateInput, parseDateText } from '../lib/textInputs'
import type { SajuFormInput } from '../lib/types'
import { validateForm } from '../lib/validation'

function makeDefaultInput(): SajuFormInput {
  return {
    nickname: '',
    calendarType: 'solar',
    isLeapMonth: false,
    year: 0,
    month: 0,
    day: 0,
    hour: 0,
    minute: 0,
    timeUnknown: false,
    gender: null,
    category: null,
    consent: false,
  }
}

type Props = {
  onSubmit: (input: SajuFormInput) => void
}

// Figma 73:914 — 필드 구성/순서를 그대로 따른다: 닉네임 → 성별 → 생년월일 → 양음력/윤달 →
// 시각 → 시간모름 → 고민 카테고리 → 확인하기
export function MainInputScreen({ onSubmit }: Props) {
  const [input, setInput] = useState<SajuFormInput>(makeDefaultInput)
  const [dateText, setDateText] = useState('')
  const [timePicked, setTimePicked] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [showConsent, setShowConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const parsedDate = parseDateText(dateText)
  const realismErrors = validateForm(input)

  // PRD v2 §3.4 R4 — 6개 필수 항목이 전부 채워져야 [확인하기]가 활성화된다. 에러 메시지는 표시하지 않는다.
  const dateOk = Boolean(parsedDate) && !realismErrors.date
  const timeOk = input.timeUnknown || timePicked
  const canSubmit =
    !realismErrors.nickname && input.gender !== null && dateOk && timeOk && input.category !== null && input.consent

  function update<K extends keyof SajuFormInput>(key: K, value: SajuFormInput[K]) {
    setInput((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'year' || key === 'month') next.isLeapMonth = false
      return next
    })
  }

  function handleDateTextChange(rawText: string) {
    const text = formatDateInput(rawText)
    setDateText(text)
    const parsed = parseDateText(text)
    if (parsed) {
      setInput((prev) => ({ ...prev, year: parsed.year, month: parsed.month, day: parsed.day, isLeapMonth: false }))
    }
  }

  function selectCalendarType(type: 'solar' | 'lunar') {
    setInput((prev) => ({ ...prev, calendarType: type, isLeapMonth: false }))
  }

  // PRD v2 §3.5 R5 — 서버 저장(R12)이 아직 없어 실제로 기다릴 일이 없지만, 결과 화면 전환 전
  // 로딩이 최소 1초(로티 한 바퀴)는 보이도록 한다. R12에서 저장 API가 생기면 이 지연과
  // Promise.all로 묶어서 실패 시 토스트 + 입력값 유지 처리를 추가한다.
  async function handleSubmit() {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    onSubmit(input)
  }

  return (
    <div className="flex min-h-dvh flex-col items-center gap-[60px] bg-[#1a1a1a] px-6 pt-[60px] pb-[calc(120px+env(safe-area-inset-bottom))]">
      <div className="flex flex-col items-center gap-4">
        <img src={heart} alt="" className="h-16 w-[69px] object-cover" />
        <h1 className="text-[40px] font-bold tracking-[1.6px] text-white">사주 만세력</h1>
      </div>

      <div className="flex w-full max-w-[345px] flex-col gap-5">
        <div>
          <Bezel className="h-[48px] w-full px-4">
            <input
              type="text"
              inputMode="text"
              placeholder="이름/닉네임 입력"
              value={input.nickname}
              onChange={(e) => update('nickname', e.target.value)}
              className="w-full bg-transparent text-[16px] tracking-[1.28px] text-[#101010] placeholder:text-[#b1b1b1] focus:outline-none"
            />
          </Bezel>
        </div>

        <div className="flex w-full gap-5">
          <button
            type="button"
            onClick={() => update('gender', '여')}
            className={`flex h-[48px] flex-1 items-center justify-center rounded-[4px] px-4 text-[16px] tracking-[1.28px] shadow-[inset_0_3px_0_0_rgba(0,0,0,0.4)] ${
              input.gender === '여' ? 'bg-[#f31bc0] text-white' : 'bg-white text-[#101010]'
            }`}
          >
            여자
          </button>
          <button
            type="button"
            onClick={() => update('gender', '남')}
            className={`flex h-[48px] flex-1 items-center justify-center rounded-[4px] px-4 text-[16px] tracking-[1.28px] shadow-[inset_0_3px_0_0_rgba(0,0,0,0.4)] ${
              input.gender === '남' ? 'bg-[#f31bc0] text-white' : 'bg-white text-[#101010]'
            }`}
          >
            남자
          </button>
        </div>

        <div className="flex w-full flex-col">
          <div>
            <Bezel className="h-[48px] w-full px-4">
              <input
                type="text"
                inputMode="numeric"
                placeholder="1990.01.01"
                value={dateText}
                onChange={(e) => handleDateTextChange(e.target.value)}
                className="w-full bg-transparent text-[16px] tracking-[3.2px] text-[#101010] placeholder:text-[#b1b1b1] focus:outline-none"
              />
            </Bezel>
          </div>

          <div className="mt-4 flex w-full gap-4">
            <PixelCheckbox
              id="calendar-solar"
              label="양력"
              checked={input.calendarType === 'solar'}
              onChange={() => selectCalendarType('solar')}
            />
            <PixelCheckbox
              id="calendar-lunar"
              label="음력"
              checked={input.calendarType === 'lunar'}
              onChange={() => selectCalendarType('lunar')}
            />
            <PixelCheckbox
              id="leap-month"
              label="윤달"
              checked={input.isLeapMonth}
              onChange={(e) => {
                const isLeapMonth = e.target.checked
                setInput((prev) => ({ ...prev, isLeapMonth, calendarType: isLeapMonth ? 'lunar' : prev.calendarType }))
              }}
            />
          </div>

          <div className="mt-5">
            <Bezel className="h-[48px] w-full">
              <button
                type="button"
                disabled={input.timeUnknown}
                onClick={() => setPickerOpen(true)}
                className="absolute inset-0 flex w-full items-center justify-between px-4 text-[16px] tracking-[1.28px] text-[#101010] disabled:opacity-50"
              >
                <span>{timePicked ? formatKoreanTime(input.hour, input.minute) : '시간 선택'}</span>
              </button>
              <span aria-hidden className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 font-['Mona10'] text-[#101010]">▼</span>
            </Bezel>
          </div>
          {pickerOpen && (
            <TimePickerModal
              hour={timePicked ? input.hour : null}
              minute={timePicked ? input.minute : null}
              onConfirm={(h, m) => {
                update('hour', h)
                update('minute', m)
                setTimePicked(true)
                setPickerOpen(false)
              }}
              onCancel={() => setPickerOpen(false)}
            />
          )}

          <div className="mt-4">
            <PixelCheckbox
              id="time-unknown"
              label="시간 모름"
              checked={input.timeUnknown}
              onChange={(e) => update('timeUnknown', e.target.checked)}
            />
          </div>
        </div>

        <div className="flex flex-col items-start gap-4">
          <p className="font-['Pretendard'] text-[16px] text-white">요즘 고민 중인 카테고리를 선택해 주세요.</p>
          <div className="flex flex-wrap gap-x-3 gap-y-[14px]">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => update('category', c.key)}
                className={`relative rounded-[4px] px-4 pt-[11px] pb-[10px] font-['Mona12'] text-[16px] tracking-[1.28px] shadow-[inset_0_3px_0_0_rgba(0,0,0,0.4)] ${
                  input.category === c.key ? 'bg-[#f31bc0] text-white' : 'bg-white text-[#101010]'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex w-full items-center gap-4">
          <PixelCheckbox
            id="consent"
            label="개인정보 수집 및 활용을 동의합니다."
            checked={input.consent}
            onChange={(e) => update('consent', e.target.checked)}
          />
          <button
            type="button"
            onClick={() => setShowConsent(true)}
            className="shrink-0 text-[14px] text-white underline underline-offset-2"
          >
            전문 보기
          </button>
        </div>
      </div>

      <div className="w-full max-w-[345px]">
        <PixelButton onClick={handleSubmit} disabled={!canSubmit || submitting}>
          확인하기
        </PixelButton>
      </div>

      {submitting && <Loading />}

      {showConsent && (
        <DetailModal title="개인정보 수집 및 활용 동의" onClose={() => setShowConsent(false)}>
          <div className="flex flex-col gap-4 text-[14px] text-[#101010]">
            <div className="flex flex-col gap-1">
              <p className="font-['Pretendard'] font-bold">[개인정보 수집 및 이용에 대한 동의]</p>
              <p className="font-['Pretendard']">- 수집 및 이용 주체: 윤민지(민지민)</p>
              <p className="font-['Pretendard']">- 개인정보 수집·이용 목적: 사주 만세력 확인 및 사주/부적 분석 활용</p>
              <p className="font-['Pretendard']">- 수집하는 개인정보 항목: 이름/닉네임, 성별, 생년월일시, 고민 카테고리</p>
              <p className="font-['Pretendard']">- 개인정보 보유 및 이용 기간: 15일 내 전체 폐기</p>
            </div>
            <p className="font-['Pretendard'] text-[#8c8c8c]">
              귀하는 개인정보 수집·이용에 동의하지 않을 권리가 있습니다. 동의를 거부하실 경우 사주 확인 및 이벤트 참여가 제한됩니다.
            </p>
          </div>
        </DetailModal>
      )}
    </div>
  )
}
