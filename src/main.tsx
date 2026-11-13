import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './lib/auth.tsx'
import { syncTestModeFromUrl } from './lib/testMode.ts'

// ?test=1/0 로 이 기기의 테스트 모드를 켜고 끈다(통계 제외용). 렌더 전에 한 번 반영.
syncTestModeFromUrl()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
