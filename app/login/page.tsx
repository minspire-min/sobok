import { Suspense } from 'react'
import { LoginScreen } from '@/screens/LoginScreen'

// LoginScreen이 useSearchParams(?next=)를 쓰므로 Suspense 경계가 필요하다.
export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#1a1a1a]" />}>
      <LoginScreen />
    </Suspense>
  )
}
