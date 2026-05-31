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
  original_monster text not null default '',
  author_nickname text not null default '',
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

alter table public.monster_reports
add column if not exists author_nickname text not null default '';

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
  and char_length(author_nickname) <= 24
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

drop policy if exists "Reviewer UI can delete approved reports" on public.monster_reports;
create policy "Reviewer UI can delete approved reports"
on public.monster_reports for update
to anon
using (status = 'approved')
with check (status = 'deleted');

create table if not exists public.site_visitors (
  visitor_id text primary key,
  first_seen date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_visitors (
  visitor_id text not null,
  visit_date date not null default current_date,
  created_at timestamptz not null default now(),
  primary key (visitor_id, visit_date)
);

alter table public.site_visitors enable row level security;
alter table public.daily_visitors enable row level security;

drop policy if exists "Anyone can register site visitor" on public.site_visitors;
create policy "Anyone can register site visitor"
on public.site_visitors for insert
to anon
with check (char_length(visitor_id) between 8 and 120);

drop policy if exists "Anyone can read site visitor count" on public.site_visitors;
create policy "Anyone can read site visitor count"
on public.site_visitors for select
to anon
using (true);

drop policy if exists "Anyone can register daily visitor" on public.daily_visitors;
create policy "Anyone can register daily visitor"
on public.daily_visitors for insert
to anon
with check (char_length(visitor_id) between 8 and 120);

drop policy if exists "Anyone can read daily visitor count" on public.daily_visitors;
create policy "Anyone can read daily visitor count"
on public.daily_visitors for select
to anon
using (true);

create table if not exists public.guide_posts (
  id text primary key,
  title text not null,
  author text not null default '익명',
  content text not null,
  media jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.guide_posts enable row level security;

drop policy if exists "Anyone can read guide posts" on public.guide_posts;
create policy "Anyone can read guide posts"
on public.guide_posts for select to anon using (true);

drop policy if exists "Anyone can create guide posts" on public.guide_posts;
create policy "Anyone can create guide posts"
on public.guide_posts for insert to anon
with check (
  char_length(title) between 1 and 100
  and char_length(author) between 1 and 40
  and char_length(content) between 1 and 5000
  and jsonb_typeof(media) = 'array'
);

drop policy if exists "Anyone can edit guide posts" on public.guide_posts;
create policy "Anyone can edit guide posts"
on public.guide_posts for update to anon
using (true)
with check (
  char_length(title) between 1 and 100
  and char_length(author) between 1 and 40
  and char_length(content) between 1 and 5000
  and jsonb_typeof(media) = 'array'
);

drop policy if exists "Anyone can delete guide posts" on public.guide_posts;
create policy "Anyone can delete guide posts"
on public.guide_posts for delete to anon using (true);

insert into storage.buckets (id, name, public)
values ('guide-media', 'guide-media', true)
on conflict (id) do update set public = true;

drop policy if exists "Anyone can read guide media" on storage.objects;
create policy "Anyone can read guide media"
on storage.objects for select to anon
using (bucket_id = 'guide-media');

drop policy if exists "Anyone can upload guide media" on storage.objects;
create policy "Anyone can upload guide media"
on storage.objects for insert to anon
with check (bucket_id = 'guide-media');
