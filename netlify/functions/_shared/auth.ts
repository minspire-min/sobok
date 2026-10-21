import { getStore } from '@netlify/blobs'

const SESSION_COOKIE = 'saju_admin_session'
const SESSION_TTL_MS = 12 * 60 * 60 * 1000 // PRD §3.11 — 12시간
const LOCKOUT_MS = 10 * 60 * 1000 // 5회 실패 시 10분 차단
const MAX_ATTEMPTS = 5

function sessionsStore() {
  return getStore('admin-sessions')
}

function attemptsStore() {
  return getStore('admin-login-attempts')
}

export function parseCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null
  for (const part of cookieHeader.split(';')) {
    const [k, ...rest] = part.trim().split('=')
    if (k === name) return rest.join('=')
  }
  return null
}

// 로그인 실패 5회 → 10분 차단 (IP 기준). 성공 시 카운터 리셋.
export async function checkLoginLockout(ip: string): Promise<{ locked: boolean }> {
  const store = attemptsStore()
  const record = await store.get(ip, { type: 'json' }).catch(() => null) as { count: number; lockedUntil: number } | null
  if (record?.lockedUntil && record.lockedUntil > Date.now()) return { locked: true }
  return { locked: false }
}

export async function recordLoginFailure(ip: string): Promise<void> {
  const store = attemptsStore()
  const record = (await store.get(ip, { type: 'json' }).catch(() => null)) as { count: number; lockedUntil: number } | null
  const count = (record?.count ?? 0) + 1
  const lockedUntil = count >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : 0
  await store.setJSON(ip, { count, lockedUntil })
}

export async function clearLoginFailures(ip: string): Promise<void> {
  await attemptsStore().delete(ip).catch(() => {})
}

export async function createSession(): Promise<{ cookie: string; token: string }> {
  const token = crypto.randomUUID()
  await sessionsStore().setJSON(token, { expiresAt: Date.now() + SESSION_TTL_MS })
  const cookie = `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_MS / 1000}`
  return { cookie, token }
}

export async function destroySession(token: string | null): Promise<string> {
  if (token) await sessionsStore().delete(token).catch(() => {})
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`
}

// PRD §4.4 B1 — 화면을 숨기는 게 아니라 모든 어드민 API가 서버에서 쿠키를 검증해야 한다.
export async function requireAdminSession(req: Request): Promise<boolean> {
  const token = parseCookie(req.headers.get('cookie'), SESSION_COOKIE)
  if (!token) return false
  const record = (await sessionsStore().get(token, { type: 'json' }).catch(() => null)) as { expiresAt: number } | null
  if (!record || record.expiresAt < Date.now()) return false
  return true
}

export { SESSION_COOKIE }
