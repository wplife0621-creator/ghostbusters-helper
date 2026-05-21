create table if not exists public.builds (
  id text primary key,
  title text not null,
  author text not null default '익명',
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
