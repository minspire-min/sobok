'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SplashScreen } from '@/components/SplashScreen'
import { waitForAppFonts } from '@/lib/fontLoading'

import { HeartMark } from '@/components/HeartMark'

// PRD §6.1 — 상단 로고 + GNB(홈 · 내 사주 · 마이) 56px, 현재 메뉴 마젠타 밑줄, 하단 푸터.
const MENUS = [
  { to: '/', label: '홈' },
  { to: '/saju', label: '내 사주' },
  { to: '/my', label: '마이' },
]

export default function MainLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [fontsReady, setFontsReady] = useState(false)

  useEffect(() => {
    waitForAppFonts().then(() => setFontsReady(true))
  }, [])

  if (!fontsReady) return <SplashScreen />

  return (
    <div className="flex min-h-dvh flex-col bg-[#1a1a1a] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#1a1a1a]">
        <div className="mx-auto flex h-[56px] w-full max-w-[480px] items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <HeartMark className="size-5" />
            <span className="font-['Pretendard'] text-[16px] font-bold">소福소福</span>
          </Link>
          <nav className="flex items-center gap-5">
            {MENUS.map((m) => {
              const isActive = m.to === '/' ? pathname === '/' : pathname.startsWith(m.to)
              return (
                <Link
                  key={m.to}
                  href={m.to}
                  className={`pb-[2px] font-['Pretendard'] text-[14px] ${
                    isActive ? 'border-b-2 border-[#f31bc0] text-white' : 'text-white/70'
                  }`}
                >
                  {m.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-white/10 px-4 py-8">
        <div className="mx-auto flex w-full max-w-[480px] flex-col gap-2 font-['Pretendard'] text-[12px] leading-relaxed text-[#888]">
          <p className="font-bold text-white/60">소福소福 (소복소복)</p>
          <p>대표: 윤민지 · 사업자 정보는 사업자등록 후 표기됩니다.</p>
          <p className="flex gap-3">
            <span>이용약관(준비 중)</span>
            <span>개인정보처리방침(준비 중)</span>
            <span>환불·배송 정책(준비 중)</span>
          </p>
        </div>
      </footer>
    </div>
  )
}
