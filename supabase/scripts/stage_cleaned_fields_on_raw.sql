-- Keep finance-system originals unchanged. This is staging only: no table,
-- source row, grant, or public API is removed or replaced.
alter table public.transactions_raw
  add column if not exists vendor_payee_public text,
  add column if not exists description_public text;

-- Run this bounded statement repeatedly AFTER reviewing the public cleanup.
-- Only changed values are written, making interruption and resumption safe.
-- The stable ID is unique on both tables; never join on vendor, memo, or amount.
with batch as materialized (
  select r._public_transaction_id, p.vendor_payee_public, p.description_public
  from public.transactions_raw r
  join public.public_transactions p
    on p.raw_transaction_id = r._public_transaction_id
  where r.vendor_payee_public is distinct from p.vendor_payee_public
     or r.description_public is distinct from p.description_public
  order by r._public_transaction_id
  limit 5000
), copied as (
  update public.transactions_raw r
  set vendor_payee_public = b.vendor_payee_public,
      description_public = b.description_public
  from batch b
  where r._public_transaction_id = b._public_transaction_id
  returning r._public_transaction_id
)
select count(*) as rows_copied from copied;

-- All three mismatch counts must be zero before considering any cutover.
select count(*) as public_rows,
  count(*) filter (where r._public_transaction_id is null) as unmatched_rows,
  count(*) filter (
    where p.amount is distinct from coalesce(r.amount, 0)::numeric(14,2)
  ) as amount_mismatches,
  count(*) filter (
    where r.vendor_payee_public is distinct from p.vendor_payee_public
       or r.description_public is distinct from p.description_public
  ) as cleaned_field_mismatches
from public.public_transactions p
left join public.transactions_raw r
  on r._public_transaction_id = p.raw_transaction_id;

-- Original columns remain private; staging does not grant browser access.
select relrowsecurity as raw_rls_enabled,
  has_table_privilege('anon', 'public.transactions_raw', 'SELECT') as anon_can_read_raw,
  has_table_privilege('authenticated', 'public.transactions_raw', 'SELECT') as authenticated_can_read_raw
from pg_class where oid = 'public.transactions_raw'::regclass;
