import type { AdminSubmission } from './types'

export class AdminAuthError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/admin${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...init?.headers },
  })
  if (res.status === 401) throw new AdminAuthError()
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.error ?? `요청에 실패했어요 (${res.status})`)
  }
  return res.json() as Promise<T>
}

// PRD §4.4 B3 — 로그인 실패 메시지는 서버가 주는 그대로 보여준다(아이디/비번 구분 금지, 잠금 안내 등).
export async function login(id: string, password: string): Promise<void> {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id, password }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.error ?? '로그인에 실패했어요')
  }
}

export async function logout(): Promise<void> {
  await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' })
}

export async function listSubmissions(): Promise<AdminSubmission[]> {
  const data = await request<{ submissions: AdminSubmission[] }>('/submissions')
  return data.submissions
}

export async function getSubmission(id: string): Promise<AdminSubmission> {
  const data = await request<{ submission: AdminSubmission }>(`/submissions/${id}`)
  return data.submission
}

export async function updateSubmission(
  id: string,
  body: { selectedTalismanId?: string | null; memo?: string },
): Promise<AdminSubmission> {
  const data = await request<{ submission: AdminSubmission }>(`/submissions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return data.submission
}

export async function generateReading(id: string): Promise<AdminSubmission> {
  const data = await request<{ submission: AdminSubmission }>(`/submissions/${id}/reading`, { method: 'POST' })
  return data.submission
}
