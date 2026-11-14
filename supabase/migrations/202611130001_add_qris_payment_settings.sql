create table if not exists public.payment_settings (
  id text primary key default 'default' check (id = 'default'),
  qris_image_path text not null,
  updated_at timestamptz not null default now()
);

alter table public.payment_settings enable row level security;
