import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // 프로젝트가 iCloud Drive 안에 있어 .next에 "파일 2.ts" 같은 동기화 중복이 생겨 빌드가 깨진다.
  // .nosync 접미사 폴더는 iCloud가 동기화하지 않는다.
  // 단, Vercel 빌더는 기본 .next 경로를 기대하므로(NEXT_NO_ROUTES_MANIFEST) 로컬에서만 적용한다.
  ...(process.env.VERCEL ? {} : { distDir: '.next.nosync' }),
}

export default nextConfig
