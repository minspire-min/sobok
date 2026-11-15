'use client'

import dynamic from 'next/dynamic'
import loadingAnimation from '../assets/loading.json'

// lottie-web이 모듈 로드 시점에 브라우저 전역을 만져 SSR에서 터지므로 클라이언트에서만 로드한다.
const Lottie = dynamic(async () => (await import('lottie-react')).Lottie, { ssr: false })

// PRD v2 §3.5 R5 — 800x200(4:1) 애니메이션, 345px 폭 기준 비율 유지(= 약 86px 높이).
export function Loading() {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-[#1a1a1a]">
      <Lottie src={loadingAnimation} autoplay loop className="aspect-[4/1] w-full max-w-[345px]" />
    </div>
  )
}
