'use client'

import dynamic from 'next/dynamic'
import splashAnimation from '../assets/splashScreen.json'

// lottie-web이 모듈 로드 시점에 브라우저 전역을 만져 SSR에서 터지므로 클라이언트에서만 로드한다.
const Lottie = dynamic(async () => (await import('lottie-react')).Lottie, { ssr: false })

// 메인 화면 폰트(Mona10/12, Pretendard)가 전부 적용될 때까지 띄우는 앱 진입 스플래시.
// 로티 컬러는 #F31BC0로 고정 재색칠해서 에셋에 이미 박혀 있다 — lib/fontLoading.ts 참고.
export function SplashScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1a1a]">
      <Lottie src={splashAnimation} autoplay loop className="w-[240px]" />
    </div>
  )
}
