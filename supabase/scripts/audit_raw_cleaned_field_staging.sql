-- Read-only checkpoint for the live consolidation. Six blank raw rows are
-- intentionally absent from the cleaned list; no source rows should be deleted.
select count(*) as raw_rows,
  count(*) filter (where vendor_payee_public is not null) as vendors_staged,
  count(*) filter (where description_public is not null) as descriptions_staged,
  pg_size_pretty(pg_database_size(current_database())) as database_size
from public.transactions_raw;

select p.object_code, p.object_name, count(*) as generic_descriptions
from public.public_transactions p
where p.is_public
  and p.description_public = p.object_name
  and p.vendor_payee_public <> 'Walton County'
group by p.object_code, p.object_name
order by count(*) desc;

select count(*) as public_rows,
  count(*) filter (where r._public_transaction_id is null) as unmatched_rows,
  count(*) filter (
    where p.amount is distinct from coalesce(r.amount, 0)::numeric(14,2)
  ) as amount_mismatches
from public.public_transactions p
left join public.transactions_raw r
  on r._public_transaction_id = p.raw_transaction_id;
