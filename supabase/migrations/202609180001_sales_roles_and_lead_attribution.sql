alter table public.leads add column if not exists created_by uuid references auth.users(id) on delete set null;
create index if not exists leads_created_by_idx on public.leads(created_by);

-- Role baru dipakai oleh aplikasi: admin, sales, customer.
-- Data lama dengan role client tetap dibaca sebagai customer oleh aplikasi.