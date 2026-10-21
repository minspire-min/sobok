import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { SplashScreen } from './components/SplashScreen'
import { Toast } from './components/Toast'
import { MainInputScreen } from './screens/MainInputScreen'
import { ResultScreen } from './screens/ResultScreen'
import { SavedInfoScreen } from './screens/SavedInfoScreen'
import { waitForAppFonts } from './lib/fontLoading'
import { clearLastInput, clearSubmissionId, clearTalismanSelection, loadLastInput, saveLastInput } from './lib/storage'
import type { SajuFormInput } from './lib/types'

// PRD v2 §3.10 R10 — 공용 기기 운영 중에는 "저장된 정보 있음" 재진입 화면을 끈다.
// 본인 폰 + 로그인 도입(고도화) 때 true로 되돌리면 된다. 화면 코드 자체는 지우지 않는다.
const SHOW_SAVED_INFO_SCREEN = false

// 참여자 번들에 관리자 화면 코드가 안 들어가도록 지연 로딩한다.
const AdminApp = lazy(() => import('./admin/AdminApp').then((m) => ({ default: m.AdminApp })))

function EntryRoute() {
  const navigate = useNavigate()
  const location = useLocation()
  const [forceNew, setForceNew] = useState(() => Boolean((location.state as { forceNew?: boolean } | null)?.forceNew))
  const [toast, setToast] = useState<string | null>(null)
  const saved = loadLastInput()

  function handleSubmit(input: SajuFormInput) {
    clearTalismanSelection()
    saveLastInput(input)
    navigate('/result', { state: { input } })
  }

  function handleDelete() {
    clearLastInput()
    clearTalismanSelection()
    clearSubmissionId()
    setForceNew(true)
    setToast('삭제 완료 되었습니다.')
  }

  return (
    <>
      {saved && !forceNew && SHOW_SAVED_INFO_SCREEN ? (
        <SavedInfoScreen
          nickname={saved.nickname}
          onUseSaved={() => navigate('/result', { state: { input: saved } })}
          onNewInput={() => setForceNew(true)}
          onDelete={handleDelete}
        />
      ) : (
        <MainInputScreen onSubmit={handleSubmit} />
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  )
}

function ResultRoute() {
  const location = useLocation()
  const input = (location.state as { input?: SajuFormInput } | null)?.input ?? loadLastInput()

  if (!input) return <Navigate to="/" replace />
  return <ResultScreen input={input} />
}

function App() {
  const [fontsReady, setFontsReady] = useState(false)

  useEffect(() => {
    waitForAppFonts().then(() => setFontsReady(true))
  }, [])

  if (!fontsReady) return <SplashScreen />

  return (
    <Routes>
      <Route path="/" element={<EntryRoute />} />
      <Route path="/result" element={<ResultRoute />} />
      <Route
        path="/admin-mingminjimin/*"
        element={
          <Suspense fallback={null}>
            <AdminApp />
          </Suspense>
        }
      />
    </Routes>
  )
}

export default App
