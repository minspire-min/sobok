import type { CategoryKey } from './categories.ts'

export type TalismanElement = '목' | '화' | '토' | '금' | '수'

export type Talisman = {
  id: string
  category: CategoryKey
  element: TalismanElement
  hanja: string
  korean: string
  meaning: string
  description: string
}

// PRD v2 §3.7 R7 — TALISMAN_TABLE.md v2.0(2026.10.20) 120종을 그대로 코드화.
// ID(`카테고리-오행-번호`)는 고도화 단계(부적 저장·위젯)의 기준키라 바꾸지 않는다.
export const TALISMANS: Talisman[] = [
  // 재물/돈
  { id: 'money-목-1', category: 'money', element: '목', hanja: '積小成大', korean: '적소성대', meaning: '작은 것이 쌓여 크게 된다', description: '부족한 목(木) 기운을 채워, 나무가 자라듯 작은 저축이 꾸준히 불어나도록 돕는 부적' },
  { id: 'money-목-2', category: 'money', element: '목', hanja: '枝繁葉茂', korean: '지번엽무', meaning: '가지가 무성하고 잎이 우거진다', description: '부족한 목(木) 기운을 채워, 수입의 가지가 여러 갈래로 뻗어 나가도록 돕는 부적' },
  { id: 'money-목-3', category: 'money', element: '목', hanja: '春華秋實', korean: '춘화추실', meaning: '봄에 꽃 피고 가을에 열매 맺는다', description: '부족한 목(木) 기운을 채워, 지금 심은 저축·투자가 때가 되면 결실을 맺도록 돕는 부적' },
  { id: 'money-화-1', category: 'money', element: '화', hanja: '招財進寶', korean: '초재진보', meaning: '재물을 부르고 보배가 들어온다', description: '부족한 화(火) 기운을 채워, 밝은 불빛처럼 재물을 불러들이는 부적' },
  { id: 'money-화-2', category: 'money', element: '화', hanja: '前途光明', korean: '전도광명', meaning: '앞길이 환하게 밝다', description: '부족한 화(火) 기운을 채워, 돈 앞에서 움츠러들지 않고 내 가치를 밝게 드러내도록 돕는 부적' },
  { id: 'money-화-3', category: 'money', element: '화', hanja: '火旺生財', korean: '화왕생재', meaning: '불길이 왕성하여 재물을 낳는다', description: '부족한 화(火) 기운을 채워, 하고 싶은 일의 열정이 수입으로 이어지도록 활력을 더하는 부적' },
  { id: 'money-토-1', category: 'money', element: '토', hanja: '積土成山', korean: '적토성산', meaning: '흙이 쌓여 산을 이룬다', description: '부족한 토(土) 기운을 채워, 작은 돈이 흩어지지 않고 산처럼 쌓이도록 돕는 부적' },
  { id: 'money-토-2', category: 'money', element: '토', hanja: '安如泰山', korean: '안여태산', meaning: '태산처럼 편안하고 든든하다', description: '부족한 토(土) 기운을 채워, 노후 준비의 기반을 산처럼 든든하게 다져 주는 부적' },
  { id: 'money-토-3', category: 'money', element: '토', hanja: '厚德載物', korean: '후덕재물', meaning: '두터운 덕이 만물을 싣는다', description: '부족한 토(土) 기운을 채워, 너른 땅처럼 들어온 재물을 넉넉히 담아 지키게 하는 부적' },
  { id: 'money-금-1', category: 'money', element: '금', hanja: '點石成金', korean: '점석성금', meaning: '돌을 만져 금으로 만든다', description: '부족한 금(金) 기운을 채워, 가진 것을 값지게 바꾸는 안목과 결단을 보태는 부적' },
  { id: 'money-금-2', category: 'money', element: '금', hanja: '金玉滿堂', korean: '금옥만당', meaning: '금과 옥이 집에 가득하다', description: '부족한 금(金) 기운을 채워, 모은 재물이 단단히 지켜지며 가득 차도록 돕는 부적' },
  { id: 'money-금-3', category: 'money', element: '금', hanja: '克勤克儉', korean: '극근극검', meaning: '부지런하고 검소하다', description: '부족한 금(金) 기운을 채워, 새는 지출을 단호하게 끊고 아낀 만큼 모으게 돕는 부적' },
  { id: 'money-수-1', category: 'money', element: '수', hanja: '源泉不渴', korean: '원천불갈', meaning: '근원의 샘이 마르지 않는다', description: '부족한 수(水) 기운을 채워, 수입의 샘이 마르지 않고 꾸준히 솟도록 돕는 부적' },
  { id: 'money-수-2', category: 'money', element: '수', hanja: '財源廣進', korean: '재원광진', meaning: '재물의 근원이 널리 들어온다', description: '부족한 수(水) 기운을 채워, 막힌 돈길을 물길처럼 넓게 트이게 하는 부적' },
  { id: 'money-수-3', category: 'money', element: '수', hanja: '細水長流', korean: '세수장류', meaning: '가는 물이 길게 흐른다', description: '부족한 수(水) 기운을 채워, 무리하지 않고 오래 이어지는 저축과 관리를 돕는 부적' },

  // 취업/이직
  { id: 'job-목-1', category: 'job', element: '목', hanja: '良禽擇木', korean: '양금택목', meaning: '좋은 새는 나무를 가려 앉는다', description: '부족한 목(木) 기운을 채워, 나에게 맞는 자리를 잘 고르는 안목을 더하는 부적' },
  { id: 'job-목-2', category: 'job', element: '목', hanja: '破竹之勢', korean: '파죽지세', meaning: '대나무를 쪼개듯 거침없는 기세', description: '부족한 목(木) 기운을 채워, 준비한 노력이 막힘없이 합격으로 이어지길 응원하는 부적' },
  { id: 'job-목-3', category: 'job', element: '목', hanja: '靑雲之志', korean: '청운지지', meaning: '푸른 구름 위로 오르려는 뜻', description: '부족한 목(木) 기운을 채워, 익숙한 자리를 넘어 더 높이 뻗어 나가도록 돕는 부적' },
  { id: 'job-화-1', category: 'job', element: '화', hanja: '大鵬展翅', korean: '대붕전시', meaning: '큰 새가 날개를 편다', description: '부족한 화(火) 기운을 채워, 위로 솟는 불기운처럼 크게 도약하도록 돕는 부적' },
  { id: 'job-화-2', category: 'job', element: '화', hanja: '光彩奪目', korean: '광채탈목', meaning: '빛이 눈부셔 시선을 빼앗는다', description: '부족한 화(火) 기운을 채워, 면접에서 나를 밝고 또렷하게 드러내도록 돕는 부적' },
  { id: 'job-화-3', category: 'job', element: '화', hanja: '意氣揚揚', korean: '의기양양', meaning: '뜻과 기운이 드높다', description: '부족한 화(火) 기운을 채워, 길어진 구직에 지친 마음에 다시 불을 지펴 주는 부적' },
  { id: 'job-토-1', category: 'job', element: '토', hanja: '得其所哉', korean: '득기소재', meaning: '제자리를 얻었구나', description: '부족한 토(土) 기운을 채워, 오래 머물 좋은 자리에 뿌리내리도록 안정감을 채워 주는 부적' },
  { id: 'job-토-2', category: 'job', element: '토', hanja: '安居樂業', korean: '안거낙업', meaning: '편히 살며 즐겁게 일한다', description: '부족한 토(土) 기운을 채워, 새 직장에 단단히 자리 잡고 즐겁게 일하길 응원하는 부적' },
  { id: 'job-토-3', category: 'job', element: '토', hanja: '堂堂正正', korean: '당당정정', meaning: '떳떳하고 바르다', description: '부족한 토(土) 기운을 채워, 흔들리지 않고 내 기준을 지키며 협상하도록 중심을 잡아 주는 부적' },
  { id: 'job-금-1', category: 'job', element: '금', hanja: '快刀亂麻', korean: '쾌도난마', meaning: '잘 드는 칼로 엉킨 삼을 자른다', description: '부족한 금(金) 기운을 채워, 머뭇거림을 끊고 결정할 힘을 주는 부적' },
  { id: 'job-금-2', category: 'job', element: '금', hanja: '擇善固執', korean: '택선고집', meaning: '좋은 것을 골라 굳게 지킨다', description: '부족한 금(金) 기운을 채워, 내가 받아야 할 몫을 분명히 정하고 지켜 내도록 돕는 부적' },
  { id: 'job-금-3', category: 'job', element: '금', hanja: '是非分明', korean: '시비분명', meaning: '옳고 그름이 분명하다', description: '부족한 금(金) 기운을 채워, 여러 갈래 가운데 나에게 맞는 길을 또렷하게 가려내게 하는 부적' },
  { id: 'job-수-1', category: 'job', element: '수', hanja: '順水推舟', korean: '순수추주', meaning: '물결을 따라 배를 민다', description: '부족한 수(水) 기운을 채워, 좋은 기회의 흐름을 타고 자연스럽게 나아가도록 돕는 부적' },
  { id: 'job-수-2', category: 'job', element: '수', hanja: '上善若水', korean: '상선약수', meaning: '가장 좋은 것은 물과 같다', description: '부족한 수(水) 기운을 채워, 새 환경에 물처럼 자연스럽게 스며들도록 돕는 부적' },
  { id: 'job-수-3', category: 'job', element: '수', hanja: '水到渠成', korean: '수도거성', meaning: '물이 이르면 도랑이 절로 생긴다', description: '부족한 수(水) 기운을 채워, 준비가 차면 길이 저절로 열리도록 흐름을 더하는 부적' },

  // 인간관계
  { id: 'relation-목-1', category: 'relation', element: '목', hanja: '芝蘭之交', korean: '지란지교', meaning: '지초와 난초 같은 맑은 사귐', description: '부족한 목(木) 기운을 채워, 새로운 인연이 향기롭게 자라나도록 돕는 부적' },
  { id: 'relation-목-2', category: 'relation', element: '목', hanja: '松茂柏悅', korean: '송무백열', meaning: '소나무가 무성하면 잣나무가 기뻐한다', description: '부족한 목(木) 기운을 채워, 서로의 잘됨을 함께 기뻐하는 관계를 응원하는 부적' },
  { id: 'relation-목-3', category: 'relation', element: '목', hanja: '竹馬故友', korean: '죽마고우', meaning: '대나무 말을 타고 놀던 옛 벗', description: '부족한 목(木) 기운을 채워, 오래된 인연을 다시 잇고 넓혀 가도록 돕는 부적' },
  { id: 'relation-화-1', category: 'relation', element: '화', hanja: '和氣靄靄', korean: '화기애애', meaning: '따뜻한 기운이 가득하다', description: '부족한 화(火) 기운을 채워, 함께 있는 자리를 따뜻하고 밝게 만들어 주는 부적' },
  { id: 'relation-화-2', category: 'relation', element: '화', hanja: '笑門萬福', korean: '소문만복', meaning: '웃는 집에 온갖 복이 온다', description: '부족한 화(火) 기운을 채워, 웃음이 머무는 자리에 사람과 복이 모이도록 돕는 부적' },
  { id: 'relation-화-3', category: 'relation', element: '화', hanja: '肝膽相照', korean: '간담상조', meaning: '속마음을 서로 환히 비춘다', description: '부족한 화(火) 기운을 채워, 외로움을 녹이고 진심을 터놓을 사람을 만나게 돕는 부적' },
  { id: 'relation-토-1', category: 'relation', element: '토', hanja: '管鮑之交', korean: '관포지교', meaning: '관중과 포숙처럼 믿음 깊은 사귐', description: '부족한 토(土) 기운을 채워, 서로 믿고 기댈 수 있는 관계를 단단히 다지는 부적' },
  { id: 'relation-토-2', category: 'relation', element: '토', hanja: '寬仁大度', korean: '관인대도', meaning: '너그럽고 어질며 도량이 크다', description: '부족한 토(土) 기운을 채워, 사람에 지칠 때 넉넉한 마음으로 품을 여유를 주는 부적' },
  { id: 'relation-토-3', category: 'relation', element: '토', hanja: '莫逆之友', korean: '막역지우', meaning: '서로 거스름이 없는 벗', description: '부족한 토(土) 기운을 채워, 곁에 오래 머무는 든든한 내 편을 만나게 돕는 부적' },
  { id: 'relation-금-1', category: 'relation', element: '금', hanja: '取捨選擇', korean: '취사선택', meaning: '취할 것과 버릴 것을 가린다', description: '부족한 금(金) 기운을 채워, 나를 지치게 하는 관계를 깔끔하게 정리할 힘을 주는 부적' },
  { id: 'relation-금-2', category: 'relation', element: '금', hanja: '外柔內剛', korean: '외유내강', meaning: '겉은 부드럽고 속은 굳세다', description: '부족한 금(金) 기운을 채워, 부드럽되 거절할 땐 단호하게 선을 긋도록 돕는 부적' },
  { id: 'relation-금-3', category: 'relation', element: '금', hanja: '金石之交', korean: '금석지교', meaning: '쇠와 돌처럼 굳은 사귐', description: '부족한 금(金) 기운을 채워, 변치 않는 진짜 내 사람을 알아보게 돕는 부적' },
  { id: 'relation-수-1', category: 'relation', element: '수', hanja: '以心傳心', korean: '이심전심', meaning: '마음에서 마음으로 전한다', description: '부족한 수(水) 기운을 채워, 말과 마음이 물처럼 막힘없이 오가게 하는 부적' },
  { id: 'relation-수-2', category: 'relation', element: '수', hanja: '君子之交', korean: '군자지교', meaning: '물처럼 담백한 군자의 사귐', description: '부족한 수(水) 기운을 채워, 쌓인 서운함을 흘려보내고 관계를 맑게 하는 부적' },
  { id: 'relation-수-3', category: 'relation', element: '수', hanja: '水魚之交', korean: '수어지교', meaning: '물과 물고기처럼 떨어질 수 없는 사귐', description: '부족한 수(水) 기운을 채워, 나와 잘 맞는 인연이 이어져 찾아오도록 돕는 부적' },

  // 건강
  { id: 'health-목-1', category: 'health', element: '목', hanja: '生氣潑剌', korean: '생기발랄', meaning: '생기가 넘친다', description: '부족한 목(木) 기운을 채워, 몸과 마음에 새싹 같은 생기를 더하는 부적' },
  { id: 'health-목-2', category: 'health', element: '목', hanja: '枯木逢春', korean: '고목봉춘', meaning: '마른 나무가 봄을 만난다', description: '부족한 목(木) 기운을 채워, 지친 몸에 다시 움트는 기운을 응원하는 부적' },
  { id: 'health-목-3', category: 'health', element: '목', hanja: '欣欣向榮', korean: '흔흔향영', meaning: '초목이 무럭무럭 자란다', description: '부족한 목(木) 기운을 채워, 미뤄 둔 운동을 시작하고 꾸준히 이어 가길 응원하는 부적' },
  { id: 'health-화-1', category: 'health', element: '화', hanja: '龍馬精神', korean: '용마정신', meaning: '용마처럼 왕성한 기운', description: '부족한 화(火) 기운을 채워, 지친 하루에 다시 힘을 불어넣는 부적' },
  { id: 'health-화-2', category: 'health', element: '화', hanja: '春暖花開', korean: '춘난화개', meaning: '봄날이 따뜻하고 꽃이 핀다', description: '부족한 화(火) 기운을 채워, 몸을 따뜻하게 돌보는 생활 습관을 응원하는 부적' },
  { id: 'health-화-3', category: 'health', element: '화', hanja: '旭日昇天', korean: '욱일승천', meaning: '아침 해가 하늘로 솟는다', description: '부족한 화(火) 기운을 채워, 아침을 힘차게 여는 활력에 불을 붙이는 부적' },
  { id: 'health-토-1', category: 'health', element: '토', hanja: '起居有常', korean: '기거유상', meaning: '일어나고 머묾에 일정함이 있다', description: '부족한 토(土) 기운을 채워, 흐트러진 하루 리듬의 중심을 잡아 주는 부적' },
  { id: 'health-토-2', category: 'health', element: '토', hanja: '飮食有節', korean: '음식유절', meaning: '먹고 마심에 절도가 있다', description: '부족한 토(土) 기운을 채워, 규칙적이고 균형 잡힌 식사 습관을 다져 주는 부적' },
  { id: 'health-토-3', category: 'health', element: '토', hanja: '堅如磐石', korean: '견여반석', meaning: '반석처럼 단단하다', description: '부족한 토(土) 기운을 채워, 오래가는 기초 체력을 땅처럼 다져 가길 응원하는 부적' },
  { id: 'health-금-1', category: 'health', element: '금', hanja: '克己復禮', korean: '극기복례', meaning: '나를 이겨 바른 데로 돌아간다', description: '부족한 금(金) 기운을 채워, 끊어야 할 습관을 단호하게 정리하도록 돕는 부적' },
  { id: 'health-금-2', category: 'health', element: '금', hanja: '規矩準繩', korean: '규구준승', meaning: '지켜야 할 법도와 기준', description: '부족한 금(金) 기운을 채워, 정해진 시간에 자고 일어나는 단단한 규칙을 세워 주는 부적' },
  { id: 'health-금-3', category: 'health', element: '금', hanja: '吐故納新', korean: '토고납신', meaning: '묵은 기운을 내뱉고 새 기운을 들인다', description: '부족한 금(金) 기운을 채워, 맑고 깊은 숨으로 몸과 마음을 정돈하길 바라는 부적' },
  { id: 'health-수-1', category: 'health', element: '수', hanja: '高枕安眠', korean: '고침안면', meaning: '베개를 높이 하고 편히 잔다', description: '부족한 수(水) 기운을 채워, 깊고 편안한 잠을 응원하는 부적' },
  { id: 'health-수-2', category: 'health', element: '수', hanja: '一張一弛', korean: '일장일이', meaning: '한 번 당기고 한 번 늦춘다', description: '부족한 수(水) 기운을 채워, 쉬어야 할 때 제대로 쉬며 기운을 회복하도록 돕는 부적' },
  { id: 'health-수-3', category: 'health', element: '수', hanja: '流水不腐', korean: '유수불부', meaning: '흐르는 물은 썩지 않는다', description: '부족한 수(水) 기운을 채워, 몸을 자주 움직여 흐름을 챙기는 습관을 응원하는 부적' },

  // 직장/커리어 성장
  { id: 'career-목-1', category: 'career', element: '목', hanja: '步步高昇', korean: '보보고승', meaning: '걸음마다 높이 오른다', description: '부족한 목(木) 기운을 채워, 한 단계씩 위로 뻗어 오르는 힘을 더하는 부적' },
  { id: 'career-목-2', category: 'career', element: '목', hanja: '開物成務', korean: '개물성무', meaning: '만물을 열어 일을 이룬다', description: '부족한 목(木) 기운을 채워, 새로운 일로 가지를 뻗어 나갈 용기를 주는 부적' },
  { id: 'career-목-3', category: 'career', element: '목', hanja: '日就月將', korean: '일취월장', meaning: '날로 달로 나아간다', description: '부족한 목(木) 기운을 채워, 매일의 노력이 나이테처럼 실력으로 쌓이도록 돕는 부적' },
  { id: 'career-화-1', category: 'career', element: '화', hanja: '薪盡火傳', korean: '신진화전', meaning: '장작이 다해도 불씨는 이어진다', description: '부족한 화(火) 기운을 채워, 번아웃으로 꺼진 열정에 다시 불을 붙이는 부적' },
  { id: 'career-화-2', category: 'career', element: '화', hanja: '光芒萬丈', korean: '광망만장', meaning: '빛살이 만 길에 뻗친다', description: '부족한 화(火) 기운을 채워, 내가 한 일이 제대로 빛나고 인정받도록 돕는 부적' },
  { id: 'career-화-3', category: 'career', element: '화', hanja: '意氣軒昂', korean: '의기헌앙', meaning: '기세가 드높고 당당하다', description: '부족한 화(火) 기운을 채워, 회의와 발표에서 내 생각을 자신 있게 펼치게 돕는 부적' },
  { id: 'career-토-1', category: 'career', element: '토', hanja: '一諾千金', korean: '일낙천금', meaning: '한 번의 약속이 천금처럼 무겁다', description: '부족한 토(土) 기운을 채워, 함께하는 사람들에게 믿음을 주는 사람이 되도록 돕는 부적' },
  { id: 'career-토-2', category: 'career', element: '토', hanja: '泰然自若', korean: '태연자약', meaning: '흔들림 없이 태연하다', description: '부족한 토(土) 기운을 채워, 바쁜 하루 속에서도 나의 페이스와 중심을 지키게 하는 부적' },
  { id: 'career-토-3', category: 'career', element: '토', hanja: '和而不同', korean: '화이부동', meaning: '어울리되 휩쓸리지 않는다', description: '부족한 토(土) 기운을 채워, 함께 일하는 사람들과 조화롭게 지내면서도 나를 지키게 돕는 부적' },
  { id: 'career-금-1', category: 'career', element: '금', hanja: '一刀兩斷', korean: '일도양단', meaning: '한칼에 둘로 가른다', description: '부족한 금(金) 기운을 채워, 우선순위를 정하고 과감하게 결정하도록 돕는 부적' },
  { id: 'career-금-2', category: 'career', element: '금', hanja: '適可而止', korean: '적가이지', meaning: '알맞은 때에 그친다', description: '부족한 금(金) 기운을 채워, 넘치는 일을 끊어 낼 줄 알게 해 소진을 막아 주는 부적' },
  { id: 'career-금-3', category: 'career', element: '금', hanja: '切磋琢磨', korean: '절차탁마', meaning: '옥과 돌을 갈고 닦는다', description: '부족한 금(金) 기운을 채워, 나만의 전문성을 날카롭게 다듬게 하는 부적' },
  { id: 'career-수-1', category: 'career', element: '수', hanja: '智者樂水', korean: '지자요수', meaning: '지혜로운 이는 물을 좋아한다', description: '부족한 수(水) 기운을 채워, 복잡한 사람 관계를 지혜롭게 헤쳐 가게 하는 부적' },
  { id: 'career-수-2', category: 'career', element: '수', hanja: '臨機應變', korean: '임기응변', meaning: '때에 맞춰 알맞게 대처한다', description: '부족한 수(水) 기운을 채워, 일의 전환과 변화에 물처럼 유연하게 적응하도록 돕는 부적' },
  { id: 'career-수-3', category: 'career', element: '수', hanja: '養精蓄銳', korean: '양정축예', meaning: '기운을 기르고 힘을 모아 둔다', description: '부족한 수(水) 기운을 채워, 일과 쉼의 흐름을 되찾아 다시 일할 힘을 채워 주는 부적' },

  // 마음/멘탈
  { id: 'mind-목-1', category: 'mind', element: '목', hanja: '自强不息', korean: '자강불식', meaning: '스스로 힘쓰며 쉬지 않는다', description: '부족한 목(木) 기운을 채워, 나를 믿는 마음이 곧게 자라도록 돕는 부적' },
  { id: 'mind-목-2', category: 'mind', element: '목', hanja: '前程萬里', korean: '전정만리', meaning: '앞길이 만 리나 펼쳐져 있다', description: '부족한 목(木) 기운을 채워, 삶의 방향을 향해 한 걸음 내딛는 용기를 주는 부적' },
  { id: 'mind-목-3', category: 'mind', element: '목', hanja: '心機一轉', korean: '심기일전', meaning: '마음을 새롭게 고쳐먹는다', description: '부족한 목(木) 기운을 채워, 새봄처럼 마음을 새로 먹고 다시 시작하게 돕는 부적' },
  { id: 'mind-화-1', category: 'mind', element: '화', hanja: '撥雲見日', korean: '발운견일', meaning: '구름을 걷어 내고 해를 본다', description: '부족한 화(火) 기운을 채워, 움츠러든 마음을 걷어 내고 나를 다시 밝게 비춰 주는 부적' },
  { id: 'mind-화-2', category: 'mind', element: '화', hanja: '一陽來復', korean: '일양래복', meaning: '하나의 양기가 다시 돌아온다', description: '부족한 화(火) 기운을 채워, 불안한 마음에 다시 따뜻한 기운이 돌아오길 바라는 부적' },
  { id: 'mind-화-3', category: 'mind', element: '화', hanja: '喜色滿面', korean: '희색만면', meaning: '기쁜 빛이 얼굴에 가득하다', description: '부족한 화(火) 기운을 채워, 잊고 있던 즐거움과 설렘을 되찾게 돕는 부적' },
  { id: 'mind-토-1', category: 'mind', element: '토', hanja: '安心立命', korean: '안심입명', meaning: '마음을 편히 하고 삶을 굳게 세운다', description: '부족한 토(土) 기운을 채워, 흔들리는 마음을 땅처럼 단단히 붙잡아 주는 부적' },
  { id: 'mind-토-2', category: 'mind', element: '토', hanja: '處變不驚', korean: '처변불경', meaning: '변고를 만나도 놀라지 않는다', description: '부족한 토(土) 기운을 채워, 스트레스 속에서도 평온을 지키게 돕는 부적' },
  { id: 'mind-토-3', category: 'mind', element: '토', hanja: '安分知足', korean: '안분지족', meaning: '제 분수에 편안히 만족한다', description: '부족한 토(土) 기운을 채워, 있는 그대로의 나를 넉넉하게 품어 주는 부적' },
  { id: 'mind-금-1', category: 'mind', element: '금', hanja: '去繁就簡', korean: '거번취간', meaning: '번잡함을 버리고 간결함을 취한다', description: '부족한 금(金) 기운을 채워, 머릿속 걱정을 깔끔하게 정리하게 돕는 부적' },
  { id: 'mind-금-2', category: 'mind', element: '금', hanja: '鐵心石腸', korean: '철심석장', meaning: '쇠 같은 마음, 돌 같은 굳셈', description: '부족한 금(金) 기운을 채워, 남의 말에 흔들리지 않는 단단한 심지를 세워 주는 부적' },
  { id: 'mind-금-3', category: 'mind', element: '금', hanja: '知行合一', korean: '지행합일', meaning: '아는 것과 행하는 것이 하나다', description: '부족한 금(金) 기운을 채워, 고민을 끝내고 결심한 것을 실행하게 돕는 부적' },
  { id: 'mind-수-1', category: 'mind', element: '수', hanja: '明鏡止水', korean: '명경지수', meaning: '맑은 거울과 고요한 물', description: '부족한 수(水) 기운을 채워, 쌓인 스트레스를 가라앉히고 마음을 맑게 하는 부적' },
  { id: 'mind-수-2', category: 'mind', element: '수', hanja: '行雲流水', korean: '행운유수', meaning: '떠가는 구름과 흐르는 물', description: '부족한 수(水) 기운을 채워, 걱정이 물처럼 흘러가 오래 머물지 않길 바라는 부적' },
  { id: 'mind-수-3', category: 'mind', element: '수', hanja: '深謀遠慮', korean: '심모원려', meaning: '깊이 생각하고 멀리 내다본다', description: '부족한 수(水) 기운을 채워, 지금 나에게 정말 중요한 것을 깊이 들여다보게 돕는 부적' },

  // 연애/결혼
  { id: 'love-목-1', category: 'love', element: '목', hanja: '桃之夭夭', korean: '도지요요', meaning: '복숭아꽃이 곱게 피었다', description: '부족한 목(木) 기운을 채워, 새로운 인연의 꽃이 피어나도록 돕는 부적' },
  { id: 'love-목-2', category: 'love', element: '목', hanja: '連理之枝', korean: '연리지지', meaning: '두 나무의 가지가 하나로 이어졌다', description: '부족한 목(木) 기운을 채워, 시작된 관계가 천천히 깊어지도록 응원하는 부적' },
  { id: 'love-목-3', category: 'love', element: '목', hanja: '春風解凍', korean: '춘풍해동', meaning: '봄바람에 얼음이 녹는다', description: '부족한 목(木) 기운을 채워, 이별의 아픔이 녹고 새 마음이 움트도록 돕는 부적' },
  { id: 'love-화-1', category: 'love', element: '화', hanja: '一見鍾情', korean: '일견종정', meaning: '첫눈에 마음이 끌린다', description: '부족한 화(火) 기운을 채워, 설렘의 불씨를 지펴 주는 부적' },
  { id: 'love-화-2', category: 'love', element: '화', hanja: '光彩照人', korean: '광채조인', meaning: '빛이 사람을 환히 비춘다', description: '부족한 화(火) 기운을 채워, 나만의 매력을 자연스럽게 드러내게 돕는 부적' },
  { id: 'love-화-3', category: 'love', element: '화', hanja: '如膠似漆', korean: '여교사칠', meaning: '아교와 옻처럼 꼭 붙어 있다', description: '부족한 화(火) 기운을 채워, 연애의 따뜻함이 식지 않고 오래가길 바라는 부적' },
  { id: 'love-토-1', category: 'love', element: '토', hanja: '百年佳約', korean: '백년가약', meaning: '백 년을 함께하자는 아름다운 약속', description: '부족한 토(土) 기운을 채워, 결혼으로 이어지는 든든한 믿음을 다지는 부적' },
  { id: 'love-토-2', category: 'love', element: '토', hanja: '海誓山盟', korean: '해서산맹', meaning: '바다와 산에 걸고 맹세한다', description: '부족한 토(土) 기운을 채워, 서로 믿고 편안하게 기댈 수 있는 관계를 만드는 부적' },
  { id: 'love-토-3', category: 'love', element: '토', hanja: '琴瑟相和', korean: '금슬상화', meaning: '거문고와 비파가 잘 어울린다', description: '부족한 토(土) 기운을 채워, 둘이 함께할 화목한 보금자리를 응원하는 부적' },
  { id: 'love-금-1', category: 'love', element: '금', hanja: '慧劍斷情', korean: '혜검단정', meaning: '지혜의 칼로 얽힌 정을 끊는다', description: '부족한 금(金) 기운을 채워, 끝난 인연을 깔끔하게 정리할 힘을 주는 부적' },
  { id: 'love-금-2', category: 'love', element: '금', hanja: '慧眼識人', korean: '혜안식인', meaning: '밝은 눈으로 사람을 알아본다', description: '부족한 금(金) 기운을 채워, 나에게 맞는 사람을 알아보는 눈을 밝혀 주는 부적' },
  { id: 'love-금-3', category: 'love', element: '금', hanja: '金石爲開', korean: '금석위개', meaning: '정성이면 쇠와 돌도 열린다', description: '부족한 금(金) 기운을 채워, 망설이던 마음을 용기 있게 전하도록 돕는 부적' },
  { id: 'love-수-1', category: 'love', element: '수', hanja: '天作之合', korean: '천작지합', meaning: '하늘이 지어 준 짝', description: '부족한 수(水) 기운을 채워, 좋은 인연이 물 흐르듯 다가오게 돕는 부적' },
  { id: 'love-수-2', category: 'love', element: '수', hanja: '心心相印', korean: '심심상인', meaning: '마음과 마음이 서로 통한다', description: '부족한 수(水) 기운을 채워, 서로의 마음을 깊이 이해하고 대화가 잘 통하게 돕는 부적' },
  { id: 'love-수-3', category: 'love', element: '수', hanja: '雨過天晴', korean: '우과천청', meaning: '비가 지나고 하늘이 갠다', description: '부족한 수(水) 기운을 채워, 이별의 아픔을 흘려보내고 마음을 회복하게 돕는 부적' },

  // 가족/육아
  { id: 'family-목-1', category: 'family', element: '목', hanja: '芝蘭玉樹', korean: '지란옥수', meaning: '지초·난초·옥 같은 나무처럼 빼어난 자녀', description: '부족한 목(木) 기운을 채워, 아이가 곧고 밝게 자라길 바라는 부적' },
  { id: 'family-목-2', category: 'family', element: '목', hanja: '瓜瓞綿綿', korean: '과질면면', meaning: '오이 덩굴처럼 끊임없이 이어진다', description: '부족한 목(木) 기운을 채워, 가족의 웃음과 복이 덩굴처럼 번져 가길 바라는 부적' },
  { id: 'family-목-3', category: 'family', element: '목', hanja: '生生不息', korean: '생생불식', meaning: '생명이 끊임없이 이어진다', description: '부족한 목(木) 기운을 채워, 새 가족을 맞이하는 기쁨을 축복하는 부적' },
  { id: 'family-화-1', category: 'family', element: '화', hanja: '和氣致祥', korean: '화기치상', meaning: '화목한 기운이 상서로움을 부른다', description: '부족한 화(火) 기운을 채워, 집 안에 따뜻한 온기가 돌게 하는 부적' },
  { id: 'family-화-2', category: 'family', element: '화', hanja: '天倫之樂', korean: '천륜지락', meaning: '가족이 함께 누리는 즐거움', description: '부족한 화(火) 기운을 채워, 식탁에 웃음이 끊이지 않길 바라는 부적' },
  { id: 'family-화-3', category: 'family', element: '화', hanja: '朝氣蓬勃', korean: '조기봉발', meaning: '아침 기운처럼 생기가 넘친다', description: '부족한 화(火) 기운을 채워, 지치기 쉬운 육아에 다시 힘을 불어넣는 부적' },
  { id: 'family-토-1', category: 'family', element: '토', hanja: '家和萬事', korean: '가화만사', meaning: '집안이 화목하면 모든 일이 잘된다', description: '부족한 토(土) 기운을 채워, 집안이 화목해 모든 일이 잘 풀리길 바라는 부적' },
  { id: 'family-토-2', category: 'family', element: '토', hanja: '相敬如賓', korean: '상경여빈', meaning: '손님 대하듯 서로 공경한다', description: '부족한 토(土) 기운을 채워, 배우자와 서로 믿고 기대는 단단한 관계를 다지는 부적' },
  { id: 'family-토-3', category: 'family', element: '토', hanja: '昏定晨省', korean: '혼정신성', meaning: '저녁엔 잠자리를, 아침엔 안부를 살핀다', description: '부족한 토(土) 기운을 채워, 부모님과의 관계가 편안하고 안정되길 바라는 부적' },
  { id: 'family-금-1', category: 'family', element: '금', hanja: '結者解之', korean: '결자해지', meaning: '맺은 사람이 푼다', description: '부족한 금(金) 기운을 채워, 가족 사이에 쌓인 갈등을 매듭짓게 돕는 부적' },
  { id: 'family-금-2', category: 'family', element: '금', hanja: '各得其所', korean: '각득기소', meaning: '저마다 제자리를 얻는다', description: '부족한 금(金) 기운을 채워, 집안의 역할과 경계를 분명히 해 서로 지치지 않게 돕는 부적' },
  { id: 'family-금-3', category: 'family', element: '금', hanja: '孟母三遷', korean: '맹모삼천', meaning: '맹자의 어머니가 세 번 이사했다', description: '부족한 금(金) 기운을 채워, 아이를 위해 흔들림 없이 좋은 기준을 세우게 돕는 부적' },
  { id: 'family-수-1', category: 'family', element: '수', hanja: '水乳交融', korean: '수유교융', meaning: '물과 젖처럼 잘 어우러진다', description: '부족한 수(水) 기운을 채워, 가족 간 대화가 막힘없이 흐르게 하는 부적' },
  { id: 'family-수-2', category: 'family', element: '수', hanja: '兄友弟恭', korean: '형우제공', meaning: '형은 아끼고 아우는 공경한다', description: '부족한 수(水) 기운을 채워, 부모·형제 사이의 서운함을 흘려보내고 가까워지게 돕는 부적' },
  { id: 'family-수-3', category: 'family', element: '수', hanja: '潤物無聲', korean: '윤물무성', meaning: '소리 없이 만물을 적신다', description: '부족한 수(水) 기운을 채워, 아이의 마음을 조용히 헤아리고 적셔 주는 지혜를 더하는 부적' },
]

// §3.7 조회 — (카테고리, 부족오행) → 3개. R6 determineLackingElement()가 정한 오행을 그대로 넘기면 된다.
export function getTalismans(category: CategoryKey, element: TalismanElement): Talisman[] {
  return TALISMANS.filter((t) => t.category === category && t.element === element)
}
