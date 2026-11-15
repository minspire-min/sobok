import { AdminScreen } from '@/screens/AdminScreen'

// 비밀 경로 유지 + noindex 헤더(vercel.json의 /admin-mingminjimin* 규칙)로 검색 제외
export default function Page() {
  return <AdminScreen />
}
