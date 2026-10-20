import { Lottie } from 'lottie-react'
import splashAnimation from '../assets/splashScreen.json'

// 메인 화면 폰트(Mona10/12, Pretendard)가 전부 적용될 때까지 띄우는 앱 진입 스플래시.
// 로티 컬러는 #F31BC0로 고정 재색칠해서 에셋에 이미 박혀 있다 — lib/fontLoading.ts 참고.
export function SplashScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1a1a]">
      <Lottie src={splashAnimation} autoplay loop className="w-[240px]" />
    </div>
  )
}
