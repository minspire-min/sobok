import { useEffect } from 'react'

// 모달 뒤 배경 스크롤 방지 — 모달이 떠 있는 동안 body 스크롤을 잠그고 닫히면 복원한다.
export function useBodyScrollLock() {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])
}
