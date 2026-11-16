import { createClient } from '@supabase/supabase-js'

// publishable 키는 클라이언트 공개용이라 코드에 기본값으로 둬도 안전하다(RLS가 접근을 막는다).
// Netlify 등 빌드 환경에서 env를 따로 안 넣어도 동작하게 fallback을 둔다.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://yrgsrvncaapwzvwczqyi.supabase.co'
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_VwY0O0UPsN_DejkUMqSeNw_27InZrG5'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
