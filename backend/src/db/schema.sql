create table if not exists public.kondisi_makanan (
  id uuid primary key default gen_random_uuid(),
  mq_135 numeric not null,
  mq_136 numeric not null,
  temperature numeric not null,
  humidity numeric not null,
  h2s numeric,
  voc numeric,
  amonia numeric,
  tvc numeric not null,
  rsl_minutes numeric not null,
  class smallint not null check (class in (0, 1, 2)),
  created_at timestamptz not null default now()
);
