import { createClient } from '@supabase/supabase-js'

// publishable 키는 클라이언트 공개용이라 코드에 기본값으로 둬도 안전하다(RLS가 접근을 막는다).
// Netlify 등 빌드 환경에서 env를 따로 안 넣어도 동작하게 fallback을 둔다.
const url = import.meta.env.VITE_SUPABASE_URL ?? 'https://yrgsrvncaapwzvwczqyi.supabase.co'
const key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'sb_publishable_VwY0O0UPsN_DejkUMqSeNw_27InZrG5'

export const supabase = createClient(url, key)
