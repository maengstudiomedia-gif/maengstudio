alter table public.packages
  add column if not exists allow_extra_days boolean not null default true,
  add column if not exists extra_day_price numeric(12, 2) not null default 0
    check (extra_day_price >= 0);