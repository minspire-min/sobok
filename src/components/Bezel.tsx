import type { HTMLAttributes } from 'react'

// 탈픽셀(2026-11-23): 눌린 인셋 베젤 → 매끈한 흰 입력 컨테이너. 이름은 호출부 호환을 위해 유지.
export function Bezel({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`relative flex items-center rounded-[12px] bg-white ring-1 ring-black/5 ${className}`} {...props} />
}
