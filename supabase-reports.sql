create table if not exists public.monster_reports (
  id text primary key,
  mode text not null default 'new',
  monster text not null,
  original_monster text not null default '',
  grade text not null,
  floor text not null,
  area text not null,
  stats text not null,
  passive text not null,
  active text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.monster_reports
add column if not exists original_monster text not null default '';

alter table public.monster_reports enable row level security;

drop policy if exists "Approved reports are readable" on public.monster_reports;
create policy "Approved reports are readable"
on public.monster_reports for select
to anon
using (status = 'approved');

drop policy if exists "Anyone can submit monster reports" on public.monster_reports;
create policy "Anyone can submit monster reports"
on public.monster_reports for insert
to anon
with check (
  status = 'pending'
  and mode in ('new', 'edit')
  and char_length(monster) between 1 and 80
  and char_length(original_monster) <= 80
  and char_length(grade) between 1 and 40
  and char_length(floor) between 1 and 40
  and char_length(area) between 1 and 80
  and char_length(stats) between 1 and 500
  and char_length(passive) between 1 and 800
  and char_length(active) between 1 and 800
);

-- 관리자 검수 화면에서 대기 목록과 승인/반려 업데이트까지 쓰려면
-- 아래 정책 2개를 추가로 실행해야 합니다.
-- 정적 사이트 특성상 anon key 기반이므로, 실제 운영 보안은 Supabase Auth 또는 Edge Function으로 강화하는 편이 좋습니다.

drop policy if exists "Pending reports are readable for reviewer UI" on public.monster_reports;
create policy "Pending reports are readable for reviewer UI"
on public.monster_reports for select
to anon
using (status in ('pending', 'approved'));

drop policy if exists "Reviewer UI can update report status" on public.monster_reports;
create policy "Reviewer UI can update report status"
on public.monster_reports for update
to anon
using (status = 'pending')
with check (status in ('approved', 'rejected'));

drop policy if exists "Reviewer UI can delete approved reports" on public.monster_reports;
create policy "Reviewer UI can delete approved reports"
on public.monster_reports for update
to anon
using (status = 'approved')
with check (status = 'deleted');
