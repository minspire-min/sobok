# DB 부트스트랩 — 새 Supabase 프로젝트 이사용 (2026-11-27)

새 Supabase 프로젝트를 운영 DB와 똑같이 만드는 파일들입니다. **순서대로** 실행하세요.

## 1. SQL 실행 (새 프로젝트 > SQL Editor)

| 순서 | 파일 | 내용 |
|---|---|---|
| ① | `01-schema.sql` | 전체 스키마 — 테이블 13종, RLS 정책, RPC 함수, pg_cron 잡 2개, 로그인 잠금 훅. 운영 마이그레이션 18개를 적용 순서대로 병합한 것 |
| ② | `02-seed-idioms.sql` | 부적 성어 225종 |
| ③ | `03-seed-slots.sql` | 부적 매트릭스 1,000슬롯 |

실행 후 확인: Table Editor에 `talisman_idioms` 225행, `talisman_matrix` 1000행.

> 시드 원본은 `scripts/talisman-pool.mjs` — 수정 시 `node scripts/build-talisman-matrix.mjs`로 재생성.

## 2. Authentication 설정 (대시보드)

1. **URL Configuration**: Site URL = `https://www.sobok-saju.com`, Redirect URLs에 `https://www.sobok-saju.com/login`, `http://localhost:3000/login` 추가
2. **Users > Add user**: `yminji117@gmail.com` + 비밀번호, **Auto Confirm 체크** (어드민 로그인용 — 이 이메일이 `admin_emails` 허용 목록에 이미 시드됨)
3. **Hooks > Password verification attempt** 활성화 → 함수 `hook_password_verification_attempt` 선택 (5회 실패 시 10분 잠금)
4. 카카오·구글 OAuth는 열 때 `SETUP_AUTH.md` 참고 (콜백 URL의 프로젝트 ref가 바뀌므로 카카오/구글 콘솔에도 새 콜백 등록 필요)

## 3. 앱 연결 전환 (코드·Vercel)

- `src/lib/supabase.ts`: URL·publishable key를 새 프로젝트 값으로 교체
- `.env.local` + Vercel 환경 변수: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Vercel env `NEXT_PUBLIC_BANK_*`, `RESEND_API_KEY` 등은 Supabase와 무관 — 그대로

## 4. 전환 검증 후에만 구 자원 삭제

1. 새 DB로 연결된 사이트에서 가입→사주 등록→주문 생성까지 확인
2. 구 Supabase 프로젝트(`yrgsrvncaapwzvwczqyi`) 삭제: 대시보드 > Settings > General > Delete project
3. 구 깃허브 레포(`yminji117/soboksobok`) 삭제는 **Vercel을 새 레포로 재연결한 뒤에**: Vercel > Settings > Git에서 `minspire-min/sobok` 연결 → 배포 확인 → GitHub Settings > Danger Zone > Delete repository

⚠️ 순서를 지키지 않으면(특히 4-3) 운영 자동 배포가 끊깁니다.
