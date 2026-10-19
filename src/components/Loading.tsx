import { Lottie } from 'lottie-react'
import loadingAnimation from '../assets/loading.json'

// PRD v2 §3.5 R5 — 800x200(4:1) 애니메이션, 345px 폭 기준 비율 유지(= 약 86px 높이).
export function Loading() {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-[#1a1a1a]">
      <Lottie src={loadingAnimation} autoplay loop className="aspect-[4/1] w-full max-w-[345px]" />
    </div>
  )
}
