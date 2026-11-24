// PRD §17.1 — 상품·가격. 금액 계산의 최종 판정은 DB 함수(create_order)가 한다.
// 간이과세자(§17.8)라 표시 가격이 곧 최종 결제 금액. 가격 개편(4종, §17.7)은 지민 확정 대기.

export type ProductNo = 1 | 2 | 3

export const PRODUCTS: Record<
  ProductNo,
  { name: string; desc: string; price: number; repurchasePrice: number; shippedCount: number; available: boolean }
> = {
  1: {
    name: '사주 분석 + 이미지 부적',
    desc: '고민별 사주 분석 5페이지와 추천 부적 3종 중 1개를 골라 이미지로 간직해요',
    price: 10_000,
    repurchasePrice: 2_000,
    shippedCount: 0,
    available: true,
  },
  2: {
    name: '+ 배송 부적 1장',
    desc: '사주와 고민에 맞춰 직접 그린 부적 1장을 보내 드려요. 손으로 그려 발송까지 시간이 걸려요(기간은 입금 확인 후 안내)',
    price: 30_000,
    repurchasePrice: 22_000,
    shippedCount: 1,
    available: true, // 단계 3 오픈 (2026-11-17)
  },
  3: {
    name: '+ 배송 부적 3장',
    desc: '직접 그린 부적 3장을 보내 드려요. 소중한 사람과 나누기 좋아요(기간은 입금 확인 후 안내)',
    price: 50_000,
    repurchasePrice: 42_000,
    shippedCount: 3,
    available: true,
  },
}

export function formatWon(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`
}

// 입금 계좌 — 계좌 확정(단계 0 체크리스트) 전까지 placeholder. 확정되면 Vercel 환경 변수로 교체.
export const BANK_ACCOUNT = {
  bank: process.env.NEXT_PUBLIC_BANK_NAME ?? '',
  account: process.env.NEXT_PUBLIC_BANK_ACCOUNT ?? '',
  holder: process.env.NEXT_PUBLIC_BANK_HOLDER ?? '',
}

export const bankAccountReady = Boolean(BANK_ACCOUNT.bank && BANK_ACCOUNT.account && BANK_ACCOUNT.holder)
