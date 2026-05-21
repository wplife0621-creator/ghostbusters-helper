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
