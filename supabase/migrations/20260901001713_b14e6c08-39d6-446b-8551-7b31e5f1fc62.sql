alter table public.memes add column if not exists url text;
alter table public.memes add column if not exists categories text[] not null default '{}';
create index if not exists memes_categories_idx on public.memes using gin (categories);