import type { SajuResult } from 'ssaju'
import { computeFiveElementCounts, type Element } from './elementScore.ts'
import { ELEMENT_ORDER } from './elements.ts'
import { ILGAN_READINGS } from './ilganReadings.ts'
import { subConcernLabel } from './concerns.ts'

// ⚠️ 임시 분석 생성기 — AI 키가 나오면 2-8에서 실제 AI 생성으로 교체한다(시트 '임의 처리 목록' #3).
// 구성은 PRD §8.3(5페이지)을 따르고, 톤 규칙(§8.4: 단정 금지·응원)을 지킨다.
export type ReadingPage = { title: string; body: string }

const ELEMENT_HANJA: Record<Element, string> = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' }

const ELEMENT_TRAIT: Record<Element, { strong: string; weak: string }> = {
  목: { strong: '새로 시작하고 키워 가는 힘', weak: '시작을 미루거나 금방 시들해지는 기운' },
  화: { strong: '밝게 드러내고 퍼뜨리는 힘', weak: '열정이 금방 식거나 표현을 망설이는 기운' },
  토: { strong: '중심을 잡고 버텨 내는 힘', weak: '안정이 흔들리고 쉽게 조급해지는 기운' },
  금: { strong: '가려내고 끊어 내는 힘', weak: '결정을 미루거나 정리를 망설이는 기운' },
  수: { strong: '유연하게 흐르고 깊이 생각하는 힘', weak: '생각이 고이거나 쉼이 부족해지는 기운' },
}

const TOP_ACTION: Record<string, string> = {
  work: '오늘 할 수 있는 가장 작은 준비 하나를 정해서 끝내 보기를 권해요',
  growth: '이번 주에 배운 것을 한 줄로 기록하는 습관부터 시작해 보기를 권해요',
  love: '마음을 솔직하게 한 번 표현해 보는 것부터 시작해 보기를 권해요',
  rel: '먼저 안부를 묻는 연락 하나로 물꼬를 터 보기를 권해요',
  family: '가족과 보내는 짧은 시간을 하나 정해 지켜 보기를 권해요',
  money: '이번 달 돈의 흐름을 한 번 적어 보는 것부터 시작해 보기를 권해요',
  health: '잠드는 시간을 일정하게 맞추는 것부터 시작해 보기를 권해요',
  mind: '하루 10분, 나를 위한 조용한 시간을 만들어 보기를 권해요',
  study: '오늘 분량을 아주 작게 정해 매일 지키는 것부터 시작해 보기를 권해요',
}

function countSummary(counts: Record<Element, number>): string {
  return ELEMENT_ORDER.map((el) => `${el} ${counts[el]}`).join(' · ')
}

function levelWord(n: number): string {
  if (n === 0) return '보이지 않아요'
  if (n === 1) return '한 글자로 조금 아쉬워요'
  if (n === 2) return '알맞게 자리해요'
  return '넉넉하게 자리해요'
}

export function buildMockReading(params: {
  nickname: string
  result: SajuResult
  timeUnknown: boolean
  subKey: string
  element: Element // 추천(보충) 오행 — 부적과 같은 결론으로 끝나야 한다(§8.6)
  basis: string
}): ReadingPage[] {
  const { nickname, result, timeUnknown, subKey, element, basis } = params
  const dayStem = result.pillarDetails.day.stem
  const ilgan = ILGAN_READINGS[dayStem]
  const counts = computeFiveElementCounts(result, timeUnknown)
  const sorted = [...ELEMENT_ORDER].sort((a, b) => counts[b] - counts[a])
  const strong = sorted[0]
  const weak = sorted[sorted.length - 1]
  const subLabel = subConcernLabel(subKey)
  const topPrefix = subKey.split('-')[0]
  const timeNote = timeUnknown ? ' 태어난 시간을 몰라 여섯 글자 기준으로 보았어요.' : ''

  return [
    {
      title: '나는 어떤 사람인가',
      body: `${nickname}님의 일간은 ${dayStem}, ${ilgan?.title ?? ''}이에요. ${ilgan?.lines[0] ?? ''} 원국의 오행은 ${countSummary(counts)}로 자리하고 있어요.${timeNote}`,
    },
    {
      title: '이 고민을 보는 자리',
      body: `'${subLabel}' 고민은 사주에서 ${basis}의 자리로 들여다봐요. 지금 원국에서 ${element}(${ELEMENT_HANJA[element]}) 기운은 ${levelWord(counts[element])}. 그래서 이 기운을 살펴 채우는 것이 이번 고민의 실마리가 돼요.`,
    },
    {
      title: '내가 가진 힘',
      body: `${nickname}님의 원국에서 가장 든든한 것은 ${strong}(${ELEMENT_HANJA[strong]}) 기운이에요. ${ELEMENT_TRAIT[strong].strong}이 이미 안에 있다는 뜻이에요. 이 힘을 믿고 쓰면 '${subLabel}'의 길이 한결 수월해져요.`,
    },
    {
      title: '조심할 점',
      body: `상대적으로 ${weak}(${ELEMENT_HANJA[weak]}) 기운이 옅은 편이라, ${ELEMENT_TRAIT[weak].weak}이 올라올 수 있어요. 나쁜 신호가 아니라 미리 알고 다루면 되는 부분이에요. 그런 순간이 오면 잠시 멈추고 호흡을 고르기를 권해요.`,
    },
    {
      title: '지금 해 볼 것',
      body: `${TOP_ACTION[topPrefix] ?? '오늘 할 수 있는 작은 한 걸음을 정해 보기를 권해요'}. 그리고 이번 고민에 보탬이 되도록 ${element}(${ELEMENT_HANJA[element]}) 기운을 담은 부적 세 가지를 준비했어요. 다음 화면에서 마음에 닿는 하나를 골라 주세요.`,
    },
  ]
}
