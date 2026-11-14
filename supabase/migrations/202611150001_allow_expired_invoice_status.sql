do $$
declare
  status_constraint record;
  allowed_statuses text;
begin
  for status_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.invoices'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%payment_status%'
      and pg_get_constraintdef(oid) ilike '%unpaid%'
  loop
    execute format('alter table public.invoices drop constraint %I', status_constraint.conname);
  end loop;

  select string_agg(format('%L', status), ', ')
  into allowed_statuses
  from (
    select distinct payment_status as status
    from public.invoices
    where payment_status is not null
    union
    select unnest(array['unpaid', 'paid', 'expired']::text[]) as status
  ) statuses;

  execute format(
    'alter table public.invoices add constraint invoices_payment_status_check check (payment_status in (%s))',
    allowed_statuses
  );
end;
$$;
