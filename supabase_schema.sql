-- =============================================
-- 밥상기록 — Supabase Schema
-- 전체 삭제 후 재생성 방식 — 언제든 다시 실행 가능
-- ⚠️ 기존 데이터가 모두 삭제됩니다
-- =============================================

-- 기존 테이블 삭제 (의존 순서: 자식 → 부모)
drop table if exists public.expense_items cascade;
drop table if exists public.expenses cascade;
drop table if exists public.categories cascade;
drop table if exists public.memberships cascade;
drop table if exists public.households cascade;
drop function if exists public.is_member(uuid);
drop function if exists public.create_household(text, text);

-- =============================================
-- 테이블 생성
-- =============================================

-- 1. households (가계부 그룹)
create table public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text not null unique,
  created_at  timestamptz default now()
);

-- 2. memberships (그룹 멤버)
create table public.memberships (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete cascade,
  role         text not null default 'member' check (role in ('owner','member')),
  joined_at    timestamptz default now(),
  unique(household_id, user_id)
);

-- 3. categories (카테고리)
create table public.categories (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete cascade,
  name         text not null,
  icon         text not null default '📦',
  color        text not null default '#94a3b8',
  created_at   timestamptz default now()
);

-- 4. expenses (지출 내역)
create table public.expenses (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete cascade,
  category_id  uuid references public.categories(id) on delete set null,
  amount       integer not null check (amount > 0),
  memo         text,
  photo_url    text,
  payment_method text not null default 'card' check (payment_method in ('cash','card','local_currency')),
  date         date not null default current_date,
  created_at   timestamptz default now()
);

-- 5. expense_items (상세 품목)
create table public.expense_items (
  id         uuid primary key default gen_random_uuid(),
  expense_id uuid references public.expenses(id) on delete cascade,
  name       text not null,
  quantity   integer not null default 1 check (quantity > 0),
  amount     integer not null check (amount > 0),
  created_at timestamptz default now()
);

-- =============================================
-- RLS (Row Level Security)
-- =============================================

alter table public.households    enable row level security;
alter table public.memberships   enable row level security;
alter table public.categories    enable row level security;
alter table public.expenses      enable row level security;
alter table public.expense_items enable row level security;

-- 헬퍼 함수: 현재 유저가 특정 household 멤버인지 확인
create or replace function public.is_member(hid uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.memberships
    where household_id = hid and user_id = auth.uid()
  );
$$;

-- households
create policy "allow_select" on public.households for select to authenticated
  using (is_member(id));
create policy "allow_insert" on public.households for insert to authenticated
  with check (true);

-- memberships
create policy "allow_select" on public.memberships for select to authenticated
  using (is_member(household_id));
create policy "allow_insert" on public.memberships for insert to authenticated
  with check (auth.uid() = user_id);

-- categories
create policy "allow_select" on public.categories for select to authenticated
  using (is_member(household_id));
create policy "allow_insert" on public.categories for insert to authenticated
  with check (is_member(household_id));
create policy "allow_update" on public.categories for update to authenticated
  using (is_member(household_id));
create policy "allow_delete" on public.categories for delete to authenticated
  using (is_member(household_id));

-- expenses
create policy "allow_select" on public.expenses for select to authenticated
  using (is_member(household_id));
create policy "allow_insert" on public.expenses for insert to authenticated
  with check (is_member(household_id));
create policy "allow_update" on public.expenses for update to authenticated
  using (is_member(household_id));
create policy "allow_delete" on public.expenses for delete to authenticated
  using (is_member(household_id));

-- expense_items
create policy "allow_select" on public.expense_items for select to authenticated
  using (exists (
    select 1 from public.expenses e
    join public.memberships m on m.household_id = e.household_id
    where e.id = expense_items.expense_id and m.user_id = auth.uid()
  ));
create policy "allow_insert" on public.expense_items for insert to authenticated
  with check (exists (
    select 1 from public.expenses e
    join public.memberships m on m.household_id = e.household_id
    where e.id = expense_items.expense_id and m.user_id = auth.uid()
  ));
create policy "allow_delete" on public.expense_items for delete to authenticated
  using (exists (
    select 1 from public.expenses e
    join public.memberships m on m.household_id = e.household_id
    where e.id = expense_items.expense_id and m.user_id = auth.uid()
  ));

-- =============================================
-- GRANT 권한
-- =============================================

grant usage on schema public to authenticated;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;

-- =============================================
-- RPC 함수 (RLS 우회용)
-- =============================================

-- 그룹 생성 함수
create or replace function create_household(
  household_name text,
  household_invite_code text
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_id uuid;
begin
  insert into public.households (name, invite_code)
  values (household_name, household_invite_code)
  returning id into new_id;

  insert into public.memberships (household_id, user_id, role)
  values (new_id, auth.uid(), 'owner');

  return new_id;
end;
$$;

-- 초대코드로 그룹 참여 함수
create or replace function join_household_by_invite(
  code text
)
returns uuid
language plpgsql
security definer
as $$
declare
  found_id uuid;
begin
  select id into found_id
  from public.households
  where invite_code = upper(trim(code));

  if found_id is null then
    raise exception 'INVALID_INVITE_CODE';
  end if;

  -- 이미 멤버인 경우 체크
  if exists (
    select 1 from public.memberships
    where household_id = found_id and user_id = auth.uid()
  ) then
    raise exception 'ALREADY_MEMBER';
  end if;

  insert into public.memberships (household_id, user_id, role)
  values (found_id, auth.uid(), 'member');

  return found_id;
end;
$$;

-- =============================================
-- Storage bucket (영수증 사진)
-- =============================================

insert into storage.buckets (id, name, public) values ('receipts', 'receipts', true)
  on conflict do nothing;

-- 기존 storage 정책 삭제 후 재생성
do $$
begin
  drop policy if exists "멤버만 업로드" on storage.objects;
  drop policy if exists "누구나 조회" on storage.objects;
  drop policy if exists "allow_upload" on storage.objects;
  drop policy if exists "allow_view" on storage.objects;
exception when others then null;
end $$;

create policy "allow_upload" on storage.objects for insert
  with check (bucket_id = 'receipts' and auth.role() = 'authenticated');

create policy "allow_view" on storage.objects for select
  using (bucket_id = 'receipts');
