import { RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { CATEGORIES } from '../lib/categories'
import { TALISMANS } from '../lib/talismans'
import { AdminAuthError, listSubmissions, logout } from './api'
import type { AdminSubmission } from './types'

function categoryLabel(key: string): string {
  return CATEGORIES.find((c) => c.key === key)?.label ?? key
}

function talismanLabel(id: string): string {
  return TALISMANS.find((t) => t.id === id)?.korean ?? id
}

export function ListPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<AdminSubmission[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  function refresh() {
    return listSubmissions()
      .then(setItems)
      .catch((e) => {
        if (e instanceof AdminAuthError) {
          navigate('login', { replace: true })
          return
        }
        setError(e instanceof Error ? e.message : String(e))
      })
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate])

  async function handleRefresh() {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }

  async function handleLogout() {
    await logout()
    navigate('login', { replace: true })
  }

  if (error) return <div className="p-6 text-sm text-destructive">{error}</div>
  if (!items) return <div className="p-6 text-sm text-muted-foreground">불러오는 중...</div>

  return (
    <div className="min-h-dvh bg-white">
      <div className="border-b border-[#dcdcdc] px-6 py-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <h1 className="text-2xl font-bold text-[#0a0a0a]">참여자 ({items.length})</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="목록 새로고침"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={refreshing ? 'animate-spin' : ''} />
            </Button>
            <Button variant="outline" className="rounded-[10px] border-[#c9c9c9] px-4 py-1.5 text-base font-medium text-[#0a0a0a]" onClick={handleLogout}>
              로그아웃
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-[1120px] pt-5">
        <table className="w-[1120px] table-fixed text-left">
          <thead>
            <tr className="border-b border-black">
              <th className="w-[200px] px-2 py-2.5 text-sm font-bold text-[#0a0a0a]">닉네임</th>
              <th className="w-[200px] px-2 py-2.5 text-center text-sm font-bold text-[#0a0a0a]">고민</th>
              <th className="w-[160px] px-2 py-2.5 text-center text-sm font-bold text-[#0a0a0a]">부족 오행</th>
              <th className="w-[240px] px-2 py-2.5 text-center text-sm font-bold text-[#0a0a0a]">부적</th>
              <th className="w-[320px] px-2 py-2.5 text-sm font-bold text-[#0a0a0a]">접수 시각</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-muted-foreground">
                  아직 접수된 참여자가 없어요.
                </td>
              </tr>
            )}
            {items.map((s) => (
              <tr key={s.id} className="cursor-pointer border-b border-[#b7b7b7]" onClick={() => navigate(s.id)}>
                <td className="px-2 py-[22px] text-lg text-[#0a0a0a]">{s.nickname}</td>
                <td className="px-2 py-[22px] text-center text-lg text-[#0a0a0a]">{categoryLabel(s.category)}</td>
                <td className="px-2 py-[22px] text-center text-lg text-[#0a0a0a]">{s.lackingElement}</td>
                <td className="px-2 py-[20px] text-center">
                  {s.selectedTalismanId ? (
                    <span className="inline-flex items-center gap-3 text-lg text-[#0a0a0a]">
                      {talismanLabel(s.selectedTalismanId)}
                      {s.selectedBy === 'admin' && (
                        <span className="rounded-full bg-[#565656] px-4 py-0.5 text-sm text-white">관리자 수정</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-lg text-[#0a0a0a]">-</span>
                  )}
                </td>
                <td className="px-2 py-[22px] text-lg whitespace-pre text-[#0a0a0a]">
                  {new Date(s.createdAt).toLocaleString('ko-KR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
