-- TVC prediction inputs and outputs
create table if not exists public.tvc_samples (
  id uuid primary key default gen_random_uuid(),
  mq_135 numeric not null,
  mq_136 numeric not null,
  temperature numeric not null,
  humidity numeric not null,
  minutes numeric not null,
  tvc numeric not null,
  rsl_minutes numeric not null,
  class smallint not null check (class in (0, 1, 2)),
  h2s numeric,
  voc numeric,
  amonia numeric,
  created_at timestamptz not null default now()
);

-- Freshness prediction outputs derived from TVC results
create table if not exists public.predict_samples (
  id uuid primary key default gen_random_uuid(),
  mq_135 numeric not null,
  mq_136 numeric not null,
  temperature numeric not null,
  humidity numeric not null,
  freshness_label text not null check (freshness_label in ('Safe', 'Warning', 'Danger')),
  rsl_minutes numeric not null,
  prob_safe numeric not null,
  prob_warning numeric not null,
  prob_danger numeric not null,
  tvc_sample_id uuid references public.tvc_samples(id) on delete set null,
  created_at timestamptz not null default now()
);
