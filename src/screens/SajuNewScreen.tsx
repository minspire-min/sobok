'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Toast } from '../components/Toast'
import { createSajuProfile } from '../lib/profilesApi'
import type { SajuFormInput } from '../lib/types'
import { MainInputScreen } from './MainInputScreen'

// PRD §6.4 — 기존 입력 화면을 register 변형으로 재사용. 고민 선택은 결제 직전(단계 2)으로 이동.
export function SajuNewScreen() {
  const router = useRouter()
  const [toast, setToast] = useState<string | null>(null)

  async function handleSubmit(input: SajuFormInput) {
    try {
      const row = await createSajuProfile(input)
      localStorage.setItem('saju:lastProfileId', row.id)
      router.push('/saju')
    } catch (e) {
      setToast(
        e instanceof Error && e.message === 'PROFILE_LIMIT_REACHED'
          ? '최대 8명까지 등록할 수 있어요.'
          : '저장에 실패했어요. 잠시 후 다시 시도해 주세요.',
      )
    }
  }

  return (
    <>
      <MainInputScreen onSubmit={handleSubmit} />
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  )
}
