import { CircleDollarSign } from 'lucide-react'
import { AdminLayout } from './AdminLayout'

// 지금은 결제 기능이 없는 무료 행사라 실제 매출 데이터가 없다. 고도화 때 결제가 붙으면
// StatsUsersPage와 같은 방식(submissions 기반 집계)으로 채워 넣을 자리만 미리 마련해 둔다.
export function StatsSalesPage() {
  return (
    <AdminLayout>
      <div className="mx-auto flex w-[1120px] flex-col items-center justify-center gap-4 p-6 py-32 text-center">
        <CircleDollarSign className="size-10 text-[#c9c9c9]" />
        <h1 className="text-2xl font-bold text-[#0a0a0a]">매출 현황</h1>
        <p className="max-w-[360px] text-sm text-[#737373]">
          아직 결제 기능이 없어 집계할 매출이 없어요. 추후 고도화 단계에서 결제가 추가되면 이 화면에 매출 통계가 표시될 예정입니다.
        </p>
      </div>
    </AdminLayout>
  )
}
