import { RequireAuth } from '@/lib/auth'
import { MySajuScreen } from '@/screens/MySajuScreen'

export default function Page() {
  return (
    <RequireAuth>
      <MySajuScreen />
    </RequireAuth>
  )
}
