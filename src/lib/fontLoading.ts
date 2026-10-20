// 스플래시 스크린을 메인 화면에서 실제 쓰는 커스텀 폰트가 전부 적용될 때까지 띄우기 위한 대기.
// document.fonts.ready만 쓰면 아직 아무 텍스트도 렌더링 안 된 시점엔 브라우저가 폰트 로드를
// 시작조차 안 해서 바로 resolve돼 버린다 — 그래서 각 폰트를 명시적으로 load() 먼저 건다.
const FONT_SPECS = [
  '400 16px Mona10',
  '700 16px Mona10',
  '400 16px Mona12',
  '700 16px Mona12',
  '400 16px Pretendard',
  '500 16px Pretendard',
  '700 16px Pretendard',
]

export function waitForAppFonts(timeoutMs = 3000): Promise<void> {
  const ready = Promise.all(FONT_SPECS.map((spec) => document.fonts.load(spec))).then(() => document.fonts.ready.then(() => undefined))
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))
  return Promise.race([ready, timeout]).then(() => undefined)
}
