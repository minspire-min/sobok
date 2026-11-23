import type { InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string
}

// 탈픽셀(2026-11-23): 각진 베젤 체크박스 → 둥근 체크박스. 이름은 호출부 호환을 위해 유지.
export function PixelCheckbox({ label, className = '', id, checked, ...props }: Props) {
  return (
    <label htmlFor={id} className="flex h-[20px] flex-1 cursor-pointer items-center gap-2">
      <span
        className={`sb-ease relative flex size-[20px] shrink-0 items-center justify-center rounded-[6px] ${
          checked ? 'bg-[#f31bc0]' : 'border border-white/30 bg-white/10'
        }`}
      >
        <input id={id} type="checkbox" checked={checked} className="absolute inset-0 size-full cursor-pointer appearance-none" {...props} />
        {checked && (
          <svg viewBox="0 0 20 20" className="pointer-events-none absolute inset-0 size-full p-[3px]" aria-hidden="true">
            <path d="M4 10.5L8 14.5L16 5.5" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className={`text-[16px] text-white ${className}`}>{label}</span>
    </label>
  )
}
