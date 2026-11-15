import { Suspense } from 'react'
import { RequireAuth } from '@/lib/auth'
import { OrderScreen } from '@/screens/OrderScreen'

// OrderScreen이 useSearchParams(?order=)를 쓰므로 Suspense 경계가 필요하다.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <RequireAuth>
      <Suspense fallback={null}>
        <OrderScreen profileId={id} />
      </Suspense>
    </RequireAuth>
  )
}
