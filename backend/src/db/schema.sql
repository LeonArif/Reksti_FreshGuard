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

create table if not exists public.prediction_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null default 'device',
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
  class_name text not null check (class_name in ('Safe', 'Warning', 'Danger')),
  class_probabilities jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists prediction_history_user_id_created_at_idx
  on public.prediction_history (user_id, created_at desc);
