import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { DetailPage } from './DetailPage'
import { ListPage } from './ListPage'
import { LoginPage } from './LoginPage'
import { StatsSalesPage } from './StatsSalesPage'
import { StatsUsersPage } from './StatsUsersPage'

export function AdminApp() {
  // 참여자 화면 파비콘은 그대로 두고, 어드민 영역(로그인 포함) 안에 있는 동안만 바꿔치기한다.
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) return
    const original = link.href
    link.href = '/favicon-admin.png'
    return () => {
      link.href = original
    }
  }, [])

  return (
    <div style={{ fontFamily: "'Pretendard', system-ui, sans-serif" }}>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route path="" element={<ListPage />} />
        <Route path="stats/users" element={<StatsUsersPage />} />
        <Route path="stats/sales" element={<StatsSalesPage />} />
        <Route path=":id" element={<DetailPage />} />
      </Routes>
    </div>
  )
}
