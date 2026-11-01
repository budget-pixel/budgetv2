-- Read-only audit. Run in the Supabase SQL editor; returns counts and totals,
-- not vendor names or descriptions. Mirrors the current refresh identity hash.
-- If this project still uses raw_transactions, replace transactions_raw below.
with raw_keys as (
  select
    md5(concat_ws('|',
      coalesce(org::text, ''), coalesce(object::text, ''),
      coalesce(project::text, ''), coalesce(year::text, ''),
      coalesce(eff_date::text, ''), coalesce(post_date::text, ''),
      coalesce(journal::text, ''), coalesce(ref1::text, ''),
      coalesce(reference::text, ''), coalesce(amount::text, '')
    )) as raw_transaction_id,
    nullif(regexp_replace(coalesce(year::text, ''), '[^0-9]', '', 'g'), '') as fiscal_year,
    object, amount,
    -- These source fields are omitted from the existing identity hash.
    jsonb_build_array(comments, description, vdr_name_item_desc,
      voucher, warrant, check_no) as omitted_fields
  from public.transactions_raw
), hash_groups as (
  select raw_transaction_id, count(*) as source_rows,
    count(distinct omitted_fields) as distinct_omitted_fields
  from raw_keys
  group by raw_transaction_id
)
select 'Raw source rows' as check_name, count(*)::bigint as row_count from raw_keys
union all
select 'Source rows without year or account', count(*) from raw_keys
where fiscal_year is null or nullif(object::text, '') is null
union all
select 'Source rows with null amount', count(*) from raw_keys where amount is null
union all
select 'Source rows without a public-table match', count(*) from raw_keys r
where not exists (select 1 from public.public_transactions p where p.raw_transaction_id = r.raw_transaction_id)
union all
select 'Extra source rows collapsed by identity hash', coalesce(sum(source_rows - 1), 0)::bigint
from hash_groups where source_rows > 1
union all
select 'Hash groups with different omitted source fields', count(*) from hash_groups
where source_rows > 1 and distinct_omitted_fields > 1
union all
select 'Public rows marked private', count(*) from public.public_transactions where not is_public
union all
select 'Public rows with null descriptions', count(*) from public.public_transactions
where is_public and description_public is null;
