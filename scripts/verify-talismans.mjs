// R7 검증: TALISMAN_TABLE.md 120종이 빠짐/중복 없이 코드화됐는지 확인한다.
import { TALISMANS, getTalismans } from '../src/lib/talismans.ts'
import { CATEGORIES } from '../src/lib/categories.ts'
import { ELEMENT_ORDER } from '../src/lib/elements.ts'

let allOk = true
function check(label, cond, detail = '') {
  console.log(`  ${cond ? '✅' : '❌'} ${label}${detail ? ' — ' + detail : ''}`)
  if (!cond) allOk = false
}

console.log('\n1) 총 개수')
check('120개', TALISMANS.length === 120, `실제 ${TALISMANS.length}`)

console.log('\n2) 카테고리×오행 조합마다 정확히 3개')
for (const c of CATEGORIES) {
  for (const el of ELEMENT_ORDER) {
    const found = getTalismans(c.key, el)
    check(`${c.key}-${el}`, found.length === 3, `실제 ${found.length}`)
  }
}

console.log('\n3) ID/한글/한자 중복 없음')
check('ID 중복 없음', new Set(TALISMANS.map((t) => t.id)).size === 120)
check('한글 중복 없음', new Set(TALISMANS.map((t) => t.korean)).size === 120)
check('한자 중복 없음', new Set(TALISMANS.map((t) => t.hanja)).size === 120)

console.log('\n4) ID가 `카테고리-오행-번호` 형식과 실제 category/element 필드가 일치')
check(
  'ID와 필드 일치',
  TALISMANS.every((t) => t.id === `${t.category}-${t.element}-${t.id.split('-').pop()}`),
)

console.log('\n5) meaning/description 빈 값 없음')
check('meaning 전부 채워짐', TALISMANS.every((t) => t.meaning.trim().length > 0))
check('description 전부 채워짐', TALISMANS.every((t) => t.description.trim().length > 0))

console.log('\n' + '='.repeat(50))
console.log(allOk ? '✅ 전부 통과' : '❌ 불일치 있음 — 위 로그 확인')
process.exit(allOk ? 0 : 1)
