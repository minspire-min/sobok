import { createClient } from '@supabase/supabase-js'

// publishable 키는 클라이언트 공개용이라 코드에 기본값으로 둬도 안전하다(RLS가 접근을 막는다).
// Netlify 등 빌드 환경에서 env를 따로 안 넣어도 동작하게 fallback을 둔다.
// 2026-11-27 Minspire 계정으로 이사 (구 프로젝트: yrgsrvncaapwzvwczqyi)
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://rewrelalnoylldzfocrr.supabase.co'
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_Pgr7pVudU7WnMSNOPiQH5A_opJh9c4L'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
