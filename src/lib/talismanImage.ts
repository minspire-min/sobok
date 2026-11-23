// ⚠️ 임시 부적 이미지 렌더러 — 픽셀아트 템플릿(지민 디자인)이 나오면 2-12에서 교체한다
// (시트 '임의 처리 목록' #4). 다크 배경 + 마젠타 이중 테두리 + 한자 세로쓰기.
import type { TalismanCard } from './talismansApi'

export type TalismanRatio = 'wallpaper' | 'square' // 9:16 / 1:1 (PRD §6.5)

export function renderTalismanImage(card: TalismanCard, ratio: TalismanRatio): string {
  const width = 1080
  const height = ratio === 'wallpaper' ? 1920 : 1080
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  // 배경 + 이중 테두리 (§9: 다크 + 마젠타 포인트, 블러 없는 하드 라인)
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = '#f31bc0'
  ctx.lineWidth = 12
  ctx.strokeRect(40, 40, width - 80, height - 80)
  ctx.lineWidth = 4
  ctx.strokeRect(70, 70, width - 140, height - 140)

  // 한자 세로쓰기 — 화면 폰트(Mona 로드 전이면 명조 계열)로
  const chars = [...card.hanja]
  const charSize = ratio === 'wallpaper' ? 220 : 170
  const totalH = charSize * chars.length * 1.12
  const startY = (height - totalH) / 2 + charSize * 0.78
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.font = `bold ${charSize}px 'Pretendard', 'Apple Myungjo', serif`
  chars.forEach((ch, i) => {
    ctx.fillText(ch, width / 2, startY + i * charSize * 1.12)
  })

  // 하단: 독음 · 뜻 · 브랜드
  ctx.fillStyle = '#f31bc0'
  ctx.font = `bold 52px 'Pretendard', sans-serif`
  ctx.fillText(card.korean, width / 2, height - 220)
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.font = `36px 'Pretendard', sans-serif`
  ctx.fillText(card.meaning, width / 2, height - 150)
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.font = `28px 'Pretendard', sans-serif`
  ctx.fillText('소福소福', width / 2, height - 92)

  return canvas.toDataURL('image/png')
}

export function downloadTalismanImage(card: TalismanCard, ratio: TalismanRatio): void {
  const url = renderTalismanImage(card, ratio)
  const a = document.createElement('a')
  a.href = url
  a.download = `soboksobok-${card.korean}-${ratio === 'wallpaper' ? '9x16' : '1x1'}.png`
  a.click()
}
