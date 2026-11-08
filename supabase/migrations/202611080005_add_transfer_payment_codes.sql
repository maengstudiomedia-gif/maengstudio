alter table public.invoices
  add column if not exists transfer_code smallint
    check (transfer_code between 1 and 999);

create unique index if not exists invoices_unique_open_transfer_code_idx
  on public.invoices (transfer_code)
  where payment_method = 'transfer'
    and payment_status = 'unpaid'
    and transfer_code is not null;