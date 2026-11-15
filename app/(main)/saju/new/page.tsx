import { RequireAuth } from '@/lib/auth'
import { SajuNewScreen } from '@/screens/SajuNewScreen'

export default function Page() {
  return (
    <RequireAuth>
      <SajuNewScreen />
    </RequireAuth>
  )
}
