# 수정 이력

수정될 때마다 이 문서를 업데이트한다.

| 날짜 | 항목 | 내용 | 처리 |
|---|---|---|---|
| 2026-10-30 | 부적 추천 동점 처리 비결정성 | `determineLackingElement`(`src/lib/elementScore.ts`)가 오행 점수 동점 시 `Math.random()`으로 뽑아, 같은 사람인데도 클라이언트(화면)와 서버(제출 기록)가 서로 다른 부적을 추천하거나 재방문·새로고침마다 추천이 바뀔 수 있었음 | 점수·카테고리·일간·성별로 만든 해시값으로 고르도록 변경(`hashIndex`). 같은 입력이면 어디서 계산해도 항상 같은 결과 |
| 2026-10-30 | 통계 "확인 수" 누락 (10/25 19명 vs 집계 17명) | 결과 화면 "완료" 클릭 시 서버에 선택한 부적을 기록하는 `updateSubmissionSelection`(`src/lib/submissionApi.ts`) PATCH가 fire-and-forget이라, 네트워크가 한 번만 실패해도 조용히 누락되고 화면엔 "완료"로 보임. 관리자 통계의 "확인 수"는 이 값을 기준으로 집계해 실제 완료자보다 적게 나옴 | 최대 3회(0.5s/1s 간격) 재시도하도록 변경 |
| 2026-10-30 | 체류시간 퍼널 "완료" 수치 누락 | 위와 동일한 구조의 문제가 `markPageVisitCompleted`(`src/lib/pageVisitApi.ts`)에도 있어, 체류시간 퍼널 통계의 완료 수치도 같은 이유로 누락될 수 있었음 | 최대 3회(0.5s/1s 간격) 재시도하도록 변경 |
| 2026-10-30 | 통계에 성별/연령 분포 추가 (기능 추가) | 관리자 "사용자" 통계 페이지에 성별 분포(남/여), 연령 분포(10대~80대 이상) 막대그래프가 없었음 | `src/admin/stats.ts`에 `genderDistribution`/`ageDistribution` 집계 함수 추가, `StatsUsersPage.tsx`에 기존 `SimpleBarChart` 재사용해 카드 2개 추가. 연령은 "올해 연도 − 출생 연도"로 단순 계산(음력 출생 시 생일 전후 ±1 오차 가능, 분포 차트 용도로는 무시 가능 수준) |
| 2026-10-30 | 연령 분포 카드가 절반 너비에서 잘림 | 위 기능을 2열 그리드(절반 너비)에 넣었더니 8칸짜리 연령 분포가 카드 폭을 넘어 오른쪽 막대들이 화면 밖으로 잘림(가로 스크롤해야만 보임) — `netlify dev`로 실제 데이터 8건(성별 4/4, 연령대별 1건씩) 넣고 관리자 화면 캡처해서 발견 | 연령 분포를 전체 너비 카드로 분리(성별 분포도 함께 전체 너비로). 재캡처로 8개 구간 전부 정상 노출 확인 |
| 2026-10-30 | 통계 "사용자" 페이지 카드 순서 변경 (요청 반영) | 사용자 요청대로 카드 배치 재구성 | 일간 진입/확인 수(단독) → 첫방문/재방문/미확인 + 화면 체류·이탈 퍼널(2열) → 고민 카테고리별 진입 수 + 성별 분포(2열) → 연령 분포(단독) 순서로 변경, `netlify dev` 스크린샷으로 순서 확인 |

## 참고
- 10/25 당시 원인 확인을 위해 Netlify 함수 로그를 조회했으나, 함수 로그 보존 기간(약 24시간)이 지나 이미 삭제된 상태였음 — 코드 구조 분석으로 원인 추정.

## code-review-inspector 전체 리뷰 발견 사항 (2026-10-30, 미처리)
사용자 확인 후 처리 여부 결정 예정. 처리되면 위 표로 옮기고 여기서 제거한다.

| 심각도 | 위치 | 내용 |
|---|---|---|
| High | `src/lib/submissionApi.ts`(`createSubmission`), `src/lib/pageVisitApi.ts`(`createPageVisit`) | 최초 제출/방문 생성 POST가 여전히 fire-and-forget. 실패하면 서버에 기록 자체가 안 생겨 관리자 화면에서 완전히 안 보임(과소집계가 아니라 누락) |
| Medium | `src/lib/usePageVisitTracking.ts` + `MainInputScreen.tsx`/`ResultScreen.tsx` | `createPageVisit` POST가 끝나기 전에 사용자가 빨리 완료하면 `markCompleted`가 조용히 무시됨(경쟁 상태) |
| Medium | `netlify/functions/submissions.ts`, `page-visits.ts` | PATCH/이탈 beacon 경로에 Rate limit이 전혀 없음(생성 경로에만 있음) |
| Medium | `netlify/functions/submissions.ts` (`validateInput`) | 공개 제출 API의 `hour`/`minute` 서버 측 범위 검증이 사실상 빠져 있음(0-23/0-59 체크 없음) |
| Low | `netlify/functions/admin-login.ts` | 비밀번호 비교가 constant-time이 아님(타이밍 공격 이론적 가능성) |
| Low | `netlify/functions/scheduled-cleanup.ts` | `admin-login-attempts`/`admin-sessions` 스토어는 정리 대상에서 빠져 있어 무한정 쌓임 |
| Low | `netlify/functions/admin-reading.ts` | AI 풀이 생성 API에 자체 rate limit 없음(세션 탈취 시 비용 남용 가능) |
| Low | `netlify.toml` | CSP/X-Frame-Options 등 보안 헤더 없음 |
| 미확인 | `src/lib/sajuPipeline.ts`(`BOKSEONG_TARGET`) | 복성귀인 판정 로직이 참고 자료와 다르게 해석될 수 있어 재검증 필요(이번엔 결론 못 냄) |
