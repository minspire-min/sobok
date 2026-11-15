import { RequireAuth } from '@/lib/auth'
import { MyPageScreen } from '@/screens/MyPageScreen'

export default function Page() {
  return (
    <RequireAuth>
      <MyPageScreen />
    </RequireAuth>
  )
}
