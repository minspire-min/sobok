import type { CategoryKey } from './categories.ts'

export type TalismanElement = '목' | '화' | '토' | '금' | '수'

export type Talisman = {
  id: string
  category: CategoryKey
  element: TalismanElement
  korean: string
  hanja: string
  description: string
}

// PRD v2 §3.7 R7 — TALISMAN_TABLE.md 120종(카테고리8 × 부족오행5 × 3개)을 그대로 코드화.
// ID(`카테고리-오행-번호`)는 고도화 단계(부적 저장·위젯)의 기준키라 바꾸지 않는다.
export const TALISMANS: Talisman[] = [
  // 재물/돈
  { id: 'money-목-1', category: 'money', element: '목', korean: '생재번창', hanja: '生財繁昌', description: '부족한 목(木) 기운을 채워, 들어오는 돈이 가지를 뻗듯 늘어나도록 성장의 기운을 보태는 부적' },
  { id: 'money-목-2', category: 'money', element: '목', korean: '재원발아', hanja: '財源發芽', description: '부족한 목(木) 기운을 채워, 새로운 수입원의 싹을 틔우는 시작의 힘을 채워 주는 부적' },
  { id: 'money-목-3', category: 'money', element: '목', korean: '복리성장', hanja: '複利成長', description: '부족한 목(木) 기운을 채워, 저축·투자가 나무처럼 천천히, 꾸준히 자라도록 돕는 부적' },
  { id: 'money-화-1', category: 'money', element: '화', korean: '재운점화', hanja: '財運點火', description: '부족한 화(火) 기운을 채워, 멈춰 있던 돈의 흐름에 다시 불을 붙여 주는 부적' },
  { id: 'money-화-2', category: 'money', element: '화', korean: '금전광명', hanja: '金錢光明', description: '부족한 화(火) 기운을 채워, 돈 앞에서 움츠러들지 않고 내 가치를 밝게 드러내도록 돕는 부적' },
  { id: 'money-화-3', category: 'money', element: '화', korean: '흥재왕성', hanja: '興財旺盛', description: '부족한 화(火) 기운을 채워, 하고 싶은 일의 열정이 수입으로 이어지도록 활력을 더하는 부적' },
  { id: 'money-토-1', category: 'money', element: '토', korean: '재물안착', hanja: '財物安着', description: '부족한 토(土) 기운을 채워, 들어온 돈이 흩어지지 않고 단단히 자리 잡게 하는 부적' },
  { id: 'money-토-2', category: 'money', element: '토', korean: '태산적재', hanja: '泰山積財', description: '부족한 토(土) 기운을 채워, 작은 저축이 태산처럼 차곡차곡 쌓이도록 돕는 부적' },
  { id: 'money-토-3', category: 'money', element: '토', korean: '노후안정', hanja: '老後安定', description: '부족한 토(土) 기운을 채워, 노후 준비의 기반을 땅처럼 든든하게 다져 주는 부적' },
  { id: 'money-금-1', category: 'money', element: '금', korean: '절용축재', hanja: '節用蓄財', description: '부족한 금(金) 기운을 채워, 새는 지출을 단호하게 끊고 아낀 만큼 모으게 돕는 부적' },
  { id: 'money-금-2', category: 'money', element: '금', korean: '결단투자', hanja: '決斷投資', description: '부족한 금(金) 기운을 채워, 망설임 없이 기준을 세워 판단하도록 결단력을 보태는 부적' },
  { id: 'money-금-3', category: 'money', element: '금', korean: '수재견고', hanja: '守財堅固', description: '부족한 금(金) 기운을 채워, 모아 둔 재물을 금고처럼 단단히 지켜 주는 부적' },
  { id: 'money-수-1', category: 'money', element: '수', korean: '재로통달', hanja: '財路通達', description: '부족한 수(水) 기운을 채워, 막힌 돈길을 물길처럼 시원하게 트이게 하는 부적' },
  { id: 'money-수-2', category: 'money', element: '수', korean: '유수생재', hanja: '流水生財', description: '부족한 수(水) 기운을 채워, 돈이 고이지 않고 자연스럽게 돌며 불어나도록 돕는 부적' },
  { id: 'money-수-3', category: 'money', element: '수', korean: '지혜관재', hanja: '智慧管財', description: '부족한 수(水) 기운을 채워, 소득과 지출의 흐름을 지혜롭게 읽고 관리하게 돕는 부적' },

  // 취업/이직
  { id: 'job-목-1', category: 'job', element: '목', korean: '신록출발', hanja: '新綠出發', description: '부족한 목(木) 기운을 채워, 새 출발에 필요한 추진력을 새잎처럼 돋아나게 하는 부적' },
  { id: 'job-목-2', category: 'job', element: '목', korean: '합격만개', hanja: '合格滿開', description: '부족한 목(木) 기운을 채워, 준비한 노력이 꽃처럼 피어 합격으로 이어지길 응원하는 부적' },
  { id: 'job-목-3', category: 'job', element: '목', korean: '이직도약', hanja: '移職跳躍', description: '부족한 목(木) 기운을 채워, 익숙한 자리를 넘어 한 단계 더 뻗어 나가도록 돕는 부적' },
  { id: 'job-화-1', category: 'job', element: '화', korean: '면접광채', hanja: '面接光彩', description: '부족한 화(火) 기운을 채워, 면접에서 나를 밝고 자신 있게 드러내도록 돕는 부적' },
  { id: 'job-화-2', category: 'job', element: '화', korean: '의욕충전', hanja: '意欲充電', description: '부족한 화(火) 기운을 채워, 길어진 구직에 지친 마음에 다시 불을 지펴 주는 부적' },
  { id: 'job-화-3', category: 'job', element: '화', korean: '존재각인', hanja: '存在刻印', description: '부족한 화(火) 기운을 채워, 나의 강점을 상대에게 또렷하게 남기도록 표현력을 더하는 부적' },
  { id: 'job-토-1', category: 'job', element: '토', korean: '정착안심', hanja: '定着安心', description: '부족한 토(土) 기운을 채워, 오래 머물 좋은 자리에 뿌리내리도록 안정감을 채워 주는 부적' },
  { id: 'job-토-2', category: 'job', element: '토', korean: '신뢰인상', hanja: '信賴印象', description: '부족한 토(土) 기운을 채워, 믿음직한 첫인상으로 상대의 신뢰를 얻게 돕는 부적' },
  { id: 'job-토-3', category: 'job', element: '토', korean: '협상중심', hanja: '協商中心', description: '부족한 토(土) 기운을 채워, 흔들리지 않고 내 기준을 지키며 협상하도록 중심을 잡아 주는 부적' },
  { id: 'job-금-1', category: 'job', element: '금', korean: '결단이직', hanja: '決斷移職', description: '부족한 금(金) 기운을 채워, 머뭇거림을 끊고 결정할 힘을 주는 부적' },
  { id: 'job-금-2', category: 'job', element: '금', korean: '연봉관철', hanja: '年俸貫徹', description: '부족한 금(金) 기운을 채워, 내가 받아야 할 몫을 분명히 말하고 지켜 내도록 돕는 부적' },
  { id: 'job-금-3', category: 'job', element: '금', korean: '선택명료', hanja: '選擇明瞭', description: '부족한 금(金) 기운을 채워, 여러 갈래 가운데 나에게 맞는 길을 또렷하게 가려내게 하는 부적' },
  { id: 'job-수-1', category: 'job', element: '수', korean: '기회순류', hanja: '機會順流', description: '부족한 수(水) 기운을 채워, 좋은 기회가 물 흐르듯 찾아오도록 흐름을 열어 주는 부적' },
  { id: 'job-수-2', category: 'job', element: '수', korean: '유연적응', hanja: '柔軟適應', description: '부족한 수(水) 기운을 채워, 새 환경에 물처럼 자연스럽게 스며들도록 돕는 부적' },
  { id: 'job-수-3', category: 'job', element: '수', korean: '정보통달', hanja: '情報通達', description: '부족한 수(水) 기운을 채워, 필요한 정보와 사람의 흐름을 잘 읽어 내도록 지혜를 더하는 부적' },

  // 인간관계
  { id: 'relation-목-1', category: 'relation', element: '목', korean: '인연성장', hanja: '因緣成長', description: '부족한 목(木) 기운을 채워, 새로운 인연이 천천히 자라나도록 돕는 부적' },
  { id: 'relation-목-2', category: 'relation', element: '목', korean: '우정상록', hanja: '友情常綠', description: '부족한 목(木) 기운을 채워, 사계절 푸른 나무처럼 오래가는 우정을 응원하는 부적' },
  { id: 'relation-목-3', category: 'relation', element: '목', korean: '교류확장', hanja: '交流擴張', description: '부족한 목(木) 기운을 채워, 만남의 가지를 넓혀 새로운 사람과 이어지게 하는 부적' },
  { id: 'relation-화-1', category: 'relation', element: '화', korean: '온기전달', hanja: '溫氣傳達', description: '부족한 화(火) 기운을 채워, 내 마음의 따뜻함이 상대에게 잘 닿게 하는 부적' },
  { id: 'relation-화-2', category: 'relation', element: '화', korean: '소문만복', hanja: '笑門萬福', description: '부족한 화(火) 기운을 채워, 웃음이 머무는 자리에 사람과 복이 모이도록 돕는 부적' },
  { id: 'relation-화-3', category: 'relation', element: '화', korean: '고독해빙', hanja: '孤獨解氷', description: '부족한 화(火) 기운을 채워, 외로움의 얼음을 녹이고 따뜻한 연결을 불러오는 부적' },
  { id: 'relation-토-1', category: 'relation', element: '토', korean: '신의돈독', hanja: '信義敦篤', description: '부족한 토(土) 기운을 채워, 서로 믿고 기댈 수 있는 관계를 단단히 다지는 부적' },
  { id: 'relation-토-2', category: 'relation', element: '토', korean: '포용여유', hanja: '包容餘裕', description: '부족한 토(土) 기운을 채워, 사람에 지칠 때 넉넉한 마음으로 품을 여유를 주는 부적' },
  { id: 'relation-토-3', category: 'relation', element: '토', korean: '지기상봉', hanja: '知己相逢', description: '부족한 토(土) 기운을 채워, 나를 알아주는 든든한 벗을 만나게 돕는 부적' },
  { id: 'relation-금-1', category: 'relation', element: '금', korean: '관계정리', hanja: '關係整理', description: '부족한 금(金) 기운을 채워, 나를 지치게 하는 관계를 깔끔하게 정리할 힘을 주는 부적' },
  { id: 'relation-금-2', category: 'relation', element: '금', korean: '경계분명', hanja: '境界分明', description: '부족한 금(金) 기운을 채워, 거절해야 할 때 단호하게 선을 그을 수 있도록 돕는 부적' },
  { id: 'relation-금-3', category: 'relation', element: '금', korean: '진심선별', hanja: '眞心選別', description: '부족한 금(金) 기운을 채워, 진짜 내 사람을 알아보는 눈을 밝혀 주는 부적' },
  { id: 'relation-수-1', category: 'relation', element: '수', korean: '소통원활', hanja: '疏通圓滑', description: '부족한 수(水) 기운을 채워, 말과 마음이 막힘없이 오가게 하는 부적' },
  { id: 'relation-수-2', category: 'relation', element: '수', korean: '감정순환', hanja: '感情循環', description: '부족한 수(水) 기운을 채워, 쌓인 서운함을 흘려보내고 관계를 새롭게 하는 부적' },
  { id: 'relation-수-3', category: 'relation', element: '수', korean: '선연내도', hanja: '善緣來到', description: '부족한 수(水) 기운을 채워, 좋은 인연이 물결처럼 이어져 찾아오도록 돕는 부적' },

  // 건강
  { id: 'health-목-1', category: 'health', element: '목', korean: '활기생동', hanja: '活氣生動', description: '부족한 목(木) 기운을 채워, 몸과 마음에 새싹 같은 생기를 더하는 부적' },
  { id: 'health-목-2', category: 'health', element: '목', korean: '운동개시', hanja: '運動開始', description: '부족한 목(木) 기운을 채워, 미뤄 둔 운동을 오늘 시작할 추진력을 주는 부적' },
  { id: 'health-목-3', category: 'health', element: '목', korean: '유연신체', hanja: '柔軟身體', description: '부족한 목(木) 기운을 채워, 굳은 몸을 나뭇가지처럼 부드럽게 풀어 가길 응원하는 부적' },
  { id: 'health-화-1', category: 'health', element: '화', korean: '체력충전', hanja: '體力充電', description: '부족한 화(火) 기운을 채워, 지친 하루에 다시 힘을 불어넣는 부적' },
  { id: 'health-화-2', category: 'health', element: '화', korean: '체온유지', hanja: '體溫維持', description: '부족한 화(火) 기운을 채워, 몸을 따뜻하게 돌보는 생활 습관을 응원하는 부적' },
  { id: 'health-화-3', category: 'health', element: '화', korean: '활력점화', hanja: '活力點火', description: '부족한 화(火) 기운을 채워, 아침을 힘차게 여는 활력에 불을 붙이는 부적' },
  { id: 'health-토-1', category: 'health', element: '토', korean: '식습안정', hanja: '食習安定', description: '부족한 토(土) 기운을 채워, 규칙적이고 균형 잡힌 식사 습관을 다져 주는 부적' },
  { id: 'health-토-2', category: 'health', element: '토', korean: '생활중심', hanja: '生活中心', description: '부족한 토(土) 기운을 채워, 흐트러진 하루 리듬의 중심을 잡아 주는 부적' },
  { id: 'health-토-3', category: 'health', element: '토', korean: '기초체력', hanja: '基礎體力', description: '부족한 토(土) 기운을 채워, 오래가는 기초 체력을 땅처럼 다져 가길 응원하는 부적' },
  { id: 'health-금-1', category: 'health', element: '금', korean: '절제습관', hanja: '節制習慣', description: '부족한 금(金) 기운을 채워, 끊어야 할 습관을 단호하게 정리하도록 돕는 부적' },
  { id: 'health-금-2', category: 'health', element: '금', korean: '규칙생활', hanja: '規則生活', description: '부족한 금(金) 기운을 채워, 정해진 시간에 자고 일어나는 단단한 규칙을 세워 주는 부적' },
  { id: 'health-금-3', category: 'health', element: '금', korean: '청정호흡', hanja: '淸淨呼吸', description: '부족한 금(金) 기운을 채워, 맑고 깊은 숨으로 몸과 마음을 정돈하길 바라는 부적' },
  { id: 'health-수-1', category: 'health', element: '수', korean: '숙면안락', hanja: '熟眠安樂', description: '부족한 수(水) 기운을 채워, 깊고 편안한 잠을 응원하는 부적' },
  { id: 'health-수-2', category: 'health', element: '수', korean: '휴식순환', hanja: '休息循環', description: '부족한 수(水) 기운을 채워, 쉬어야 할 때 제대로 쉬며 기운을 회복하도록 돕는 부적' },
  { id: 'health-수-3', category: 'health', element: '수', korean: '수분충만', hanja: '水分充滿', description: '부족한 수(水) 기운을 채워, 물을 자주 마시며 몸의 흐름을 챙기는 습관을 응원하는 부적' },

  // 직장/커리어 성장
  { id: 'career-목-1', category: 'career', element: '목', korean: '승진도약', hanja: '昇進跳躍', description: '부족한 목(木) 기운을 채워, 한 단계 위로 뻗어 오르는 힘을 더하는 부적' },
  { id: 'career-목-2', category: 'career', element: '목', korean: '직무개척', hanja: '職務開拓', description: '부족한 목(木) 기운을 채워, 새로운 직무로 가지를 뻗어 나갈 용기를 주는 부적' },
  { id: 'career-목-3', category: 'career', element: '목', korean: '실력성장', hanja: '實力成長', description: '부족한 목(木) 기운을 채워, 매일의 노력이 나이테처럼 실력으로 쌓이도록 돕는 부적' },
  { id: 'career-화-1', category: 'career', element: '화', korean: '열정재생', hanja: '熱情再生', description: '부족한 화(火) 기운을 채워, 번아웃으로 꺼진 열정에 다시 불을 붙이는 부적' },
  { id: 'career-화-2', category: 'career', element: '화', korean: '성과조명', hanja: '成果照明', description: '부족한 화(火) 기운을 채워, 내가 한 일이 제대로 빛나고 인정받도록 돕는 부적' },
  { id: 'career-화-3', category: 'career', element: '화', korean: '발표자신', hanja: '發表自信', description: '부족한 화(火) 기운을 채워, 회의와 발표에서 내 생각을 자신 있게 펼치게 돕는 부적' },
  { id: 'career-토-1', category: 'career', element: '토', korean: '신뢰구축', hanja: '信賴構築', description: '부족한 토(土) 기운을 채워, 상사·동료에게 믿음을 주는 사람이 되도록 돕는 부적' },
  { id: 'career-토-2', category: 'career', element: '토', korean: '중심유지', hanja: '中心維持', description: '부족한 토(土) 기운을 채워, 바쁜 조직 속에서도 나의 페이스와 중심을 지키게 하는 부적' },
  { id: 'career-토-3', category: 'career', element: '토', korean: '협업화합', hanja: '協業和合', description: '부족한 토(土) 기운을 채워, 동료들과 둥글게 어우러져 함께 일하도록 돕는 부적' },
  { id: 'career-금-1', category: 'career', element: '금', korean: '업무결단', hanja: '業務決斷', description: '부족한 금(金) 기운을 채워, 우선순위를 정하고 과감하게 결정하도록 돕는 부적' },
  { id: 'career-금-2', category: 'career', element: '금', korean: '과로차단', hanja: '過勞遮斷', description: '부족한 금(金) 기운을 채워, 넘치는 일을 끊어 낼 줄 알게 해 소진을 막아 주는 부적' },
  { id: 'career-금-3', category: 'career', element: '금', korean: '전문연마', hanja: '專門硏磨', description: '부족한 금(金) 기운을 채워, 칼을 갈듯 나만의 전문성을 날카롭게 다듬게 하는 부적' },
  { id: 'career-수-1', category: 'career', element: '수', korean: '지혜처세', hanja: '智慧處世', description: '부족한 수(水) 기운을 채워, 복잡한 사내 관계를 지혜롭게 헤쳐 가게 하는 부적' },
  { id: 'career-수-2', category: 'career', element: '수', korean: '유연전환', hanja: '柔軟轉換', description: '부족한 수(水) 기운을 채워, 직무 전환과 변화에 물처럼 유연하게 적응하도록 돕는 부적' },
  { id: 'career-수-3', category: 'career', element: '수', korean: '충전재기', hanja: '充電再起', description: '부족한 수(水) 기운을 채워, 일과 쉼의 흐름을 되찾아 다시 일어설 힘을 채워 주는 부적' },

  // 마음/멘탈
  { id: 'mind-목-1', category: 'mind', element: '목', korean: '자존성장', hanja: '自尊成長', description: '부족한 목(木) 기운을 채워, 나를 믿는 마음이 곧게 자라도록 돕는 부적' },
  { id: 'mind-목-2', category: 'mind', element: '목', korean: '방향발견', hanja: '方向發見', description: '부족한 목(木) 기운을 채워, 삶의 방향을 향해 한 걸음 내딛는 용기를 주는 부적' },
  { id: 'mind-목-3', category: 'mind', element: '목', korean: '심기일전', hanja: '心機一轉', description: '부족한 목(木) 기운을 채워, 마음을 새롭게 먹고 다시 시작하게 돕는 부적' },
  { id: 'mind-화-1', category: 'mind', element: '화', korean: '자신광채', hanja: '自信光彩', description: '부족한 화(火) 기운을 채워, 움츠러든 나를 다시 밝게 비춰 주는 부적' },
  { id: 'mind-화-2', category: 'mind', element: '화', korean: '희망점등', hanja: '希望點燈', description: '부족한 화(火) 기운을 채워, 불안한 마음에 작은 희망의 불을 켜 주는 부적' },
  { id: 'mind-화-3', category: 'mind', element: '화', korean: '희열회복', hanja: '喜悅回復', description: '부족한 화(火) 기운을 채워, 잊고 있던 즐거움과 설렘을 되찾게 돕는 부적' },
  { id: 'mind-토-1', category: 'mind', element: '토', korean: '심신안정', hanja: '心身安定', description: '부족한 토(土) 기운을 채워, 흔들리는 마음을 땅처럼 단단히 붙잡아 주는 부적' },
  { id: 'mind-토-2', category: 'mind', element: '토', korean: '평정유지', hanja: '平靜維持', description: '부족한 토(土) 기운을 채워, 스트레스 속에서도 평온을 지키게 돕는 부적' },
  { id: 'mind-토-3', category: 'mind', element: '토', korean: '자기수용', hanja: '自己受容', description: '부족한 토(土) 기운을 채워, 있는 그대로의 나를 넉넉하게 품어 주는 부적' },
  { id: 'mind-금-1', category: 'mind', element: '금', korean: '잡념정리', hanja: '雜念整理', description: '부족한 금(金) 기운을 채워, 머릿속 걱정을 깔끔하게 정리하게 돕는 부적' },
  { id: 'mind-금-2', category: 'mind', element: '금', korean: '견고심지', hanja: '堅固心志', description: '부족한 금(金) 기운을 채워, 남의 말에 흔들리지 않는 단단한 심지를 세워 주는 부적' },
  { id: 'mind-금-3', category: 'mind', element: '금', korean: '결심실행', hanja: '決心實行', description: '부족한 금(金) 기운을 채워, 고민을 끝내고 결심한 것을 실행하게 돕는 부적' },
  { id: 'mind-수-1', category: 'mind', element: '수', korean: '심경정화', hanja: '心境淨化', description: '부족한 수(水) 기운을 채워, 쌓인 스트레스를 맑은 물처럼 흘려보내게 하는 부적' },
  { id: 'mind-수-2', category: 'mind', element: '수', korean: '번뇌유수', hanja: '煩惱流水', description: '부족한 수(水) 기운을 채워, 걱정이 물처럼 흘러가 오래 머물지 않길 바라는 부적' },
  { id: 'mind-수-3', category: 'mind', element: '수', korean: '지혜통찰', hanja: '智慧洞察', description: '부족한 수(水) 기운을 채워, 지금 나에게 정말 중요한 것을 깊이 들여다보게 돕는 부적' },

  // 연애/결혼
  { id: 'love-목-1', category: 'love', element: '목', korean: '인연발아', hanja: '因緣發芽', description: '부족한 목(木) 기운을 채워, 새로운 인연의 싹이 트도록 돕는 부적' },
  { id: 'love-목-2', category: 'love', element: '목', korean: '애정성장', hanja: '愛情成長', description: '부족한 목(木) 기운을 채워, 시작된 관계가 천천히 깊어지도록 응원하는 부적' },
  { id: 'love-목-3', category: 'love', element: '목', korean: '전화위복', hanja: '轉禍爲福', description: '부족한 목(木) 기운을 채워, 이별의 아픔이 더 좋은 만남으로 이어지도록 돕는 부적' },
  { id: 'love-화-1', category: 'love', element: '화', korean: '연애점화', hanja: '戀愛點火', description: '부족한 화(火) 기운을 채워, 설렘의 불씨를 지펴 주는 부적' },
  { id: 'love-화-2', category: 'love', element: '화', korean: '매력발산', hanja: '魅力發散', description: '부족한 화(火) 기운을 채워, 나만의 매력을 자연스럽게 드러내게 돕는 부적' },
  { id: 'love-화-3', category: 'love', element: '화', korean: '열애지속', hanja: '熱愛持續', description: '부족한 화(火) 기운을 채워, 연애의 따뜻함이 식지 않고 오래가길 바라는 부적' },
  { id: 'love-토-1', category: 'love', element: '토', korean: '백년가약', hanja: '百年佳約', description: '부족한 토(土) 기운을 채워, 결혼으로 이어지는 든든한 믿음을 다지는 부적' },
  { id: 'love-토-2', category: 'love', element: '토', korean: '신뢰연애', hanja: '信賴戀愛', description: '부족한 토(土) 기운을 채워, 서로 믿고 편안하게 기댈 수 있는 관계를 만드는 부적' },
  { id: 'love-토-3', category: 'love', element: '토', korean: '안락가정', hanja: '安樂家庭', description: '부족한 토(土) 기운을 채워, 둘이 함께할 안정된 보금자리를 응원하는 부적' },
  { id: 'love-금-1', category: 'love', element: '금', korean: '미련정리', hanja: '未練整理', description: '부족한 금(金) 기운을 채워, 끝난 인연을 깔끔하게 정리할 힘을 주는 부적' },
  { id: 'love-금-2', category: 'love', element: '금', korean: '안목선별', hanja: '眼目選別', description: '부족한 금(金) 기운을 채워, 나에게 맞는 사람을 알아보는 눈을 밝혀 주는 부적' },
  { id: 'love-금-3', category: 'love', element: '금', korean: '고백결단', hanja: '告白決斷', description: '부족한 금(金) 기운을 채워, 망설이던 마음을 용기 있게 전하도록 돕는 부적' },
  { id: 'love-수-1', category: 'love', element: '수', korean: '연분순류', hanja: '緣分順流', description: '부족한 수(水) 기운을 채워, 좋은 인연이 물 흐르듯 다가오게 돕는 부적' },
  { id: 'love-수-2', category: 'love', element: '수', korean: '심심상인', hanja: '心心相印', description: '부족한 수(水) 기운을 채워, 말하지 않아도 서로의 마음이 통하도록 돕는 부적' },
  { id: 'love-수-3', category: 'love', element: '수', korean: '이별치유', hanja: '離別治癒', description: '부족한 수(水) 기운을 채워, 이별의 아픔을 흘려보내고 마음을 회복하게 돕는 부적' },

  // 가족/육아
  { id: 'family-목-1', category: 'family', element: '목', korean: '자녀성장', hanja: '子女成長', description: '부족한 목(木) 기운을 채워, 아이가 곧고 밝게 자라길 바라는 부적' },
  { id: 'family-목-2', category: 'family', element: '목', korean: '화목번성', hanja: '和睦繁盛', description: '부족한 목(木) 기운을 채워, 가족의 웃음과 복이 가지처럼 번져 가길 바라는 부적' },
  { id: 'family-목-3', category: 'family', element: '목', korean: '생명축복', hanja: '生命祝福', description: '부족한 목(木) 기운을 채워, 새 가족을 맞이하는 기쁨을 축복하는 부적' },
  { id: 'family-화-1', category: 'family', element: '화', korean: '가정온기', hanja: '家庭溫氣', description: '부족한 화(火) 기운을 채워, 집 안에 따뜻한 온기가 돌게 하는 부적' },
  { id: 'family-화-2', category: 'family', element: '화', korean: '가족화락', hanja: '家族和樂', description: '부족한 화(火) 기운을 채워, 식탁에 웃음이 끊이지 않길 바라는 부적' },
  { id: 'family-화-3', category: 'family', element: '화', korean: '육아활력', hanja: '育兒活力', description: '부족한 화(火) 기운을 채워, 지치기 쉬운 육아에 다시 힘을 불어넣는 부적' },
  { id: 'family-토-1', category: 'family', element: '토', korean: '가화만사', hanja: '家和萬事', description: '부족한 토(土) 기운을 채워, 집안이 화목해 모든 일이 잘 풀리길 바라는 부적' },
  { id: 'family-토-2', category: 'family', element: '토', korean: '부부신뢰', hanja: '夫婦信賴', description: '부족한 토(土) 기운을 채워, 배우자와 서로 믿고 기대는 단단한 관계를 다지는 부적' },
  { id: 'family-토-3', category: 'family', element: '토', korean: '부모안심', hanja: '父母安心', description: '부족한 토(土) 기운을 채워, 부모님과의 관계가 편안하고 안정되길 바라는 부적' },
  { id: 'family-금-1', category: 'family', element: '금', korean: '갈등정리', hanja: '葛藤整理', description: '부족한 금(金) 기운을 채워, 가족 사이에 쌓인 갈등을 매듭짓게 돕는 부적' },
  { id: 'family-금-2', category: 'family', element: '금', korean: '역할분명', hanja: '役割分明', description: '부족한 금(金) 기운을 채워, 집안의 역할과 경계를 분명히 해 서로 지치지 않게 돕는 부적' },
  { id: 'family-금-3', category: 'family', element: '금', korean: '원칙육아', hanja: '原則育兒', description: '부족한 금(金) 기운을 채워, 흔들리지 않는 기준으로 아이를 키우게 돕는 부적' },
  { id: 'family-수-1', category: 'family', element: '수', korean: '가족소통', hanja: '家族疏通', description: '부족한 수(水) 기운을 채워, 가족 간 대화가 막힘없이 흐르게 하는 부적' },
  { id: 'family-수-2', category: 'family', element: '수', korean: '형제화목', hanja: '兄弟和睦', description: '부족한 수(水) 기운을 채워, 부모·형제 사이의 서운함을 흘려보내고 가까워지게 돕는 부적' },
  { id: 'family-수-3', category: 'family', element: '수', korean: '육아지혜', hanja: '育兒智慧', description: '부족한 수(水) 기운을 채워, 아이의 마음을 깊이 헤아리는 지혜를 더하는 부적' },
]

// §3.7 조회 — (카테고리, 부족오행) → 3개. R6 determineLackingElement()가 정한 오행을 그대로 넘기면 된다.
export function getTalismans(category: CategoryKey, element: TalismanElement): Talisman[] {
  return TALISMANS.filter((t) => t.category === category && t.element === element)
}
