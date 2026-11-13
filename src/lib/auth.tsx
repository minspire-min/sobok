import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

// PRD §6.3 — 최초 로그인 시 약관·개인정보 동의(필수)를 받아야 서비스 진입.
// consented = public.users에 본인 행이 있는가 (동의 완료 시점에 생성됨).
type AuthState = {
  loading: boolean
  session: Session | null
  consented: boolean
  marketingConsent: boolean
  signInWithProvider: (provider: 'kakao' | 'google', next: string) => Promise<void>
  completeConsent: (marketing: boolean) => Promise<void>
  updateMarketingConsent: (value: boolean) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [consented, setConsented] = useState(false)
  const [marketingConsent, setMarketingConsent] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadConsent() {
      if (!session) {
        setConsented(false)
        setMarketingConsent(false)
        setLoading(false)
        return
      }
      setLoading(true)
      const { data } = await supabase.from('users').select('marketing_consent').eq('id', session.user.id).maybeSingle()
      if (cancelled) return
      setConsented(Boolean(data))
      setMarketingConsent(Boolean(data?.marketing_consent))
      setLoading(false)
    }
    void loadConsent()
    return () => {
      cancelled = true
    }
  }, [session])

  async function signInWithProvider(provider: 'kakao' | 'google', next: string) {
    // OAuth 왕복 후 돌아갈 곳 — redirectTo 쿼리는 Supabase 설정에 묶이므로 sessionStorage로 전달
    sessionStorage.setItem('auth:next', next)
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/login` },
    })
  }

  async function completeConsent(marketing: boolean) {
    if (!session) return
    const { error } = await supabase.from('users').upsert({
      id: session.user.id,
      marketing_consent: marketing,
      marketing_consent_at: marketing ? new Date().toISOString() : null,
    })
    if (error) throw error
    setConsented(true)
    setMarketingConsent(marketing)
  }

  async function updateMarketingConsent(value: boolean) {
    if (!session) return
    const { error } = await supabase
      .from('users')
      .update({ marketing_consent: value, marketing_consent_at: value ? new Date().toISOString() : null })
      .eq('id', session.user.id)
    if (error) throw error
    setMarketingConsent(value)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{ loading, session, consented, marketingConsent, signInWithProvider, completeConsent, updateMarketingConsent, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

// PRD §5 분기 규칙 — 비로그인(또는 동의 전)이면 로그인으로 보내고, 끝나면 원래 목적지로 복귀.
export function RequireAuth({ children }: { children: ReactNode }) {
  const { loading, session, consented } = useAuth()
  const location = useLocation()
  if (loading) return null
  if (!session || !consented) {
    return <Navigate to="/login" state={{ next: location.pathname }} replace />
  }
  return <>{children}</>
}
