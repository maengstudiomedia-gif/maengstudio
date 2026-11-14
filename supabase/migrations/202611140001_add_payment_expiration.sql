create extension if not exists pg_cron;

alter table public.invoices
  add column if not exists payment_expires_at timestamptz;

update public.invoices
set payment_expires_at = now() + interval '5 hours'
where payment_expires_at is null
  and payment_status = 'unpaid'
  and payment_method in ('cash', 'transfer');

create index if not exists invoices_payment_expiration_idx
  on public.invoices (payment_expires_at)
  where payment_status = 'unpaid'
    and payment_method in ('cash', 'transfer');

create or replace function public.expire_overdue_bookings()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  cancelled_count integer;
begin
  with expired_invoices as (
    update public.invoices as invoice
    set payment_status = 'expired'
    from public.bookings as booking
    where booking.id = invoice.booking_id
      and booking.status = 'pending_payment'
      and invoice.payment_status = 'unpaid'
      and invoice.payment_method in ('cash', 'transfer')
      and invoice.payment_expires_at <= now()
      and coalesce(invoice.paid_amount, 0) < case
        when invoice.payment_plan = 'full' then
          coalesce(invoice.total_amount, 0)
          + case when invoice.payment_method = 'transfer' then coalesce(invoice.transfer_code, 0) else 0 end
        else
          coalesce(invoice.dp_amount, invoice.total_amount * 0.5, 0)
          + case when invoice.payment_method = 'transfer' then coalesce(invoice.transfer_code, 0) else 0 end
      end
    returning invoice.booking_id
  )
  update public.bookings as booking
  set status = 'cancelled'
  from expired_invoices
  where booking.id = expired_invoices.booking_id
    and booking.status = 'pending_payment';

  get diagnostics cancelled_count = row_count;
  return cancelled_count;
end;
$$;

revoke all on function public.expire_overdue_bookings() from public, anon, authenticated;
grant execute on function public.expire_overdue_bookings() to service_role;

do $$
declare
  existing_job record;
begin
  for existing_job in
    select jobid from cron.job where jobname = 'expire-overdue-bookings'
  loop
    perform cron.unschedule(existing_job.jobid);
  end loop;

  perform cron.schedule(
    'expire-overdue-bookings',
    '* * * * *',
    'select public.expire_overdue_bookings();'
  );
end;
$$;
