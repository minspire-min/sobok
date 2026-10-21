import { Route, Routes } from 'react-router-dom'
import { DetailPage } from './DetailPage'
import { ListPage } from './ListPage'
import { LoginPage } from './LoginPage'

export function AdminApp() {
  return (
    <div style={{ fontFamily: "'Pretendard', system-ui, sans-serif" }}>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route path="" element={<ListPage />} />
        <Route path=":id" element={<DetailPage />} />
      </Routes>
    </div>
  )
}
