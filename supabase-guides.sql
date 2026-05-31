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

insert into storage.buckets (id, name, public, file_size_limit)
values ('guide-media', 'guide-media', true, 52428800)
on conflict (id) do update set
  public = true,
  file_size_limit = 52428800;

drop policy if exists "Anyone can read guide media" on storage.objects;
create policy "Anyone can read guide media"
on storage.objects for select to anon
using (bucket_id = 'guide-media');

drop policy if exists "Anyone can upload guide media" on storage.objects;
create policy "Anyone can upload guide media"
on storage.objects for insert to anon
with check (bucket_id = 'guide-media');
