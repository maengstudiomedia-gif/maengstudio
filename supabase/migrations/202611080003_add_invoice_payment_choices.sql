alter table public.invoices
  add column if not exists payment_plan text
    check (payment_plan in ('dp', 'full')),
  add column if not exists payment_method text
    check (payment_method in ('cash', 'transfer'));