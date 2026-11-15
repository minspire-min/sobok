import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import Script from 'next/script'
import { AuthProvider } from '@/lib/auth'
import '@/index.css'

export const metadata: Metadata = {
  title: '소福소福 — 사주와 부적',
  description: '사주로 알아보는 나의 이야기, 그리고 나를 응원하는 부적 한 장.',
  icons: { icon: '/favicon.png' },
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <AuthProvider>{children}</AuthProvider>
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-MGFZ1KVBQR" strategy="afterInteractive" />
        <Script src="/gtag-init.js" strategy="afterInteractive" />
      </body>
    </html>
  )
}
