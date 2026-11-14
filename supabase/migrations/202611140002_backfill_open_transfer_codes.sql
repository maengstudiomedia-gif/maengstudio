lock table public.invoices in share row exclusive mode;

do $$
declare
  pending_invoice record;
  available_code smallint;
begin
  for pending_invoice in
    select id
    from public.invoices
    where payment_method = 'transfer'
      and payment_status = 'unpaid'
      and coalesce(paid_amount, 0) = 0
      and transfer_code is null
      and (payment_expires_at is null or payment_expires_at > now())
    order by created_at, id
  loop
    select candidate.code
    into available_code
    from generate_series(1, 999) as candidate(code)
    where not exists (
      select 1
      from public.invoices as active_invoice
      where active_invoice.payment_method = 'transfer'
        and active_invoice.payment_status = 'unpaid'
        and active_invoice.transfer_code = candidate.code
    )
    order by random()
    limit 1;

    if available_code is null then
      raise exception 'Tidak ada kode unik QRIS yang tersedia untuk invoice %.', pending_invoice.id;
    end if;

    update public.invoices
    set transfer_code = available_code
    where id = pending_invoice.id;
  end loop;
end;
$$;
