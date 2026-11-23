import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary'
}

// 탈픽셀(2026-11-23): 노치 에셋 버튼 → 필(pill) 버튼. 이름은 호출부 호환을 위해 유지.
export function PixelButton({ variant = 'primary', className = '', children, ...props }: Props) {
  const look =
    variant === 'primary'
      ? 'bg-[#f31bc0] text-white hover:shadow-[0_0_30px_rgba(243,27,192,0.25)]'
      : 'border border-white/25 bg-white/5 text-white hover:bg-white/10'

  return (
    <button
      className={`sb-ease flex h-[56px] w-full items-center justify-center rounded-full px-8 font-['Pretendard'] text-[16px] font-bold hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100 disabled:hover:shadow-none ${look} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
