-- 소복소복 DB 부트스트랩 (전체 스키마) — 생성: 2026-11-27
-- 원본: 운영 프로젝트의 마이그레이션 18개를 적용 순서대로 병합
-- 사용법: 새 Supabase 프로젝트 > SQL Editor에서 01 → 02 → 03 순서로 실행 (db/README.md)

-- ───────────────────────────────────────────
-- migration: stage1_users_and_saju_profiles (2026-11-13T15:09:42.567Z)
-- ───────────────────────────────────────────
-- 단계 1: 회원 동의 기록 + 사주 프로필 (PRD §10.1)

-- users: auth.users와 1:1, 약관·개인정보·마케팅 동의 기록
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  terms_agreed_at timestamptz not null default now(),
  privacy_agreed_at timestamptz not null default now(),
  marketing_consent boolean not null default false,
  marketing_consent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;
create policy "users_select_own" on public.users for select using (auth.uid() = id);
create policy "users_insert_own" on public.users for insert with check (auth.uid() = id);
create policy "users_update_own" on public.users for update using (auth.uid() = id) with check (auth.uid() = id);

-- saju_profiles: 계정당 최대 8명. 계산 결과는 저장하지 않고 입력값만 저장(매번 계산)
create table public.saju_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 20),
  gender text not null check (gender in ('남','여')),
  calendar_type text not null check (calendar_type in ('solar','lunar')),
  is_leap_month boolean not null default false,
  birth_year int not null check (birth_year between 1900 and 2100),
  birth_month int not null check (birth_month between 1 and 12),
  birth_day int not null check (birth_day between 1 and 31),
  birth_hour int check (birth_hour between 0 and 23),
  birth_minute int check (birth_minute between 0 and 59),
  time_unknown boolean not null default false,
  subject_consent boolean not null default false, -- 타인 사주 등록 시 "본인 동의를 받았어요"
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index saju_profiles_user_id_idx on public.saju_profiles (user_id);

alter table public.saju_profiles enable row level security;
create policy "saju_profiles_select_own" on public.saju_profiles for select using (auth.uid() = user_id);
create policy "saju_profiles_insert_own" on public.saju_profiles for insert with check (auth.uid() = user_id);
create policy "saju_profiles_update_own" on public.saju_profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "saju_profiles_delete_own" on public.saju_profiles for delete using (auth.uid() = user_id);

-- 계정당 최대 8명 (PRD §6.4) — DB에서 강제
create or replace function public.enforce_saju_profile_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.saju_profiles where user_id = new.user_id) >= 8 then
    raise exception 'PROFILE_LIMIT_REACHED';
  end if;
  return new;
end;
$$;

create trigger saju_profiles_limit
  before insert on public.saju_profiles
  for each row execute function public.enforce_saju_profile_limit();

-- ───────────────────────────────────────────
-- migration: stage2_orders_and_payment_logic (2026-11-15T09:28:36.795Z)
-- ───────────────────────────────────────────
-- 단계 2: 주문·결제 상태 (PRD §7.1, §10.1, §11.5, §17.1~17.3)
-- 금액·상태 판정은 전부 이 파일의 함수(서버)가 한다. 클라이언트는 금액을 보내지 않는다.

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null, -- 입금자명 대조용 4자리 (§11.5 입금자명 규칙)
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.saju_profiles(id) on delete cascade,
  product int not null check (product between 1 and 3),
  kind text not null default 'new' check (kind in ('new', 'repurchase', 'renewal')),
  parent_order_id uuid references public.orders(id),
  top_concern text not null,
  sub_concern text not null,
  concern_text text check (char_length(concern_text) <= 200), -- 고민 자유 입력 (§17.2, 결정 #22)
  amount int not null, -- 부가세 별도 금액. create_order가 계산
  cash_receipt_phone text,
  payment_status text not null default 'awaiting_deposit'
    check (payment_status in ('awaiting_deposit', 'paid', 'refund_requested', 'refund_reviewing', 'refunded', 'canceled')),
  deposit_due_at timestamptz not null, -- 입금 기한 3일 (결정 #6)
  deposit_reported_at timestamptz, -- [입금했어요] 누른 시각 (§11.5)
  paid_at timestamptz,
  talisman_issued_at timestamptz, -- 부적 발급일 (1년 갱신 대비, §17.4)
  reading_first_viewed_at timestamptz, -- 분석 최초 열람 (환불 판단, 결정 #4)
  saju_snapshot jsonb not null, -- 주문 시점의 사주 입력값 (§10.1)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_user_idx on public.orders (user_id);
create index orders_profile_sub_idx on public.orders (profile_id, sub_concern);
create index orders_status_idx on public.orders (payment_status);

alter table public.orders enable row level security;
create policy "orders_select_own" on public.orders for select using (auth.uid() = user_id);
-- insert/update 정책 없음: 쓰기는 아래 security definer 함수와 관리자(service role)만 가능

-- 상태 변경 이력 (PRD §7.5 "모든 상태 변경은 이력으로")
create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  prev_status text,
  next_status text,
  actor text not null, -- 'user' | 'system' | 'admin'
  memo text,
  created_at timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id);
alter table public.order_events enable row level security;
create policy "order_events_select_own" on public.order_events for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

-- 주문 생성 — 금액·재구매 판정·중복 방지를 서버에서 처리
create or replace function public.create_order(
  p_profile_id uuid,
  p_product int,
  p_top_concern text,
  p_sub_concern text,
  p_concern_text text default null,
  p_cash_receipt_phone text default null
) returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile saju_profiles%rowtype;
  v_existing orders%rowtype;
  v_kind text := 'new';
  v_amount int;
  v_code text;
  v_order orders%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_profile from saju_profiles where id = p_profile_id and user_id = v_uid;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;

  if p_product <> 1 then raise exception 'PRODUCT_NOT_AVAILABLE'; end if; -- 결제2·3은 단계 3에서 오픈

  -- 같은 고민의 입금 대기 주문이 있으면 새로 만들지 않고 그 주문으로 보낸다 (PRD §6.7)
  select * into v_existing from orders
    where profile_id = p_profile_id and sub_concern = p_sub_concern and payment_status = 'awaiting_deposit'
    limit 1;
  if found then return v_existing; end if;

  -- 결제 완료 이력이 있으면 재구매 (§17.1 재구매 가격)
  if exists (select 1 from orders
      where profile_id = p_profile_id and sub_concern = p_sub_concern
        and payment_status in ('paid', 'refund_requested', 'refund_reviewing')) then
    v_kind := 'repurchase';
  end if;

  v_amount := case p_product
    when 1 then case v_kind when 'new' then 10000 else 2000 end
    when 2 then case v_kind when 'new' then 30000 else 22000 end
    when 3 then case v_kind when 'new' then 50000 else 42000 end
  end;

  -- 입금자명 대조용 4자리 코드 — 입금 대기 중인 주문끼리만 안 겹치면 된다
  for i in 1..20 loop
    v_code := lpad((floor(random() * 10000))::int::text, 4, '0');
    exit when not exists (select 1 from orders where order_code = v_code and payment_status = 'awaiting_deposit');
  end loop;

  insert into orders (order_code, user_id, profile_id, product, kind, top_concern, sub_concern,
                      concern_text, amount, cash_receipt_phone, deposit_due_at, saju_snapshot)
  values (v_code, v_uid, p_profile_id, p_product, v_kind, p_top_concern, p_sub_concern,
          nullif(trim(p_concern_text), ''), v_amount, nullif(trim(p_cash_receipt_phone), ''),
          now() + interval '3 days', to_jsonb(v_profile))
  returning * into v_order;

  insert into order_events (order_id, prev_status, next_status, actor)
  values (v_order.id, null, 'awaiting_deposit', 'user');

  return v_order;
end;
$$;

-- [입금했어요] — 어드민에 입금 확인 요청으로 올라감 (§11.5)
create or replace function public.report_deposit(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  update orders set deposit_reported_at = now(), updated_at = now()
    where id = p_order_id and user_id = v_uid and payment_status = 'awaiting_deposit'
      and deposit_reported_at is null;
  if found then
    insert into order_events (order_id, prev_status, next_status, actor, memo)
    values (p_order_id, 'awaiting_deposit', 'awaiting_deposit', 'user', '입금 확인 요청');
  end if;
end;
$$;

-- 입금 기한 3일 경과 시 자동 취소 (결정 #6) — DB 안에서 매시간 실행
create extension if not exists pg_cron;
select cron.schedule('expire-unpaid-orders', '5 * * * *', $cron$
  with expired as (
    update public.orders set payment_status = 'canceled', updated_at = now()
    where payment_status = 'awaiting_deposit' and deposit_due_at < now()
    returning id
  )
  insert into public.order_events (order_id, prev_status, next_status, actor, memo)
  select id, 'awaiting_deposit', 'canceled', 'system', '입금 기한 경과 자동 취소' from expired
$cron$);

-- ───────────────────────────────────────────
-- migration: stage2_talisman_tables (2026-11-15T13:44:53.653Z)
-- ───────────────────────────────────────────
-- 단계 2: 부적 매트릭스 v2 + 추천·선택 (PRD §8.2, §10, §17.2)
-- 매트릭스는 유료 콘텐츠 — RLS 활성 + 정책 없음 = 클라이언트에서 직접 못 읽는다(§10).
-- 추천 3종은 주문당 1회 뽑아 talisman_picks에 저장하고, 클라이언트는 그 저장본만 본다.

create table public.talisman_idioms (
  id text primary key,
  hanja text not null,
  korean text not null,
  meaning text not null,
  description text not null
);
alter table public.talisman_idioms enable row level security;

create table public.talisman_matrix (
  sub_concern text not null,
  element text not null check (element in ('목','화','토','금','수')),
  slot int not null check (slot between 1 and 5),
  idiom_id text not null references public.talisman_idioms(id),
  primary key (sub_concern, element, slot)
);
alter table public.talisman_matrix enable row level security;

create table public.talisman_picks (
  order_id uuid primary key references public.orders(id) on delete cascade,
  element text not null,
  reason text,
  recommended jsonb not null, -- [{id,hanja,korean,meaning,description,personal}] 3개, 1번째가 퍼스널 추천
  chosen_id text,
  chosen_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.talisman_picks enable row level security;
create policy "picks_select_own" on public.talisman_picks for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

-- 추천 발급 — 결제 완료 주문만, 주문당 1회(멱등). 재구매면 같은 프로필·고민에서 이미 선택했던 성어 제외(§17.2)
create or replace function public.issue_talisman_picks(
  p_order_id uuid,
  p_element text,
  p_reason text default null
) returns public.talisman_picks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_order orders%rowtype;
  v_picks talisman_picks%rowtype;
  v_cards jsonb;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_order from orders where id = p_order_id and user_id = v_uid;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  select * into v_picks from talisman_picks where order_id = p_order_id;
  if found then return v_picks; end if; -- 멱등: 들어올 때마다 바뀌면 안 된다(§8.2)

  if v_order.payment_status <> 'paid' then raise exception 'NOT_PAID'; end if;
  if p_element not in ('목','화','토','금','수') then raise exception 'BAD_ELEMENT'; end if;

  with excluded as (
    select tp.chosen_id from talisman_picks tp
    join orders o on o.id = tp.order_id
    where o.profile_id = v_order.profile_id and o.sub_concern = v_order.sub_concern
      and tp.chosen_id is not null
  ),
  cand as (
    select m.slot, i.id, i.hanja, i.korean, i.meaning, i.description,
      exists (select 1 from excluded e where e.chosen_id = i.id) as was_chosen
    from talisman_matrix m join talisman_idioms i on i.id = m.idiom_id
    where m.sub_concern = v_order.sub_concern and m.element = p_element
  ),
  ordered as (
    select *, row_number() over (order by was_chosen, slot) as rn from cand
  ),
  pick_rest as (
    select * from ordered where rn > 1
    order by was_chosen, md5(p_order_id::text || id) limit 2
  ),
  chosen3 as (
    select slot, id, hanja, korean, meaning, description, true as personal, 0 as ord from ordered where rn = 1
    union all
    select slot, id, hanja, korean, meaning, description, false, 1 from pick_rest
  )
  select jsonb_agg(
    jsonb_build_object('id', id, 'hanja', hanja, 'korean', korean,
                       'meaning', meaning, 'description', description, 'personal', personal)
    order by ord, slot)
  into v_cards from chosen3;

  if v_cards is null or jsonb_array_length(v_cards) < 3 then raise exception 'NO_MATRIX'; end if;

  insert into talisman_picks (order_id, element, reason, recommended)
  values (p_order_id, p_element, p_reason, v_cards)
  returning * into v_picks;

  insert into order_events (order_id, prev_status, next_status, actor, memo)
  values (p_order_id, 'paid', 'paid', 'system', '부적 추천 발급 (' || p_element || ')');

  return v_picks;
end;
$$;

-- 부적 1종 선택 — 추천 3종 중에서만, 1회 잠금(§4 잠금 규칙). 발급일 기록(1년 갱신 대비)
create or replace function public.select_talisman(p_order_id uuid, p_talisman_id text)
returns public.talisman_picks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_picks talisman_picks%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select tp.* into v_picks from talisman_picks tp
  join orders o on o.id = tp.order_id
  where tp.order_id = p_order_id and o.user_id = v_uid;
  if not found then raise exception 'PICKS_NOT_FOUND'; end if;
  if v_picks.chosen_id is not null then raise exception 'ALREADY_SELECTED'; end if;
  if not exists (
    select 1 from jsonb_array_elements(v_picks.recommended) c where c->>'id' = p_talisman_id
  ) then raise exception 'NOT_RECOMMENDED'; end if;

  update talisman_picks set chosen_id = p_talisman_id, chosen_at = now()
    where order_id = p_order_id
    returning * into v_picks;
  update orders set talisman_issued_at = now(), updated_at = now() where id = p_order_id;

  insert into order_events (order_id, prev_status, next_status, actor, memo)
  values (p_order_id, 'paid', 'paid', 'user', '부적 선택: ' || p_talisman_id);

  return v_picks;
end;
$$;

-- ───────────────────────────────────────────
-- migration: stage2_admin_deposit_management (2026-11-15T16:27:37.241Z)
-- ───────────────────────────────────────────
-- 단계 2: 어드민 — 입금 확인·주문 관리 (PRD §10.2 결제 관리, §11.5)
-- 관리자 판별은 이메일 허용 목록: 어떤 로그인 수단이든 이 이메일로 로그인하면 관리자.
-- (나중에 구글 OAuth가 열리면 지민 계정이 자동으로 관리자가 된다)

create table public.admin_emails (email text primary key);
alter table public.admin_emails enable row level security; -- 정책 없음: 서버 전용
insert into public.admin_emails (email) values ('yminji117@gmail.com');

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from admin_emails where email = coalesce(auth.jwt()->>'email', ''))
$$;

-- 관리자는 모든 주문·이력·부적 기록·사주를 조회할 수 있다 (§10.2)
create policy "orders_select_admin" on public.orders for select using (public.is_admin());
create policy "order_events_select_admin" on public.order_events for select using (public.is_admin());
create policy "picks_select_admin" on public.talisman_picks for select using (public.is_admin());
create policy "saju_profiles_select_admin" on public.saju_profiles for select using (public.is_admin());

-- 입금 확인: 입금 대기 → 결제 완료 (PRD §7.5)
create or replace function public.admin_confirm_deposit(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders%rowtype;
begin
  if not public.is_admin() then raise exception 'ADMIN_ONLY'; end if;
  update orders set payment_status = 'paid', paid_at = now(), updated_at = now()
    where id = p_order_id and payment_status = 'awaiting_deposit'
    returning * into v_order;
  if not found then raise exception 'NOT_AWAITING'; end if;
  insert into order_events (order_id, prev_status, next_status, actor, memo)
  values (p_order_id, 'awaiting_deposit', 'paid', 'admin', '입금 확인');
  return v_order;
end;
$$;

-- 주문 취소: 입금 전 주문을 관리자가 취소 (미입금·고객 요청 등)
create or replace function public.admin_cancel_order(p_order_id uuid, p_memo text default null)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders%rowtype;
begin
  if not public.is_admin() then raise exception 'ADMIN_ONLY'; end if;
  update orders set payment_status = 'canceled', updated_at = now()
    where id = p_order_id and payment_status = 'awaiting_deposit'
    returning * into v_order;
  if not found then raise exception 'NOT_AWAITING'; end if;
  insert into order_events (order_id, prev_status, next_status, actor, memo)
  values (p_order_id, 'awaiting_deposit', 'canceled', 'admin', coalesce(p_memo, '관리자 취소'));
  return v_order;
end;
$$;

-- ───────────────────────────────────────────
-- migration: stage2_refund_and_withdrawal (2026-11-16T09:03:49.600Z)
-- ───────────────────────────────────────────
-- 단계 2: 환불(§7.1·§11.5)과 회원 탈퇴 신청(§10.3·§17.5)
-- 환불은 계좌이체 운영이라 사용자에게 환불 계좌를 받아 지민이 직접 이체 후 완료 처리한다.

alter table public.users add column withdrawal_requested_at timestamptz;
alter table public.orders
  add column refund_reason text,
  add column refund_account jsonb, -- {bank, account, holder}
  add column refunded_at timestamptz;

-- 환불 신청 (사용자) — 결제 완료 상태 + 분석 열람 전만 가능(결정 #4)
create or replace function public.request_refund(
  p_order_id uuid, p_reason text, p_bank text, p_account text, p_holder text
) returns public.orders
language plpgsql security definer set search_path = public as $$
declare v_order orders%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_order from orders where id = p_order_id and user_id = auth.uid();
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.payment_status <> 'paid' then raise exception 'NOT_PAID'; end if;
  if v_order.reading_first_viewed_at is not null then raise exception 'ALREADY_VIEWED'; end if;
  if coalesce(trim(p_bank), '') = '' or coalesce(trim(p_account), '') = '' or coalesce(trim(p_holder), '') = '' then
    raise exception 'ACCOUNT_REQUIRED';
  end if;
  update orders set payment_status = 'refund_requested',
      refund_reason = nullif(trim(p_reason), ''),
      refund_account = jsonb_build_object('bank', trim(p_bank), 'account', trim(p_account), 'holder', trim(p_holder)),
      updated_at = now()
    where id = p_order_id returning * into v_order;
  insert into order_events (order_id, prev_status, next_status, actor, memo)
  values (p_order_id, 'paid', 'refund_requested', 'user', v_order.refund_reason);
  return v_order;
end; $$;

-- 환불 검토 시작 (관리자가 요청을 열면 자동 — §7 '손이 한 번 덜 가게')
create or replace function public.admin_review_refund(p_order_id uuid)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare v_order orders%rowtype;
begin
  if not public.is_admin() then raise exception 'ADMIN_ONLY'; end if;
  update orders set payment_status = 'refund_reviewing', updated_at = now()
    where id = p_order_id and payment_status = 'refund_requested' returning * into v_order;
  if not found then raise exception 'NOT_REQUESTED'; end if;
  insert into order_events (order_id, prev_status, next_status, actor)
  values (p_order_id, 'refund_requested', 'refund_reviewing', 'admin');
  return v_order;
end; $$;

-- 환불 완료 (관리자 — 이체를 마친 뒤 누른다). 완료되면 유료 콘텐츠는 다시 잠긴다(§7.1)
create or replace function public.admin_complete_refund(p_order_id uuid)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare v_order orders%rowtype;
begin
  if not public.is_admin() then raise exception 'ADMIN_ONLY'; end if;
  update orders set payment_status = 'refunded', refunded_at = now(), updated_at = now()
    where id = p_order_id and payment_status in ('refund_requested', 'refund_reviewing')
    returning * into v_order;
  if not found then raise exception 'NOT_IN_REFUND'; end if;
  insert into order_events (order_id, prev_status, next_status, actor, memo)
  values (p_order_id, 'refund_reviewing', 'refunded', 'admin', '환불 이체 완료');
  return v_order;
end; $$;

-- 환불 반려 (관리자, 사유 필수) → 결제 완료로 복귀
create or replace function public.admin_reject_refund(p_order_id uuid, p_memo text)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare v_order orders%rowtype;
begin
  if not public.is_admin() then raise exception 'ADMIN_ONLY'; end if;
  if coalesce(trim(p_memo), '') = '' then raise exception 'MEMO_REQUIRED'; end if;
  update orders set payment_status = 'paid', updated_at = now()
    where id = p_order_id and payment_status in ('refund_requested', 'refund_reviewing')
    returning * into v_order;
  if not found then raise exception 'NOT_IN_REFUND'; end if;
  insert into order_events (order_id, prev_status, next_status, actor, memo)
  values (p_order_id, 'refund_reviewing', 'paid', 'admin', '환불 반려: ' || trim(p_memo));
  return v_order;
end; $$;

-- 회원 탈퇴 신청 — 진행 중 주문(입금 대기·환불 처리 중)이 있으면 막는다(§6.6).
-- 7일 재가입 불가(§17.5)는 로그인 분기에서 withdrawal_requested_at으로 판정.
-- 실제 데이터 삭제·거래 기록 분리 보관(§10.3)은 법정 보관 요건 확인 후 별도 구현.
create or replace function public.request_withdrawal()
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if exists (select 1 from orders where user_id = auth.uid()
      and payment_status in ('awaiting_deposit', 'refund_requested', 'refund_reviewing')) then
    raise exception 'ACTIVE_ORDERS';
  end if;
  update users set withdrawal_requested_at = now() where id = auth.uid();
end; $$;

-- ───────────────────────────────────────────
-- migration: stage2_readings (2026-11-16T12:47:03.194Z)
-- ───────────────────────────────────────────
-- 단계 2: 고민별 분석 5페이지 저장 (PRD §8, §10.1 readings)
-- 지금은 임시 생성기(generator='mock')가 클라이언트에서 만든 페이지를 1회 저장한다.
-- AI 키가 생기면 서버 생성으로 교체하되 테이블·열람 규칙은 그대로 쓴다.

create table public.readings (
  order_id uuid primary key references public.orders(id) on delete cascade,
  pages jsonb not null, -- [{title, body}] 5개
  generator text not null default 'mock',
  created_at timestamptz not null default now()
);
alter table public.readings enable row level security;
create policy "readings_select_own" on public.readings for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "readings_select_admin" on public.readings for select using (public.is_admin());

-- 분석 저장 — 결제 완료 주문만, 1회(멱등). 다시 열 때는 저장본(§8 "1회 생성 후 저장")
create or replace function public.save_reading(p_order_id uuid, p_pages jsonb, p_generator text default 'mock')
returns public.readings
language plpgsql security definer set search_path = public as $$
declare
  v_order orders%rowtype;
  v_reading readings%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_order from orders where id = p_order_id and user_id = auth.uid();
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  select * into v_reading from readings where order_id = p_order_id;
  if found then return v_reading; end if;
  if v_order.payment_status <> 'paid' then raise exception 'NOT_PAID'; end if;
  if jsonb_array_length(p_pages) <> 5 then raise exception 'BAD_PAGES'; end if;
  insert into readings (order_id, pages, generator) values (p_order_id, p_pages, p_generator)
    returning * into v_reading;
  return v_reading;
end; $$;

-- 최초 열람 기록 — 환불 가능 여부 판단 기준 (결정 #4)
create or replace function public.mark_reading_viewed(p_order_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  update orders set reading_first_viewed_at = now(), updated_at = now()
    where id = p_order_id and user_id = auth.uid() and reading_first_viewed_at is null;
end; $$;

-- ───────────────────────────────────────────
-- migration: stage2_inquiries (2026-11-16T12:54:40.173Z)
-- ───────────────────────────────────────────
-- 단계 2: 문의하기 (PRD §6.6, §10.2 문의 메뉴)
-- 사진 첨부는 보류(스토리지 구성 필요 — 임의 처리 시트 #14). 답변 알림은 이메일 알림(2-15)과 함께.

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  type text not null check (type in ('결제', '배송', '사주·분석', '기타')), -- 교환·반품/환불은 신청 화면으로 유도(§6.6)
  body text not null check (char_length(body) between 5 and 1000),
  status text not null default 'received' check (status in ('received', 'answered')),
  answer text,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);
create index inquiries_user_idx on public.inquiries (user_id);
create index inquiries_status_idx on public.inquiries (status);

alter table public.inquiries enable row level security;
create policy "inquiries_select_own" on public.inquiries for select using (auth.uid() = user_id);
create policy "inquiries_insert_own" on public.inquiries for insert
  with check (auth.uid() = user_id and status = 'received' and answer is null);
create policy "inquiries_select_admin" on public.inquiries for select using (public.is_admin());

-- 답변 저장 (관리자) — 접수 → 답변 완료
create or replace function public.admin_answer_inquiry(p_inquiry_id uuid, p_answer text)
returns public.inquiries
language plpgsql security definer set search_path = public as $$
declare v_row inquiries%rowtype;
begin
  if not public.is_admin() then raise exception 'ADMIN_ONLY'; end if;
  if coalesce(trim(p_answer), '') = '' then raise exception 'ANSWER_REQUIRED'; end if;
  update inquiries set answer = trim(p_answer), status = 'answered', answered_at = now()
    where id = p_inquiry_id returning * into v_row;
  if not found then raise exception 'NOT_FOUND'; end if;
  return v_row;
end; $$;

-- ───────────────────────────────────────────
-- migration: stage2_admin_order_memo (2026-11-16T13:22:21.433Z)
-- ───────────────────────────────────────────
-- 어드민 주문 상세 메모 (PRD §10.2 사주 확인 관리 — 메모)
alter table public.orders add column admin_memo text;

create or replace function public.admin_set_memo(p_order_id uuid, p_memo text)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare v_order orders%rowtype;
begin
  if not public.is_admin() then raise exception 'ADMIN_ONLY'; end if;
  update orders set admin_memo = nullif(trim(p_memo), ''), updated_at = now()
    where id = p_order_id returning * into v_order;
  if not found then raise exception 'NOT_FOUND'; end if;
  return v_order;
end; $$;

-- ───────────────────────────────────────────
-- migration: stage2_email_outbox (2026-11-16T14:58:59.157Z)
-- ───────────────────────────────────────────
-- 단계 2: 이메일 알림 (2-15, 결정 #8 — 1차 채널은 이메일)
-- 수신자 이메일을 주문·문의에 함께 저장해 두면(가입 시점 JWT에서) 발송 시 service role 없이 찾을 수 있다.

alter table public.orders add column user_email text;
alter table public.inquiries add column user_email text;

-- 주문 생성 시 이메일 기록 — create_order 안에서 (기존 함수 교체: insert 컬럼 추가)
create or replace function public.create_order(
  p_profile_id uuid,
  p_product int,
  p_top_concern text,
  p_sub_concern text,
  p_concern_text text default null,
  p_cash_receipt_phone text default null
) returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile saju_profiles%rowtype;
  v_existing orders%rowtype;
  v_kind text := 'new';
  v_amount int;
  v_code text;
  v_order orders%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_profile from saju_profiles where id = p_profile_id and user_id = v_uid;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;

  if p_product <> 1 then raise exception 'PRODUCT_NOT_AVAILABLE'; end if;

  select * into v_existing from orders
    where profile_id = p_profile_id and sub_concern = p_sub_concern and payment_status = 'awaiting_deposit'
    limit 1;
  if found then return v_existing; end if;

  if exists (select 1 from orders
      where profile_id = p_profile_id and sub_concern = p_sub_concern
        and payment_status in ('paid', 'refund_requested', 'refund_reviewing')) then
    v_kind := 'repurchase';
  end if;

  v_amount := case p_product
    when 1 then case v_kind when 'new' then 10000 else 2000 end
    when 2 then case v_kind when 'new' then 30000 else 22000 end
    when 3 then case v_kind when 'new' then 50000 else 42000 end
  end;

  for i in 1..20 loop
    v_code := lpad((floor(random() * 10000))::int::text, 4, '0');
    exit when not exists (select 1 from orders where order_code = v_code and payment_status = 'awaiting_deposit');
  end loop;

  insert into orders (order_code, user_id, profile_id, product, kind, top_concern, sub_concern,
                      concern_text, amount, cash_receipt_phone, deposit_due_at, saju_snapshot, user_email)
  values (v_code, v_uid, p_profile_id, p_product, v_kind, p_top_concern, p_sub_concern,
          nullif(trim(p_concern_text), ''), v_amount, nullif(trim(p_cash_receipt_phone), ''),
          now() + interval '3 days', to_jsonb(v_profile), auth.jwt()->>'email')
  returning * into v_order;

  insert into order_events (order_id, prev_status, next_status, actor)
  values (v_order.id, null, 'awaiting_deposit', 'user');

  return v_order;
end;
$$;

-- 문의 생성 시 이메일 기록 — 클라이언트 직접 insert라 트리거로
create or replace function public.set_inquiry_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.user_email := coalesce(new.user_email, auth.jwt()->>'email');
  return new;
end; $$;
create trigger inquiries_set_email before insert on public.inquiries
  for each row execute function public.set_inquiry_email();

-- 발송 기록함 — 키가 없으면 'skipped'로 쌓이고, 키가 생기면 'sent'/'failed'가 기록된다
create table public.email_outbox (
  id bigint generated always as identity primary key,
  template text not null, -- 'paid' | 'refunded' | 'inquiry_answered'
  ref_id uuid not null,
  to_email text not null,
  subject text not null,
  status text not null check (status in ('sent', 'failed', 'skipped')),
  error text,
  created_at timestamptz not null default now()
);
alter table public.email_outbox enable row level security;
create policy "outbox_admin_select" on public.email_outbox for select using (public.is_admin());
create policy "outbox_admin_insert" on public.email_outbox for insert with check (public.is_admin());

-- ───────────────────────────────────────────
-- migration: stage3_shipping (2026-11-16T15:34:26.907Z)
-- ───────────────────────────────────────────
-- 단계 3: 실물 배송 (PRD §6.5 배송지, §7.2 배송 상태, §10.1 shipments, §17.2 배송 부적 지정)
-- 결제2·3을 연다. 배송 부적은 지민이 사주를 보고 지정해 그린다(§17.2).

alter table public.orders
  add column shipping_status text check (shipping_status in
    ('awaiting', 'shipping', 'delivered',
     'exchange_requested', 'exchange_shipping', 'exchange_done',
     'return_requested', 'return_shipping', 'return_done')),
  add column shipping_talismans jsonb; -- [{hanja, korean}] — 지민 지정, 제작 목록에 사용

create table public.shipments (
  order_id uuid primary key references public.orders(id) on delete cascade,
  receiver text not null,
  phone text not null,
  postcode text not null,
  address text not null,
  address_detail text,
  memo text,
  carrier text,
  tracking_no text,
  shipped_at timestamptz,
  delivered_at timestamptz, -- 배송 부적 1년 갱신 기준(§17.4)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.shipments enable row level security;
create policy "shipments_select_own" on public.shipments for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "shipments_select_admin" on public.shipments for select using (public.is_admin());

-- 결제2·3 오픈 — create_order 교체: 상품 1~3 허용, 실물이면 배송 상태 시작
create or replace function public.create_order(
  p_profile_id uuid, p_product int, p_top_concern text, p_sub_concern text,
  p_concern_text text default null, p_cash_receipt_phone text default null
) returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_profile saju_profiles%rowtype;
  v_existing orders%rowtype;
  v_kind text := 'new';
  v_amount int;
  v_code text;
  v_order orders%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_profile from saju_profiles where id = p_profile_id and user_id = v_uid;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
  if p_product not between 1 and 3 then raise exception 'PRODUCT_NOT_AVAILABLE'; end if;

  select * into v_existing from orders
    where profile_id = p_profile_id and sub_concern = p_sub_concern and payment_status = 'awaiting_deposit'
    limit 1;
  if found then return v_existing; end if;

  if exists (select 1 from orders
      where profile_id = p_profile_id and sub_concern = p_sub_concern
        and payment_status in ('paid', 'refund_requested', 'refund_reviewing')) then
    v_kind := 'repurchase';
  end if;

  v_amount := case p_product
    when 1 then case v_kind when 'new' then 10000 else 2000 end
    when 2 then case v_kind when 'new' then 30000 else 22000 end
    when 3 then case v_kind when 'new' then 50000 else 42000 end
  end;

  for i in 1..20 loop
    v_code := lpad((floor(random() * 10000))::int::text, 4, '0');
    exit when not exists (select 1 from orders where order_code = v_code and payment_status = 'awaiting_deposit');
  end loop;

  insert into orders (order_code, user_id, profile_id, product, kind, top_concern, sub_concern,
                      concern_text, amount, cash_receipt_phone, deposit_due_at, saju_snapshot, user_email,
                      shipping_status)
  values (v_code, v_uid, p_profile_id, p_product, v_kind, p_top_concern, p_sub_concern,
          nullif(trim(p_concern_text), ''), v_amount, nullif(trim(p_cash_receipt_phone), ''),
          now() + interval '3 days', to_jsonb(v_profile), auth.jwt()->>'email',
          case when p_product > 1 then 'awaiting' else null end)
  returning * into v_order;

  insert into order_events (order_id, prev_status, next_status, actor)
  values (v_order.id, null, 'awaiting_deposit', 'user');
  return v_order;
end; $$;

-- 배송지 입력·수정 — 결제 완료 + 발송 전까지만 (§6.5)
create or replace function public.upsert_shipping_address(
  p_order_id uuid, p_receiver text, p_phone text, p_postcode text,
  p_address text, p_address_detail text default null, p_memo text default null
) returns public.shipments
language plpgsql security definer set search_path = public as $$
declare
  v_order orders%rowtype;
  v_row shipments%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_order from orders where id = p_order_id and user_id = auth.uid();
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.product = 1 then raise exception 'NOT_PHYSICAL'; end if;
  if v_order.payment_status <> 'paid' then raise exception 'NOT_PAID'; end if;
  if v_order.shipping_status <> 'awaiting' then raise exception 'ALREADY_SHIPPED'; end if;
  if coalesce(trim(p_receiver), '') = '' or coalesce(trim(p_phone), '') = ''
     or coalesce(trim(p_postcode), '') = '' or coalesce(trim(p_address), '') = '' then
    raise exception 'FIELDS_REQUIRED';
  end if;

  insert into shipments (order_id, receiver, phone, postcode, address, address_detail, memo)
  values (p_order_id, trim(p_receiver), trim(p_phone), trim(p_postcode), trim(p_address),
          nullif(trim(p_address_detail), ''), nullif(trim(p_memo), ''))
  on conflict (order_id) do update
    set receiver = excluded.receiver, phone = excluded.phone, postcode = excluded.postcode,
        address = excluded.address, address_detail = excluded.address_detail, memo = excluded.memo,
        updated_at = now()
  returning * into v_row;
  return v_row;
end; $$;

-- 배송 부적 지정 (관리자, §17.2) — 장수는 상품에 맞게
create or replace function public.admin_set_shipping_talismans(p_order_id uuid, p_items jsonb)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare v_order orders%rowtype;
begin
  if not public.is_admin() then raise exception 'ADMIN_ONLY'; end if;
  select * into v_order from orders where id = p_order_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_order.product = 1 then raise exception 'NOT_PHYSICAL'; end if;
  if jsonb_array_length(p_items) <> (case v_order.product when 2 then 1 else 3 end) then
    raise exception 'BAD_COUNT';
  end if;
  update orders set shipping_talismans = p_items, updated_at = now()
    where id = p_order_id returning * into v_order;
  return v_order;
end; $$;

-- 발송 처리 (관리자) — 배송지·송장 필수, 배송 대기 → 배송중 (§7.5)
create or replace function public.admin_ship(p_order_id uuid, p_carrier text, p_tracking text)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare v_order orders%rowtype;
begin
  if not public.is_admin() then raise exception 'ADMIN_ONLY'; end if;
  select * into v_order from orders where id = p_order_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_order.payment_status <> 'paid' or v_order.shipping_status <> 'awaiting' then raise exception 'BAD_STATE'; end if;
  if not exists (select 1 from shipments where order_id = p_order_id) then raise exception 'NO_ADDRESS'; end if;
  if coalesce(trim(p_carrier), '') = '' or coalesce(trim(p_tracking), '') = '' then raise exception 'TRACKING_REQUIRED'; end if;

  update shipments set carrier = trim(p_carrier), tracking_no = trim(p_tracking), shipped_at = now(), updated_at = now()
    where order_id = p_order_id;
  update orders set shipping_status = 'shipping', updated_at = now() where id = p_order_id returning * into v_order;
  insert into order_events (order_id, prev_status, next_status, actor, memo)
  values (p_order_id, 'awaiting', 'shipping', 'admin', trim(p_carrier) || ' ' || trim(p_tracking));
  return v_order;
end; $$;

-- 배송 완료 처리 (관리자 수동 — 1차 출시 §12.2 1단계)
create or replace function public.admin_deliver(p_order_id uuid)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare v_order orders%rowtype;
begin
  if not public.is_admin() then raise exception 'ADMIN_ONLY'; end if;
  update orders set shipping_status = 'delivered', updated_at = now()
    where id = p_order_id and shipping_status = 'shipping' returning * into v_order;
  if not found then raise exception 'BAD_STATE'; end if;
  update shipments set delivered_at = now(), updated_at = now() where order_id = p_order_id;
  insert into order_events (order_id, prev_status, next_status, actor)
  values (p_order_id, 'shipping', 'delivered', 'admin');
  return v_order;
end; $$;

-- ───────────────────────────────────────────
-- migration: stage3_exchange_return (2026-11-16T16:01:55.088Z)
-- ───────────────────────────────────────────
-- 단계 3: 교환·반품 (PRD §7.2·§7.3·§7.4, §17.3)
-- 기한: 배송 완료 후 7일(전자상거래법 청약철회 기준을 따름 — 결정 메모).
-- 하자품 회수는 하지 않고 사유(사진은 보류)로 확인(§7 '사진 확인으로 대신' 권장).

alter table public.orders
  add column claim_reason text,       -- 교환·반품 사유
  add column refund_amount int;       -- 반품 시 환불 예정액(서버 계산): 분석 열람 시 차액(§17.3)

-- 교환 신청 (사용자) — 배송 완료 후 7일 내
create or replace function public.request_exchange(p_order_id uuid, p_reason text)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_order orders%rowtype;
  v_delivered timestamptz;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_order from orders where id = p_order_id and user_id = auth.uid();
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.shipping_status <> 'delivered' then raise exception 'NOT_DELIVERED'; end if;
  select delivered_at into v_delivered from shipments where order_id = p_order_id;
  if v_delivered is null or v_delivered < now() - interval '7 days' then raise exception 'PERIOD_OVER'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'REASON_REQUIRED'; end if;

  update orders set shipping_status = 'exchange_requested', claim_reason = trim(p_reason), updated_at = now()
    where id = p_order_id returning * into v_order;
  insert into order_events (order_id, prev_status, next_status, actor, memo)
  values (p_order_id, 'delivered', 'exchange_requested', 'user', trim(p_reason));
  return v_order;
end; $$;

-- 반품 신청 (사용자) — 결제 상태도 환불 신청으로 (§7.3). 환불 예정액: 분석 열람 시 결제1분 차감(§17.3)
create or replace function public.request_return(
  p_order_id uuid, p_reason text, p_bank text, p_account text, p_holder text
) returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_order orders%rowtype;
  v_delivered timestamptz;
  v_digital_part int;
  v_refund int;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_order from orders where id = p_order_id and user_id = auth.uid();
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.shipping_status <> 'delivered' then raise exception 'NOT_DELIVERED'; end if;
  if v_order.payment_status <> 'paid' then raise exception 'NOT_PAID'; end if;
  select delivered_at into v_delivered from shipments where order_id = p_order_id;
  if v_delivered is null or v_delivered < now() - interval '7 days' then raise exception 'PERIOD_OVER'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'REASON_REQUIRED'; end if;
  if coalesce(trim(p_bank), '') = '' or coalesce(trim(p_account), '') = '' or coalesce(trim(p_holder), '') = '' then
    raise exception 'ACCOUNT_REQUIRED';
  end if;

  v_digital_part := case v_order.kind when 'new' then 10000 else 2000 end;
  v_refund := case when v_order.reading_first_viewed_at is not null
                   then v_order.amount - v_digital_part else v_order.amount end;

  update orders set
      shipping_status = 'return_requested',
      payment_status = 'refund_requested',
      claim_reason = trim(p_reason),
      refund_reason = trim(p_reason),
      refund_amount = v_refund,
      refund_account = jsonb_build_object('bank', trim(p_bank), 'account', trim(p_account), 'holder', trim(p_holder)),
      updated_at = now()
    where id = p_order_id returning * into v_order;
  insert into order_events (order_id, prev_status, next_status, actor, memo)
  values (p_order_id, 'delivered', 'return_requested', 'user', trim(p_reason));
  return v_order;
end; $$;

-- 교환 발송 (관리자) — 다시 그려 보냄, 같은 배송 행에 새 송장(§7.2 교환 배송중)
create or replace function public.admin_exchange_ship(p_order_id uuid, p_carrier text, p_tracking text)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare v_order orders%rowtype;
begin
  if not public.is_admin() then raise exception 'ADMIN_ONLY'; end if;
  if coalesce(trim(p_carrier), '') = '' or coalesce(trim(p_tracking), '') = '' then raise exception 'TRACKING_REQUIRED'; end if;
  update orders set shipping_status = 'exchange_shipping', updated_at = now()
    where id = p_order_id and shipping_status = 'exchange_requested' returning * into v_order;
  if not found then raise exception 'BAD_STATE'; end if;
  update shipments set carrier = trim(p_carrier), tracking_no = trim(p_tracking),
      shipped_at = now(), delivered_at = null, updated_at = now()
    where order_id = p_order_id;
  insert into order_events (order_id, prev_status, next_status, actor, memo)
  values (p_order_id, 'exchange_requested', 'exchange_shipping', 'admin', trim(p_carrier) || ' ' || trim(p_tracking));
  return v_order;
end; $$;

-- 교환 완료 (관리자)
create or replace function public.admin_exchange_done(p_order_id uuid)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare v_order orders%rowtype;
begin
  if not public.is_admin() then raise exception 'ADMIN_ONLY'; end if;
  update orders set shipping_status = 'exchange_done', updated_at = now()
    where id = p_order_id and shipping_status = 'exchange_shipping' returning * into v_order;
  if not found then raise exception 'BAD_STATE'; end if;
  update shipments set delivered_at = now(), updated_at = now() where order_id = p_order_id;
  insert into order_events (order_id, prev_status, next_status, actor)
  values (p_order_id, 'exchange_shipping', 'exchange_done', 'admin');
  return v_order;
end; $$;

-- 반품 배송중 표시 (관리자 — 사용자 발송 확인 시)
create or replace function public.admin_return_in_transit(p_order_id uuid)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare v_order orders%rowtype;
begin
  if not public.is_admin() then raise exception 'ADMIN_ONLY'; end if;
  update orders set shipping_status = 'return_shipping', payment_status = 'refund_reviewing', updated_at = now()
    where id = p_order_id and shipping_status = 'return_requested' returning * into v_order;
  if not found then raise exception 'BAD_STATE'; end if;
  insert into order_events (order_id, prev_status, next_status, actor)
  values (p_order_id, 'return_requested', 'return_shipping', 'admin');
  return v_order;
end; $$;

-- 회수 확인 + 환불 완료 (관리자) — §7.3: 반품 완료와 환불 완료가 함께
create or replace function public.admin_return_complete(p_order_id uuid)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare v_order orders%rowtype;
begin
  if not public.is_admin() then raise exception 'ADMIN_ONLY'; end if;
  update orders set shipping_status = 'return_done', payment_status = 'refunded',
      refunded_at = now(), updated_at = now()
    where id = p_order_id and shipping_status in ('return_requested', 'return_shipping')
    returning * into v_order;
  if not found then raise exception 'BAD_STATE'; end if;
  insert into order_events (order_id, prev_status, next_status, actor, memo)
  values (p_order_id, 'return_shipping', 'return_done', 'admin', '회수 확인·환불 이체 완료');
  return v_order;
end; $$;

-- 교환·반품 반려 (관리자, 사유 필수) — 배송 완료·결제 완료로 복귀 (§7.3)
create or replace function public.admin_reject_claim(p_order_id uuid, p_memo text)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare v_order orders%rowtype;
begin
  if not public.is_admin() then raise exception 'ADMIN_ONLY'; end if;
  if coalesce(trim(p_memo), '') = '' then raise exception 'MEMO_REQUIRED'; end if;
  select * into v_order from orders where id = p_order_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_order.shipping_status not in ('exchange_requested', 'return_requested', 'return_shipping') then
    raise exception 'BAD_STATE';
  end if;
  update orders set shipping_status = 'delivered',
      payment_status = case when v_order.shipping_status like 'return%' then 'paid' else payment_status end,
      updated_at = now()
    where id = p_order_id returning * into v_order;
  insert into order_events (order_id, prev_status, next_status, actor, memo)
  values (p_order_id, v_order.shipping_status, 'delivered', 'admin', '반려: ' || trim(p_memo));
  return v_order;
end; $$;

-- ───────────────────────────────────────────
-- migration: fix_reject_claim_event_prev_status (2026-11-16T16:02:09.878Z)
-- ───────────────────────────────────────────
-- admin_reject_claim: 이력의 prev_status가 업데이트 후 값으로 덮이던 버그 수정
create or replace function public.admin_reject_claim(p_order_id uuid, p_memo text)
returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_order orders%rowtype;
  v_prev text;
begin
  if not public.is_admin() then raise exception 'ADMIN_ONLY'; end if;
  if coalesce(trim(p_memo), '') = '' then raise exception 'MEMO_REQUIRED'; end if;
  select * into v_order from orders where id = p_order_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_order.shipping_status not in ('exchange_requested', 'return_requested', 'return_shipping') then
    raise exception 'BAD_STATE';
  end if;
  v_prev := v_order.shipping_status;
  update orders set shipping_status = 'delivered',
      payment_status = case when v_prev like 'return%' then 'paid' else payment_status end,
      updated_at = now()
    where id = p_order_id returning * into v_order;
  insert into order_events (order_id, prev_status, next_status, actor, memo)
  values (p_order_id, v_prev, 'delivered', 'admin', '반려: ' || trim(p_memo));
  return v_order;
end; $$;

-- ───────────────────────────────────────────
-- migration: stage4_reviews (2026-11-16T17:28:22.454Z)
-- ───────────────────────────────────────────
-- 리뷰 (4-1~4-3, PRD §6.6·§6.2·§10) — 결제 완료 주문당 1건, 어드민 승인 후 메인 노출
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 10 and 300),
  nickname text not null check (char_length(nickname) between 1 and 20),
  visible boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

-- 본인 리뷰 조회
create policy "reviews_select_own" on public.reviews
  for select using (auth.uid() = user_id);

-- 노출 승인된 리뷰는 누구나(비로그인 포함) 조회 — 메인 리뷰 섹션
create policy "reviews_select_visible" on public.reviews
  for select using (visible);

-- 관리자 전체 조회
create policy "reviews_select_admin" on public.reviews
  for select using (public.is_admin());

-- 쓰기는 전부 RPC(security definer)로만

create or replace function public.create_review(
  p_order_id uuid, p_rating int, p_body text, p_nickname text
) returns public.reviews
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
  v_row public.reviews%rowtype;
begin
  select * into v_order from public.orders
    where id = p_order_id and user_id = auth.uid();
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_order.payment_status <> 'paid' then raise exception 'NOT_PAID'; end if;
  if exists (select 1 from public.reviews where order_id = p_order_id) then
    raise exception 'ALREADY_REVIEWED';
  end if;

  insert into public.reviews (order_id, user_id, rating, body, nickname)
    values (p_order_id, auth.uid(), p_rating, trim(p_body), trim(p_nickname))
    returning * into v_row;
  return v_row;
end $$;

create or replace function public.admin_set_review_visible(
  p_review_id uuid, p_visible boolean
) returns public.reviews
language plpgsql security definer set search_path = public as $$
declare
  v_row public.reviews%rowtype;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  update public.reviews set visible = p_visible where id = p_review_id
    returning * into v_row;
  if not found then raise exception 'NOT_FOUND'; end if;
  return v_row;
end $$;

-- ───────────────────────────────────────────
-- migration: stage4_review_fixes (2026-11-18T15:15:28.355Z)
-- ───────────────────────────────────────────
-- 코드 리뷰 수정 (시트 #19~24·26·27) — 환불 우회 차단, 경합 가드, 노출 범위 축소

-- #20: 실물 주문은 배송 시작 후 '환불 요청' 불가 → 반품 경로로 (+ UPDATE 상태 가드)
create or replace function public.request_refund(
  p_order_id uuid, p_reason text, p_bank text, p_account text, p_holder text
) returns public.orders
language plpgsql security definer set search_path = public as $$
declare v_order orders%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_order from orders where id = p_order_id and user_id = auth.uid();
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.payment_status <> 'paid' then raise exception 'NOT_PAID'; end if;
  if v_order.reading_first_viewed_at is not null then raise exception 'ALREADY_VIEWED'; end if;
  if v_order.product > 1 and v_order.shipping_status is distinct from 'awaiting' then
    raise exception 'USE_RETURN_FLOW';
  end if;
  if coalesce(trim(p_bank), '') = '' or coalesce(trim(p_account), '') = '' or coalesce(trim(p_holder), '') = '' then
    raise exception 'ACCOUNT_REQUIRED';
  end if;
  update orders set payment_status = 'refund_requested',
      refund_reason = nullif(trim(p_reason), ''),
      refund_account = jsonb_build_object('bank', trim(p_bank), 'account', trim(p_account), 'holder', trim(p_holder)),
      updated_at = now()
    where id = p_order_id and payment_status = 'paid' returning * into v_order;
  if not found then raise exception 'NOT_PAID'; end if;
  insert into order_events (order_id, prev_status, next_status, actor, memo)
  values (p_order_id, 'paid', 'refund_requested', 'user', v_order.refund_reason);
  return v_order;
end; $$;

-- #19: 반품 플로우 주문은 범용 환불 버튼으로 처리 불가 — 회수 확인 경로 강제
create or replace function public.admin_review_refund(p_order_id uuid) returns public.orders
language plpgsql security definer set search_path = public as $$
declare v_order orders%rowtype;
begin
  if not public.is_admin() then raise exception 'ADMIN_ONLY'; end if;
  select * into v_order from orders where id = p_order_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_order.shipping_status in ('return_requested', 'return_shipping') then
    raise exception 'USE_RETURN_FLOW';
  end if;
  update orders set payment_status = 'refund_reviewing', updated_at = now()
    where id = p_order_id and payment_status = 'refund_requested' returning * into v_order;
  if not found then raise exception 'NOT_REQUESTED'; end if;
  insert into order_events (order_id, prev_status, next_status, actor)
  values (p_order_id, 'refund_requested', 'refund_reviewing', 'admin');
  return v_order;
end; $$;

-- #19 + #26: 환불 완료도 반품 플로우 차단, 완료 시 해당 주문 리뷰 자동 비노출
create or replace function public.admin_complete_refund(p_order_id uuid) returns public.orders
language plpgsql security definer set search_path = public as $$
declare v_order orders%rowtype;
begin
  if not public.is_admin() then raise exception 'ADMIN_ONLY'; end if;
  select * into v_order from orders where id = p_order_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_order.shipping_status in ('return_requested', 'return_shipping') then
    raise exception 'USE_RETURN_FLOW';
  end if;
  update orders set payment_status = 'refunded', refunded_at = now(), updated_at = now()
    where id = p_order_id and payment_status in ('refund_requested', 'refund_reviewing')
    returning * into v_order;
  if not found then raise exception 'NOT_IN_REFUND'; end if;
  update reviews set visible = false where order_id = p_order_id;
  insert into order_events (order_id, prev_status, next_status, actor, memo)
  values (p_order_id, 'refund_reviewing', 'refunded', 'admin', '환불 이체 완료');
  return v_order;
end; $$;

-- #26: 반품 완료(=환불) 시에도 리뷰 비노출
create or replace function public.admin_return_complete(p_order_id uuid) returns public.orders
language plpgsql security definer set search_path = public as $$
declare v_order orders%rowtype;
begin
  if not public.is_admin() then raise exception 'ADMIN_ONLY'; end if;
  update orders set shipping_status = 'return_done', payment_status = 'refunded',
      refunded_at = now(), updated_at = now()
    where id = p_order_id and shipping_status in ('return_requested', 'return_shipping')
    returning * into v_order;
  if not found then raise exception 'BAD_STATE'; end if;
  update reviews set visible = false where order_id = p_order_id;
  insert into order_events (order_id, prev_status, next_status, actor, memo)
  values (p_order_id, 'return_shipping', 'return_done', 'admin', '회수 확인·환불 이체 완료');
  return v_order;
end; $$;

-- #22 + #27-②: 발송 처리 — UPDATE 상태 가드(더블클릭 경합) + 배송 부적 지정 완료 확인
create or replace function public.admin_ship(p_order_id uuid, p_carrier text, p_tracking text) returns public.orders
language plpgsql security definer set search_path = public as $$
declare v_order orders%rowtype;
begin
  if not public.is_admin() then raise exception 'ADMIN_ONLY'; end if;
  select * into v_order from orders where id = p_order_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_order.payment_status <> 'paid' or v_order.shipping_status <> 'awaiting' then raise exception 'BAD_STATE'; end if;
  if not exists (select 1 from shipments where order_id = p_order_id) then raise exception 'NO_ADDRESS'; end if;
  if v_order.shipping_talismans is null
     or jsonb_array_length(v_order.shipping_talismans) <> (case v_order.product when 2 then 1 else 3 end) then
    raise exception 'TALISMANS_REQUIRED';
  end if;
  if coalesce(trim(p_carrier), '') = '' or coalesce(trim(p_tracking), '') = '' then raise exception 'TRACKING_REQUIRED'; end if;

  update orders set shipping_status = 'shipping', updated_at = now()
    where id = p_order_id and shipping_status = 'awaiting' and payment_status = 'paid'
    returning * into v_order;
  if not found then raise exception 'BAD_STATE'; end if;
  update shipments set carrier = trim(p_carrier), tracking_no = trim(p_tracking), shipped_at = now(), updated_at = now()
    where order_id = p_order_id;
  insert into order_events (order_id, prev_status, next_status, actor, memo)
  values (p_order_id, 'awaiting', 'shipping', 'admin', trim(p_carrier) || ' ' || trim(p_tracking));
  return v_order;
end; $$;

-- #22: 교환 신청 — UPDATE 상태 가드
create or replace function public.request_exchange(p_order_id uuid, p_reason text) returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_order orders%rowtype;
  v_delivered timestamptz;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_order from orders where id = p_order_id and user_id = auth.uid();
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.shipping_status <> 'delivered' then raise exception 'NOT_DELIVERED'; end if;
  select delivered_at into v_delivered from shipments where order_id = p_order_id;
  if v_delivered is null or v_delivered < now() - interval '7 days' then raise exception 'PERIOD_OVER'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'REASON_REQUIRED'; end if;

  update orders set shipping_status = 'exchange_requested', claim_reason = trim(p_reason), updated_at = now()
    where id = p_order_id and shipping_status = 'delivered' returning * into v_order;
  if not found then raise exception 'NOT_DELIVERED'; end if;
  insert into order_events (order_id, prev_status, next_status, actor, memo)
  values (p_order_id, 'delivered', 'exchange_requested', 'user', trim(p_reason));
  return v_order;
end; $$;

-- #22: 반품 신청 — UPDATE 상태 가드
create or replace function public.request_return(
  p_order_id uuid, p_reason text, p_bank text, p_account text, p_holder text
) returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_order orders%rowtype;
  v_delivered timestamptz;
  v_digital_part int;
  v_refund int;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_order from orders where id = p_order_id and user_id = auth.uid();
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.shipping_status <> 'delivered' then raise exception 'NOT_DELIVERED'; end if;
  if v_order.payment_status <> 'paid' then raise exception 'NOT_PAID'; end if;
  select delivered_at into v_delivered from shipments where order_id = p_order_id;
  if v_delivered is null or v_delivered < now() - interval '7 days' then raise exception 'PERIOD_OVER'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'REASON_REQUIRED'; end if;
  if coalesce(trim(p_bank), '') = '' or coalesce(trim(p_account), '') = '' or coalesce(trim(p_holder), '') = '' then
    raise exception 'ACCOUNT_REQUIRED';
  end if;

  v_digital_part := case v_order.kind when 'new' then 10000 else 2000 end;
  v_refund := case when v_order.reading_first_viewed_at is not null
                   then v_order.amount - v_digital_part else v_order.amount end;

  update orders set
      shipping_status = 'return_requested',
      payment_status = 'refund_requested',
      claim_reason = trim(p_reason),
      refund_reason = trim(p_reason),
      refund_amount = v_refund,
      refund_account = jsonb_build_object('bank', trim(p_bank), 'account', trim(p_account), 'holder', trim(p_holder)),
      updated_at = now()
    where id = p_order_id and shipping_status = 'delivered' and payment_status = 'paid'
    returning * into v_order;
  if not found then raise exception 'NOT_DELIVERED'; end if;
  insert into order_events (order_id, prev_status, next_status, actor, memo)
  values (p_order_id, 'delivered', 'return_requested', 'user', trim(p_reason));
  return v_order;
end; $$;

-- #22: 배송지 저장 — 발송 이후 끼어드는 갱신 차단
create or replace function public.upsert_shipping_address(
  p_order_id uuid, p_receiver text, p_phone text, p_postcode text, p_address text,
  p_address_detail text default null, p_memo text default null
) returns public.shipments
language plpgsql security definer set search_path = public as $$
declare
  v_order orders%rowtype;
  v_row shipments%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_order from orders where id = p_order_id and user_id = auth.uid();
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.product = 1 then raise exception 'NOT_PHYSICAL'; end if;
  if v_order.payment_status <> 'paid' then raise exception 'NOT_PAID'; end if;
  if v_order.shipping_status <> 'awaiting' then raise exception 'ALREADY_SHIPPED'; end if;
  if coalesce(trim(p_receiver), '') = '' or coalesce(trim(p_phone), '') = ''
     or coalesce(trim(p_postcode), '') = '' or coalesce(trim(p_address), '') = '' then
    raise exception 'FIELDS_REQUIRED';
  end if;

  insert into shipments (order_id, receiver, phone, postcode, address, address_detail, memo)
  values (p_order_id, trim(p_receiver), trim(p_phone), trim(p_postcode), trim(p_address),
          nullif(trim(p_address_detail), ''), nullif(trim(p_memo), ''))
  on conflict (order_id) do update
    set receiver = excluded.receiver, phone = excluded.phone, postcode = excluded.postcode,
        address = excluded.address, address_detail = excluded.address_detail, memo = excluded.memo,
        updated_at = now()
    where exists (select 1 from orders o where o.id = excluded.order_id and o.shipping_status = 'awaiting')
  returning * into v_row;
  if v_row.id is null then raise exception 'ALREADY_SHIPPED'; end if;
  return v_row;
end; $$;

-- #23: 공개 리뷰는 안전한 컬럼만 — 행 전체가 열리는 visible 정책 제거, RPC로 대체
drop policy if exists "reviews_select_visible" on public.reviews;

create or replace function public.list_public_reviews(p_limit int default 10)
returns table (id uuid, rating int, body text, nickname text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.id, r.rating, r.body, r.nickname, r.created_at
  from reviews r where r.visible
  order by r.created_at desc
  limit least(greatest(coalesce(p_limit, 10), 1), 50);
$$;

-- #24: 문의의 관련 주문도 본인 소유만 연결 가능하게 보강
drop policy if exists "inquiries_insert_own" on public.inquiries;
create policy "inquiries_insert_own" on public.inquiries for insert
  with check (
    auth.uid() = user_id and status = 'received' and answer is null
    and (order_id is null or exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid()))
  );

-- ───────────────────────────────────────────
-- migration: stage4_address_reminder_cron (2026-11-18T15:19:57.324Z)
-- ───────────────────────────────────────────
-- 4-4: 배송지 7일 미입력 알림 — 매일 새벽 1시(UTC 16시) 점검, 주문당 1회만 기록
-- Resend 키가 없는 동안은 email_outbox에 '발송 대기'(skipped)로만 쌓인다 (시트 #8과 동일한 임시 패턴)
select cron.schedule(
  'address-reminder',
  '0 16 * * *',
  $$
  insert into public.email_outbox (template, ref_id, to_email, subject, status, error)
  select 'address_reminder', o.id, coalesce(o.user_email, '(없음)'),
         '[소福소福] 배송지를 입력해 주세요', 'skipped', 'NO_API_KEY'
  from public.orders o
  where o.product > 1
    and o.payment_status = 'paid'
    and o.shipping_status = 'awaiting'
    and o.paid_at < now() - interval '7 days'
    and not exists (select 1 from public.shipments s where s.order_id = o.id)
    and not exists (select 1 from public.email_outbox e where e.template = 'address_reminder' and e.ref_id = o.id)
  $$
);

-- ───────────────────────────────────────────
-- migration: harden_rpc_grants (2026-11-22T10:13:06.734Z)
-- ───────────────────────────────────────────
-- 보안 점검(2026-11-22): RPC 실행 권한 최소화 — 함수 내부 가드에 더해 역할 차원에서도 차단
-- 비로그인(anon)은 공개 리뷰 조회만 호출 가능. 트리거 함수는 RPC로 아예 호출 불가.

-- 새 함수가 생겨도 기본으로 다 열리지 않게 기본 권한 축소
alter default privileges in schema public revoke execute on functions from anon, authenticated;

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig, p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  loop
    -- 트리거 함수는 양쪽 다 회수
    if f.proname in ('enforce_saju_profile_limit', 'set_inquiry_email') then
      execute format('revoke execute on function %s from anon, authenticated', f.sig);
    -- 공개 리뷰 조회만 anon 허용
    elsif f.proname = 'list_public_reviews' then
      execute format('grant execute on function %s to anon, authenticated', f.sig);
    else
      execute format('revoke execute on function %s from anon', f.sig);
      execute format('grant execute on function %s to authenticated', f.sig);
    end if;
  end loop;
end $$;

-- ───────────────────────────────────────────
-- migration: harden_rpc_grants_public (2026-11-22T10:14:35.578Z)
-- ───────────────────────────────────────────
-- 보완: 함수 기본 EXECUTE는 PUBLIC에 부여되므로 PUBLIC부터 회수해야 효력이 있음
alter default privileges in schema public revoke execute on functions from public;

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig, p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    if f.proname in ('enforce_saju_profile_limit', 'set_inquiry_email') then
      execute format('revoke execute on function %s from authenticated, service_role', f.sig);
    elsif f.proname = 'list_public_reviews' then
      execute format('grant execute on function %s to anon, authenticated, service_role', f.sig);
    else
      execute format('grant execute on function %s to authenticated, service_role', f.sig);
    end if;
  end loop;
end $$;

-- ───────────────────────────────────────────
-- migration: admin_login_lockout_hook (2026-11-23T04:59:10.603Z)
-- ───────────────────────────────────────────
-- 로그인 5회 실패 시 10분 잠금 (Supabase 비밀번호 검증 훅 — 대시보드에서 활성화 필요, 시트 #31)
create table if not exists public.password_failed_attempts (
  user_id uuid primary key,
  failed_attempts int not null default 0,
  last_failed_at timestamptz not null default now()
);
-- 클라이언트 접근 전면 차단 (RLS 정책 없음 = 거부), 훅 실행 계정만 접근
alter table public.password_failed_attempts enable row level security;
grant select, insert, update, delete on table public.password_failed_attempts to supabase_auth_admin;

create or replace function public.hook_password_verification_attempt(event jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := (event->>'user_id')::uuid;
  v_valid boolean := coalesce((event->>'valid')::boolean, false);
  rec public.password_failed_attempts%rowtype;
begin
  select * into rec from password_failed_attempts where user_id = v_user;

  -- 잠금: 10분 안에 5회 이상 실패
  if rec.failed_attempts >= 5 and rec.last_failed_at > now() - interval '10 minutes' then
    return jsonb_build_object(
      'decision', 'reject',
      'message', '로그인을 5회 실패해 10분간 잠겼어요. 잠시 후 다시 시도해 주세요.'
    );
  end if;

  if v_valid then
    delete from password_failed_attempts where user_id = v_user;
  else
    insert into password_failed_attempts (user_id, failed_attempts, last_failed_at)
    values (v_user, 1, now())
    on conflict (user_id) do update set
      failed_attempts = case
        when password_failed_attempts.last_failed_at < now() - interval '10 minutes' then 1
        else password_failed_attempts.failed_attempts + 1
      end,
      last_failed_at = now();
  end if;
  return jsonb_build_object('decision', 'continue');
end $$;

grant execute on function public.hook_password_verification_attempt(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_password_verification_attempt(jsonb) from anon, authenticated, public;
