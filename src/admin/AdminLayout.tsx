import { ChevronLeft, ChevronRight, LogOut, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { logout } from './api'

const BASE = '/admin-mingminjimin'
const COLLAPSED_KEY = 'admin-sidebar-collapsed'

function navClass({ isActive }: { isActive: boolean }): string {
  return `flex items-center gap-2 rounded-[8px] px-3 py-2 text-sm ${
    isActive ? 'bg-[#f31bc0]/10 font-bold text-[#f31bc0]' : 'text-[#525252] hover:bg-[#f0f0f0]'
  }`
}

type Props = {
  children: ReactNode
}

// 참여자 목록/상세/통계 화면이 전부 공유하는 좌측 사이드바 레이아웃.
// 페이지 이동 시 이 컴포넌트가 매번 다시 마운트되므로, 접힘 상태는
// localStorage에 저장해 버튼으로 바꾸기 전까진 유지되게 한다.
export function AdminLayout({ children }: Props) {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === '1')

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v
      localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0')
      return next
    })
  }

  async function handleLogout() {
    await logout()
    navigate(`${BASE}/login`, { replace: true })
  }

  return (
    <div className="flex min-h-dvh bg-white">
      <aside
        className={`relative flex shrink-0 flex-col border-r border-[#e5e5e5] bg-[#fafafa] p-4 ${
          collapsed ? 'w-[68px]' : 'w-[240px]'
        }`}
      >
        <button
          type="button"
          aria-label={collapsed ? '메뉴 펼치기' : '메뉴 접기'}
          onClick={toggleCollapsed}
          className="absolute top-4 -right-3 flex size-6 items-center justify-center rounded-full border border-[#e5e5e5] bg-white text-[#525252] shadow-sm hover:bg-[#f0f0f0]"
        >
          {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
        </button>

        {!collapsed && <p className="mb-4 px-3 text-lg font-bold text-[#0a0a0a]">사주 만세력</p>}

        <nav className="flex flex-col gap-1">
          <NavLink to={BASE} end title="참여자 목록" className={navClass}>
            <Users className="size-4" />
            {!collapsed && '참여자 목록'}
          </NavLink>
        </nav>

        {!collapsed && <p className="mt-6 mb-1 px-3 text-xs font-bold text-[#9a9a9a]">통계</p>}
        <nav className={`flex flex-col gap-1 ${collapsed ? 'mt-6' : ''}`}>
          <NavLink to={`${BASE}/stats/users`} title="사용자" className={navClass}>
            {collapsed ? '사용' : '사용자'}
          </NavLink>
          <NavLink to={`${BASE}/stats/sales`} title="매출 현황" className={navClass}>
            {collapsed ? '매출' : '매출 현황'}
          </NavLink>
        </nav>

        <div className="mt-auto pt-4">
          <Button
            variant="outline"
            title="로그아웃"
            className={`w-full rounded-[10px] border-[#c9c9c9] text-sm text-[#0a0a0a] ${
              collapsed ? 'justify-center px-0' : 'justify-start gap-2'
            }`}
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            {!collapsed && '로그아웃'}
          </Button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-x-auto">{children}</main>
    </div>
  )
}
