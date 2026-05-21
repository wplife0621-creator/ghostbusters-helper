create table if not exists public.builds (
  id text primary key,
  title text not null,
  author text not null default 'anonymous',
  members jsonb not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

alter table public.builds enable row level security;

drop policy if exists "Public builds are readable" on public.builds;
create policy "Public builds are readable"
on public.builds for select
to anon
using (true);

drop policy if exists "Anyone can submit builds" on public.builds;
create policy "Anyone can submit builds"
on public.builds for insert
to anon
with check (
  char_length(title) between 1 and 80
  and char_length(author) between 1 and 40
  and jsonb_typeof(members) = 'array'
);

create table if not exists public.monster_reports (
  id text primary key,
  mode text not null default 'new',
  monster text not null,
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
  and char_length(grade) between 1 and 40
  and char_length(floor) between 1 and 40
  and char_length(area) between 1 and 80
  and char_length(stats) between 1 and 500
  and char_length(passive) between 1 and 800
  and char_length(active) between 1 and 800
);

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
