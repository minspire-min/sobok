import { getStore } from '@netlify/blobs'

// key(IP, 리소스 id, 세션 토큰 등 호출하는 쪽이 정함)별로 분당 호출 횟수를 센다. 버킷 키가
// "key:분단위타임스탬프" 형태라 1분만 지나도 다시 안 쓰인다 — @netlify/blobs엔 TTL(자동 만료)이
// 없어서 scheduled-cleanup.ts가 storeName을 RATE_LIMIT_STORES에 등록해 주기적으로 지워야 한다.
export async function isRateLimited(key: string, storeName: string, limit: number): Promise<boolean> {
  const bucket = `${key}:${Math.floor(Date.now() / 60000)}`
  const store = getStore(storeName)
  const count = ((await store.get(bucket, { type: 'json' }).catch(() => null)) as number | null) ?? 0
  if (count >= limit) return true
  await store.setJSON(bucket, count + 1)
  return false
}
