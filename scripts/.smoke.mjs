// 소복소복 스모크 테스트 — 홈 렌더, 비로그인 /saju → /login 리다이렉트, 로그인 버튼 존재
// 사용법: npm run dev -- -p 5199 띄운 뒤 `node scripts/.smoke.mjs`
import { chromium } from 'playwright'

const BASE = 'http://localhost:5199'
const results = []

function check(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 375, height: 812 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))

// 1) 홈
await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1800) // 폰트 로딩 + 스플래시
const body = await page.textContent('body')
check('홈: 소福소福 타이틀', body.includes('소福소福'))
check('홈: CTA 버튼', body.includes('내 사주 보러 가기'))
check('홈: 상품 가격', body.includes('10,000원') && body.includes('50,000원'))
check('홈: GNB', body.includes('내 사주') && body.includes('마이'))

// 2) 비로그인 → /saju → /login 리다이렉트
await page.goto(BASE + '/saju', { waitUntil: 'networkidle' })
await page.waitForTimeout(1800)
check('/saju 비로그인 리다이렉트', page.url().includes('/login'), page.url())
const loginBody = await page.textContent('body')
check('로그인: 카카오 버튼', loginBody.includes('카카오로 시작하기'))
check('로그인: 구글 버튼', loginBody.includes('Google로 시작하기'))

check('콘솔 pageerror 없음', errors.length === 0, errors.join(' | ').slice(0, 300))

await page.screenshot({ path: '/tmp/sobok-smoke.png' })
await browser.close()

const failed = results.filter((r) => !r.ok)
process.exit(failed.length ? 1 : 0)
