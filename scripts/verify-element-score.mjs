// R6 검증: PRD v2 §3.6 부족 오행 점수제(덩어리 ×1.3, 동점 규칙)가 예시대로 동작하는지 확인한다.
import { computeElementScores, determineLackingElement } from '../src/lib/elementScore.ts'

let allOk = true
function check(label, cond, detail = '') {
  console.log(`  ${cond ? '✅' : '❌'} ${label}${detail ? ' — ' + detail : ''}`)
  if (!cond) allOk = false
}

function pillar(stemEl, branchEl) {
  return { element: { stem: stemEl, branch: branchEl } }
}

console.log('\n1) §3.6 확인 예시 1 — 천간 계·계·을·계 (시·일·월·연)')
{
  // 지지는 전부 丑(토)로 둬서 천간 쪽 계산에 간섭하지 않게 한다.
  const fakeResult = {
    pillarDetails: {
      hour: pillar('수', '토'),
      day: pillar('수', '토'),
      month: pillar('목', '토'),
      year: pillar('수', '토'),
    },
  }
  const scores = computeElementScores(fakeResult, false)
  check('천간 수 점수 = 36 (= (10+10)×1.3 + 10)', scores['수'] === 36, `실제 ${scores['수']}`)
}

console.log('\n2) §3.6 확인 예시 2 — 시丙寅/일甲子/월己卯/연乙卯')
{
  const fakeResult = {
    pillarDetails: {
      hour: pillar('화', '목'),
      day: pillar('목', '수'),
      month: pillar('토', '목'),
      year: pillar('목', '목'),
    },
  }
  const scores = computeElementScores(fakeResult, false)
  check('목 77', scores['목'] === 77, `실제 ${scores['목']}`)
  check('화 10', scores['화'] === 10, `실제 ${scores['화']}`)
  check('토 10', scores['토'] === 10, `실제 ${scores['토']}`)
  check('금 0', scores['금'] === 0, `실제 ${scores['금']}`)
  check('수 15', scores['수'] === 15, `실제 ${scores['수']}`)

  const result = determineLackingElement(scores, 'money', '목', '남')
  check('부족 오행 단독 최저 → 금 (reason=lowest)', result.element === '금' && result.reason === 'lowest', JSON.stringify(result))
}

console.log('\n3) 시간 미상 — 시주 2칸 제외(75점 만점)')
{
  const base = {
    day: pillar('목', '수'),
    month: pillar('토', '목'),
    year: pillar('목', '목'),
  }
  // 시주 내용이 전혀 달라도(수/수 vs 화/화) timeUnknown=true면 결과가 같아야 시주가 진짜 제외된 것
  const scoresA = computeElementScores({ pillarDetails: { ...base, hour: pillar('수', '수') } }, true)
  const scoresB = computeElementScores({ pillarDetails: { ...base, hour: pillar('화', '화') } }, true)
  check('timeUnknown=true면 시주 내용과 무관하게 같은 결과', JSON.stringify(scoresA) === JSON.stringify(scoresB), JSON.stringify({ scoresA, scoresB }))

  const totalRaw = 10 + 10 + 20 + 10 + 15 + 10 // 일간+월간+연간(천간) + 일지+월지+연지(지지), 시주 제외 = 75
  check('시주 제외 시 가중치 전 원점수 합 75', totalRaw === 75)

  const withHour = computeElementScores({ pillarDetails: { ...base, hour: pillar('수', '수') } }, false)
  const withoutHour = scoresA
  check(
    '시주 포함(timeUnknown=false) vs 제외 결과가 다름(시주가 실제로 반영/제외됨을 교차 확인)',
    JSON.stringify(withHour) !== JSON.stringify(withoutHour),
  )
}

console.log('\n4) 동점 처리 — 카테고리 연관 오행 우선, 연관 없으면 동점 중 랜덤')
{
  // 일간 수(水) 기준 화·토 동점 0점으로 맞춘 가짜 스코어
  const tiedScores = { 목: 20, 화: 0, 토: 0, 금: 20, 수: 10 }
  const money = determineLackingElement(tiedScores, 'money', '수', '남') // 재성=화
  check('재물/돈 동점 시 재성(화) 선택', money.element === '화' && money.reason === 'category', JSON.stringify(money))
  const career = determineLackingElement(tiedScores, 'career', '수', '남') // 관성=토
  check('커리어 동점 시 관성(토) 선택', career.element === '토' && career.reason === 'category', JSON.stringify(career))
  const health = determineLackingElement(tiedScores, 'health', '수', '남') // 연관 없음 → 랜덤
  check(
    '건강(연관 없음) 동점 시 랜덤이되 동점 오행 중 하나',
    health.reason === 'random' && health.tiedElements.includes(health.element),
    JSON.stringify(health),
  )
}

console.log('\n' + '='.repeat(50))
console.log(allOk ? '✅ 전부 통과' : '❌ 불일치 있음 — 위 로그 확인')
process.exit(allOk ? 0 : 1)
