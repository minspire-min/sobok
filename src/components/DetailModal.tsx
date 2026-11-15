import type { ReactNode } from 'react'
const closeIcon = '/assets/icon-close.png'
import { useBodyScrollLock } from '../lib/useBodyScrollLock'

type Props = {
  title: string
  onClose: () => void
  children: ReactNode
}

// Figma 34:173 "자세히 보기 선택 시 팝업" / 48:1004 "정보 아이콘 선택 시 팝업" — 두 팝업이 공유하는 셸
export function DetailModal({ title, onClose, children }: Props) {
  useBodyScrollLock()
  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50 px-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[80vh] w-full max-w-[360px] flex-col gap-6 overflow-y-auto rounded-[4px] bg-white px-5 py-8 md:max-w-[460px] md:px-7 md:py-9"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-['Mona12'] text-[20px] font-bold tracking-[-0.3125px] text-[#101010] md:text-[24px]">{title}</h2>
          <button type="button" onClick={onClose} className="flex size-[44px] items-center justify-center -m-3">
            <img src={closeIcon} alt="닫기" className="size-5 md:size-6" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
