import { LogOut, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { logout } from './api'

const BASE = '/admin-mingminjimin'

function navClass({ isActive }: { isActive: boolean }): string {
  return `flex items-center gap-2 rounded-[8px] px-3 py-2 text-sm ${
    isActive ? 'bg-[#f31bc0]/10 font-bold text-[#f31bc0]' : 'text-[#525252] hover:bg-[#f0f0f0]'
  }`
}

type Props = {
  children: ReactNode
}

// 참여자 목록/상세/통계 화면이 전부 공유하는 좌측 사이드바 레이아웃.
export function AdminLayout({ children }: Props) {
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate(`${BASE}/login`, { replace: true })
  }

  return (
    <div className="flex min-h-dvh bg-white">
      <aside className="flex w-[240px] shrink-0 flex-col border-r border-[#e5e5e5] bg-[#fafafa] p-4">
        <p className="mb-4 px-3 text-lg font-bold text-[#0a0a0a]">사주 만세력</p>

        <nav className="flex flex-col gap-1">
          <NavLink to={BASE} end className={navClass}>
            <Users className="size-4" />
            참여자 목록
          </NavLink>
        </nav>

        <p className="mt-6 mb-1 px-3 text-xs font-bold text-[#9a9a9a]">통계</p>
        <nav className="flex flex-col gap-1">
          <NavLink to={`${BASE}/stats/users`} className={navClass}>
            사용자
          </NavLink>
          <NavLink to={`${BASE}/stats/sales`} className={navClass}>
            매출 현황
          </NavLink>
        </nav>

        <div className="mt-auto pt-4">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 rounded-[10px] border-[#c9c9c9] text-sm text-[#0a0a0a]"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            로그아웃
          </Button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-x-auto">{children}</main>
    </div>
  )
}
