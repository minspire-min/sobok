# 카카오·구글 로그인 설정 가이드 (지민이 직접 해야 하는 부분)

로그인 기능의 **코드는 완성**되어 있습니다. 실제로 카카오·구글 버튼이 동작하려면, 카카오와 구글에 "소복소복"을 등록하고 발급받은 키를 Supabase에 넣어야 합니다. 이 등록은 계정 주인만 할 수 있어서 지민의 작업입니다. 둘 다 무료입니다.

> **우리 서비스의 콜백 주소** (아래에서 계속 쓰입니다 — 복사해 두세요)
> ```
> https://yrgsrvncaapwzvwczqyi.supabase.co/auth/v1/callback
> ```
> **Supabase 대시보드**: https://supabase.com/dashboard/project/yrgsrvncaapwzvwczqyi

---

## 1. 카카오 로그인 (약 15분)

1. https://developers.kakao.com 접속 → 카카오 계정으로 로그인
2. [내 애플리케이션] → [애플리케이션 추가하기] → 앱 이름 `소복소복`, 회사명은 본인 이름
3. 만든 앱 선택 → **[앱 키]에서 "REST API 키" 복사** (①)
4. 좌측 [카카오 로그인] → 활성화 ON
5. [카카오 로그인] → Redirect URI 등록 → 위의 **콜백 주소** 붙여넣기
6. [카카오 로그인] → [보안] → **Client Secret 생성** 후 복사 (②), 상태를 "사용함"으로
7. [동의항목] → "카카오계정(이메일)" 동의 설정
   - ※ 이메일 항목은 "비즈 앱" 전환이 필요할 수 있어요. 비즈 앱 전환에 사업자등록번호가 필요하면, 사업자등록 전까지는 닉네임만 받는 것으로 두어도 로그인은 됩니다.
8. **Supabase 대시보드** → Authentication → Sign In / Providers → Kakao
   - Enable ON
   - Client ID에 ① (REST API 키), Client Secret에 ② 입력 → Save

## 2. 구글 로그인 (약 15분)

1. https://console.cloud.google.com 접속 → 구글 계정으로 로그인
2. 상단 프로젝트 선택 → [새 프로젝트] → 이름 `soboksobok`
3. [API 및 서비스] → [OAuth 동의 화면] → 외부(External) 선택 → 앱 이름 `소복소복`, 이메일 입력 → 저장
4. [API 및 서비스] → [사용자 인증 정보] → [+ 사용자 인증 정보 만들기] → [OAuth 클라이언트 ID]
   - 유형: **웹 애플리케이션**
   - "승인된 리디렉션 URI"에 위의 **콜백 주소** 추가
5. 생성된 **클라이언트 ID**(①)와 **클라이언트 보안 비밀번호**(②) 복사
6. **Supabase 대시보드** → Authentication → Sign In / Providers → Google
   - Enable ON
   - Client ID에 ①, Client Secret에 ② 입력 → Save

## 3. 돌아올 주소 등록 (5분, Supabase에서)

로그인이 끝난 뒤 사용자를 어디로 돌려보낼지 Supabase에 알려줘야 합니다.

1. Supabase 대시보드 → Authentication → **URL Configuration**
2. Site URL: 운영 주소 입력 (지금은 Netlify 주소, 예: `https://xxxx.netlify.app`)
3. Redirect URLs에 아래 두 줄 추가:
   - `http://localhost:3000/login` (개발용)
   - `https://xxxx.netlify.app/login` (운영 주소로 바꿔서)

## 4. 확인 방법

1. 터미널에서 `npm run dev` 실행 → 브라우저에서 `http://localhost:3000/login` 접속
2. [카카오로 시작하기]를 누르면 카카오 로그인 창이 뜨고, 로그인하면 동의 화면 → 내 사주로 이어지면 성공
3. 안 되면 에러 화면에 나온 문구를 그대로 Claude에게 보여 주세요

---

※ 도메인을 구매하면 3번의 주소들을 새 도메인으로 바꿔 주세요.
※ 카카오 비즈 앱 전환(이메일 수집)은 사업자등록 후 다시 진행하면 됩니다.
