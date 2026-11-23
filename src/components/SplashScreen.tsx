import { HeartMark } from './HeartMark'

// 앱 진입 스플래시 — Pretendard 적용 전까지 잠깐 표시. (탈픽셀: 로티 픽셀 하트 → SVG 하트 펄스)
export function SplashScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1a1a]">
      <HeartMark className="size-16 animate-pulse" />
    </div>
  )
}
