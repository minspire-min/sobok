// 부적 매트릭스 v2 생성기 — 성어 풀(기존 120 + 신규 105)을 200칸 × 5슬롯에 배정한다.
// 산출물: TALISMAN_TABLE_V2.md(검수용), scripts/.out/talisman-seed.sql(DB 시드)
// 검증: 칸 200·슬롯 1,000·칸 내 중복 0·한자/독음 4자 — 하나라도 어긋나면 exit 1.
import { mkdirSync, writeFileSync } from 'node:fs'
import { TALISMANS } from '../src/lib/talismans.ts'
import { TOP_CONCERNS } from '../src/lib/concerns.ts'
import { NEW_IDIOMS, OLD_SUB_TAGS, OLD_TOP_MAP } from './talisman-pool.mjs'

const ELEMENTS = ['목', '화', '토', '금', '수']
const ELEMENT_HANJA = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' }

// 풀 구성: (상위 고민, 오행) → 성어 5개
const pool = new Map()
function poolKey(top, element) {
  return `${top}:${element}`
}
for (const t of TALISMANS) {
  const top = OLD_TOP_MAP[t.category]
  const key = poolKey(top, t.element)
  if (!pool.has(key)) pool.set(key, [])
  pool.get(key).push({
    id: t.id, hanja: t.hanja, korean: t.korean, meaning: t.meaning,
    description: t.description, subs: OLD_SUB_TAGS[t.id] ?? [], kind: '성어', uncertain: false, isNew: false,
  })
}
for (const n of NEW_IDIOMS) {
  const key = poolKey(n.top, n.element)
  if (!pool.has(key)) pool.set(key, [])
  pool.get(key).push({
    id: n.id, hanja: n.hanja, korean: n.korean, meaning: n.meaning,
    description: `부족한 ${n.element}(${ELEMENT_HANJA[n.element]}) 기운을 채워, ${n.cheer} 부적`,
    subs: n.subs ?? [], kind: n.kind ?? '성어', uncertain: Boolean(n.uncertain), isNew: true,
  })
}

// 배정: 칸(하위 고민 × 오행) = 풀 5개를 적합 태그 우선으로 정렬. 1번 = 퍼스널 추천.
const rows = [] // { sub, subLabel, top, element, slot, idiom }
const problems = []
for (const top of TOP_CONCERNS) {
  for (const element of ELEMENTS) {
    const items = pool.get(poolKey(top.key, element)) ?? []
    if (items.length !== 5) problems.push(`풀 크기 ${items.length} ≠ 5: ${top.key}/${element}`)
    for (const sub of top.subs) {
      const ordered = [...items].sort((a, b) => {
        const am = a.subs.includes(sub.key) ? 0 : 1
        const bm = b.subs.includes(sub.key) ? 0 : 1
        return am - bm
      })
      const seen = new Set()
      ordered.forEach((idiom, i) => {
        if (seen.has(idiom.hanja)) problems.push(`칸 내 중복: ${sub.key}/${element} ${idiom.hanja}`)
        seen.add(idiom.hanja)
        rows.push({ sub: sub.key, subLabel: sub.label, top: top.key, topLabel: top.label, element, slot: i + 1, idiom })
      })
    }
  }
}

// 검증
const idioms = [...new Map(rows.map((r) => [r.idiom.id, r.idiom])).values()]
const cells = new Set(rows.map((r) => `${r.sub}:${r.element}`))
for (const it of idioms) {
  if ([...it.hanja].length !== 4) problems.push(`한자 4자 아님: ${it.id} ${it.hanja}`)
  if (it.korean.length !== 4) problems.push(`독음 4자 아님: ${it.id} ${it.korean}`)
}
const checks = [
  ['칸 수 = 200', cells.size === 200, cells.size],
  ['슬롯 수 = 1,000', rows.length === 1000, rows.length],
  ['문제 0건', problems.length === 0, problems.slice(0, 5).join(' | ')],
]
for (const [name, ok, detail] of checks) console.log(`${ok ? '✅' : '❌'} ${name}${ok ? '' : ` — ${detail}`}`)
console.log(`성어 종류: ${idioms.length} (기존 ${idioms.filter((i) => !i.isNew).length} + 신규 ${idioms.filter((i) => i.isNew).length}, 미확실 ${idioms.filter((i) => i.uncertain).length})`)

// 검수용 마크다운
let md = `# 부적 매트릭스 v2 — 검수용 초안

| 항목 | 내용 |
| --- | --- |
| 버전 | v2 초안 (${new Date().toISOString().slice(0, 10)}) — 생성: \`node scripts/build-talisman-matrix.mjs\` |
| 구성 | 하위 고민 40 × 오행 5 = 200칸, 칸당 5개(1번 = 퍼스널 추천) |
| 성어 | ${idioms.length}종 = 기존 120 + 신규 ${idioms.filter((i) => i.isNew).length} |
| ⚠️ 검수 | **신규(✦) 성어 전부**, 특히 \`(미확실)\` 표시는 사전 대조 필수(PRD §8.5). 수정은 \`scripts/talisman-pool.mjs\`에서 고친 뒤 스크립트 재실행 |

## A. 성어 사전

| ID | 한자 (한글) | 뜻 | 설명 | 구분 |
| --- | --- | --- | --- | --- |
`
for (const it of idioms) {
  const mark = it.isNew ? '✦ ' : ''
  const unc = it.uncertain ? ' (미확실)' : ''
  md += `| \`${it.id}\` | ${mark}**${it.hanja}** (${it.korean})${unc} | ${it.meaning} | ${it.description} | ${it.kind} |\n`
}
md += `\n## B. 배정표 (칸 × 5 — **굵게** = 1번 퍼스널 추천)\n\n| 하위 고민 | 오행 | 1번 | 2 | 3 | 4 | 5 |\n| --- | --- | --- | --- | --- | --- | --- |\n`
for (const top of TOP_CONCERNS) {
  for (const sub of top.subs) {
    for (const element of ELEMENTS) {
      const slots = rows.filter((r) => r.sub === sub.key && r.element === element).sort((a, b) => a.slot - b.slot)
      const names = slots.map((s, i) => (i === 0 ? `**${s.idiom.korean}**` : s.idiom.korean))
      md += `| ${top.label} · ${sub.label} | ${element} | ${names.join(' | ')} |\n`
    }
  }
}
writeFileSync(new URL('../TALISMAN_TABLE_V2.md', import.meta.url), md)

// DB 시드 SQL — 성어 사전(225행)과 배정표(1,000행, id만)로 정규화해 용량을 줄인다
const esc = (s) => s.replaceAll("'", "''")
let idiomSql = 'truncate table public.talisman_matrix, public.talisman_idioms;\ninsert into public.talisman_idioms (id, hanja, korean, meaning, description) values\n'
idiomSql += idioms.map((i) => `('${esc(i.id)}','${esc(i.hanja)}','${esc(i.korean)}','${esc(i.meaning)}','${esc(i.description)}')`).join(',\n') + ';\n'
let slotSql = 'insert into public.talisman_matrix (sub_concern, element, slot, idiom_id) values\n'
slotSql += rows.map((r) => `('${r.sub}','${r.element}',${r.slot},'${esc(r.idiom.id)}')`).join(',\n') + ';\n'
mkdirSync(new URL('./.out', import.meta.url), { recursive: true })
writeFileSync(new URL('./.out/talisman-seed-idioms.sql', import.meta.url), idiomSql)
writeFileSync(new URL('./.out/talisman-seed-slots.sql', import.meta.url), slotSql)

console.log('생성: TALISMAN_TABLE_V2.md, scripts/.out/talisman-seed-{idioms,slots}.sql')
process.exit(checks.every(([, ok]) => ok) ? 0 : 1)
