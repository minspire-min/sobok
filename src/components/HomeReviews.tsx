'use client'

import { useEffect, useState } from 'react'
import { listPublicReviews, type ReviewRow } from '../lib/reviewsApi'

// 메인 리뷰 섹션 (PRD §6.2 #6) — 공개 승인된 리뷰 최신순, 0건이면 섹션 자체를 숨긴다
export function HomeReviews() {
  const [reviews, setReviews] = useState<ReviewRow[]>([])

  useEffect(() => {
    listPublicReviews()
      .then(setReviews)
      .catch(() => {})
  }, [])

  if (reviews.length === 0) return null

  return (
    <section className="flex w-full max-w-[361px] flex-col gap-4">
      <h2 className="text-center font-['Mona12'] text-[16px] font-bold md:text-[20px]">먼저 받아 본 이야기</h2>
      <div className="flex flex-col gap-3">
        {reviews.map((r) => (
          <div key={r.id} className="flex flex-col gap-2 rounded-[4px] border border-white/50 bg-white/5 px-4 py-4">
            <div className="flex items-center justify-between">
              <span className="font-['Mona12'] text-[14px] tracking-[2px] text-[#f31bc0]">
                {'★'.repeat(r.rating)}
                <span className="text-white/25">{'★'.repeat(5 - r.rating)}</span>
              </span>
              <span className="font-['Pretendard'] text-[12px] text-[#888]">{r.nickname}</span>
            </div>
            <p className="font-['Pretendard'] text-[14px] leading-relaxed break-keep text-white/85">{r.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
