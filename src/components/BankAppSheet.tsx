'use client'

import { useState } from 'react'
import { useBodyScrollLock } from '../lib/useBodyScrollLock'

// PRD §11.5 — [은행 앱으로 보내기]: 은행 탭 → ① 계좌번호 복사 ② 토스트 ③ 앱 열기.
// ponytail: 앱 스킴은 공개 문서가 없어 대표값으로 시작 — 실기기에서 안 열리는 은행은 스킴만 교체하면 된다.
// 안 열려도 계좌번호는 이미 복사돼 있고 안내 문구가 떠서 흐름이 막히지 않는다.
const BANKS = [
  { key: 'kakaobank', label: '카카오뱅크', scheme: 'kakaobank://' },
  { key: 'toss', label: '토스', scheme: 'supertoss://' },
  { key: 'kb', label: 'KB국민', scheme: 'kbbank://' },
  { key: 'woori', label: '우리', scheme: 'ewbcard://' },
  { key: 'shinhan', label: '신한 SOL', scheme: 'shinhansol://' },
  { key: 'ibk', label: 'IBK기업', scheme: 'ibksmartbank://' },
  { key: 'hana', label: '하나', scheme: 'hanabank://' },
  { key: 'nh', label: 'NH농협', scheme: 'nonghyupsmart://' },
]

const LAST_BANK_KEY = 'sobok:lastBank'

type Props = {
  account: string
  onCopied: (message: string) => void
  onClose: () => void
}

export function BankAppSheet({ account, onCopied, onClose }: Props) {
  useBodyScrollLock()
  const [opened, setOpened] = useState(false)

  // 마지막에 고른 은행을 맨 앞에 (§11.5)
  const last = typeof window === 'undefined' ? null : localStorage.getItem(LAST_BANK_KEY)
  const banks = last ? [...BANKS].sort((a, b) => (a.key === last ? -1 : b.key === last ? 1 : 0)) : BANKS

  async function openBank(bank: (typeof BANKS)[number]) {
    try {
      await navigator.clipboard.writeText(account)
    } catch {
      // 클립보드 실패해도 앱 열기는 진행
    }
    localStorage.setItem(LAST_BANK_KEY, bank.key)
    onCopied('계좌번호를 복사했어요')
    setOpened(true)
    window.location.assign(bank.scheme)
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-[480px] rounded-t-[4px] bg-white px-5 pt-5 pb-[calc(20px+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-4 text-center font-['Pretendard'] text-[16px] font-bold text-[#101010]">은행 앱 선택</p>
        <div className="grid grid-cols-4 gap-2">
          {banks.map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => void openBank(b)}
              className="rounded-[4px] border border-[#e5e5e5] px-1 py-3 font-['Pretendard'] text-[13px] text-[#101010] active:bg-[#f5f5f5]"
            >
              {b.label}
            </button>
          ))}
        </div>
        {opened && (
          <p className="mt-3 text-center font-['Pretendard'] text-[12px] leading-relaxed text-[#8c8c8c]">
            앱이 열리지 않으면 은행 앱을 직접 열어 주세요. 계좌번호는 복사되어 있어요.
          </p>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full py-2 text-center font-['Pretendard'] text-[14px] text-[#8c8c8c] underline underline-offset-2"
        >
          닫기
        </button>
      </div>
    </div>
  )
}
