-- Run once in the Supabase SQL Editor as the database owner.
-- Reads the raw source directly: no copied table, hash, grouping or deduplication.
-- Only the named, cleaned display fields below are exposed to the public website.
-- Includes the bounded read-only search function used by the site.
begin;
-- Absolute source dates only, with a fixed date format, so the date expression
-- can be indexed without storing another copy of the transaction rows.
create or replace function public.transaction_search_date(effective text, posted text)
returns date language plpgsql immutable parallel safe
set datestyle = 'ISO, MDY'
as $$
declare value text;
begin
  foreach value in array array[nullif(trim(effective), ''), nullif(trim(posted), '')]
  loop
    if value ~ '^([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{1,2}/[0-9]{1,2}/[0-9]{4})([ T][0-9:.+-]+Z?)?$' then
      begin
        return value::date;
      exception when invalid_datetime_format or datetime_field_overflow then
        null;
      end;
    end if;
  end loop;
  return null;
end;
$$;
-- Account family and direction jointly identify public transaction types.
-- Negative expenditure postings reduce costs; they are not revenue receipts.
create or replace function public.transaction_public_kind(account text, amount numeric)
returns text language sql immutable parallel safe
set search_path = pg_catalog
as $$
  select case
    when trim(account)='369300' and amount<0 then 'expense_credit'
    when trim(account)='369300' then 'adjustment'
    when left(trim(account),1)='5' and amount>0 then 'expense'
    when left(trim(account),1)='5' and amount<0 then 'expense_credit'
    when left(trim(account),1)='3' and amount<0 then 'revenue'
    when left(trim(account),1)='3' and amount>0 then 'revenue_refund'
    else 'adjustment'
  end
$$;
create or replace view public.transaction_search_public
with (security_barrier = true) as
select
  year as fiscal_year,
  public.transaction_search_date(eff_date, post_date) as transaction_date,
  nullif(substr(org::text, 1, 3), '') as fund_code,
  null::text as fund_name,
  org::text as department_code,
  null::text as department_name,
  project::text as program_code,
  null::text as program_name,
  public.transaction_public_kind(object, amount) as category,
  object::text as object_code,
  nullif(trim(description::text), '') as object_name,
  vendor_payee_public,
  description_public,
  -- Only payee/description were preserved from the reviewed public table.
  -- Do not publish unreviewed raw references as a replacement document field.
  null::text as document_number_public,
  amount::numeric as amount,
  true as is_public
from public.transactions_raw
where vendor_payee_public is not null
  and description_public is not null
  and year is not null
  and object is not null
  and amount is not null
  and upper(trim(coalesce(src, ''))) <> 'BUC'
  and coalesce(comments, '') !~* '^\s*ORIGINAL BUDGET';
create index if not exists transactions_raw_public_date_idx
  on public.transactions_raw (public.transaction_search_date(eff_date, post_date))
  where vendor_payee_public is not null and description_public is not null
    and year is not null and object is not null and amount is not null
    and upper(trim(coalesce(src, ''))) <> 'BUC'
    and coalesce(comments, '') !~* '^\s*ORIGINAL BUDGET';
-- View-owner access is intentional: anonymous users receive view-only access,
-- not SELECT privileges on the underlying raw table or its other columns.
revoke all on public.transaction_search_public from public, anon, authenticated;
grant select on public.transaction_search_public to anon, authenticated;
comment on view public.transaction_search_public is
  'Reviewed public payees/descriptions read from transactions_raw without copying or deduplication. Excludes budget allocations, blank/invalid rows and rows awaiting cleaned text. Original vendor/comments/references remain private.';
create or replace function public.search_public_transactions(
  _filters jsonb default '{}'::jsonb, _offset integer default 0, _limit integer default 50
) returns setof public.transaction_search_public
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
declare
  query text;
  codes text[];
  keyword text := nullif(trim(_filters->>'keyword'), '');
  kind text := _filters->>'kind';
  sorting text := coalesce(_filters->>'sort', 'date_desc');
begin
  query := $q$
    select r.year, public.transaction_search_date(r.eff_date,r.post_date),
      nullif(substr(r.org::text,1,3),''),null::text,r.org::text,null::text,
      r.project::text,null::text,public.transaction_public_kind(r.object,r.amount),r.object::text,
      nullif(trim(r.description::text),''),r.vendor_payee_public,
      r.description_public,null::text,r.amount::numeric,true
    from public.transactions_raw r
    where r.vendor_payee_public is not null and r.description_public is not null
      and r.year is not null and r.object is not null and r.amount is not null
      and upper(trim(coalesce(r.src,''))) <> 'BUC'
      and coalesce(r.comments,'') !~* '^\s*ORIGINAL BUDGET'
  $q$;
  if keyword is not null then
    query := query || format(' and (r.vendor_payee_public ilike %L or r.description_public ilike %L)', '%'||keyword||'%', '%'||keyword||'%');
  end if;
  if nullif(_filters->>'year','') is not null then
    query := query || format(' and r.year=%L::integer',_filters->>'year');
  end if;
  if kind='expense' then query:=query||' and left(trim(r.object),1)=''5'' and r.amount>0';
  elsif kind='expense_credit' then query:=query||' and (left(trim(r.object),1)=''5'' or trim(r.object)=''369300'') and r.amount<0';
  elsif kind='revenue' then query:=query||' and left(trim(r.object),1)=''3'' and trim(r.object)<>''369300'' and r.amount<0';
  elsif kind='revenue_refund' then query:=query||' and left(trim(r.object),1)=''3'' and trim(r.object)<>''369300'' and r.amount>0';
  elsif kind='adjustment' then query:=query||' and (r.amount=0 or left(trim(r.object),1) not in (''3'',''5'') or (trim(r.object)=''369300'' and r.amount>0))';
  end if;
  if nullif(_filters->>'amountMin','') is not null then
    query := query || format(' and abs(r.amount)>=%L::numeric',abs((_filters->>'amountMin')::numeric));
  end if;
  if nullif(_filters->>'amountMax','') is not null then
    query := query || format(' and abs(r.amount)<=%L::numeric',abs((_filters->>'amountMax')::numeric));
  end if;
  if nullif(_filters->>'dateFrom','') is not null then
    query := query || format(' and public.transaction_search_date(r.eff_date,r.post_date)>=%L::date',_filters->>'dateFrom');
  end if;
  if nullif(_filters->>'dateTo','') is not null then
    query := query || format(' and public.transaction_search_date(r.eff_date,r.post_date)<=%L::date',_filters->>'dateTo');
  end if;
  if jsonb_typeof(_filters->'departmentCodes')='array' then
    select array_agg(value) into codes from jsonb_array_elements_text(_filters->'departmentCodes');
    if cardinality(codes)>0 then query := query || format(' and r.org=any(%L::text[])',codes); end if;
  end if;
  if nullif(_filters->>'accountCode','') is not null then
    codes := regexp_split_to_array(_filters->>'accountCode','\s*,\s*');
    query := query || format(' and r.object=any(%L::text[])',codes);
  end if;
  -- Credit keyword searches finish matching with the targeted keyword index
  -- before sorting. Broad searches retain the main date-index path.
  if keyword is not null and kind='expense_credit' then
    query := substr(query,1,strpos(query,'from public.transactions_raw r')-1)
      ||'from (select * '||substr(query,strpos(query,'from public.transactions_raw r'))||' offset 0) r';
  end if;
  query := query || case sorting
    when 'date_asc' then ' order by public.transaction_search_date(r.eff_date,r.post_date) asc, r._public_transaction_id asc'
    when 'vendor_asc' then ' order by r.vendor_payee_public asc, r._public_transaction_id asc'
    else ' order by public.transaction_search_date(r.eff_date,r.post_date) desc, r._public_transaction_id desc' end;
  query := query || format(' limit %s offset %s',least(greatest(coalesce(_limit,50),1),1000),greatest(coalesce(_offset,0),0));
  return query execute query;
end;
$$;
revoke all on function public.search_public_transactions(jsonb,integer,integer) from public;
grant execute on function public.search_public_transactions(jsonb,integer,integer) to anon, authenticated;

create index if not exists transactions_raw_expense_credit_date_idx
  on public.transactions_raw (public.transaction_search_date(eff_date,post_date))
  where vendor_payee_public is not null and description_public is not null
    and year is not null and object is not null and amount is not null
    and upper(trim(coalesce(src,''))) <> 'BUC'
    and coalesce(comments,'') !~* '^\s*ORIGINAL BUDGET'
    and left(trim(object),1)='5' and amount<0;
create extension if not exists pg_trgm with schema extensions;
do $credit_index$
declare operator_schema text;
begin
  select n.nspname into operator_schema
  from pg_opclass c join pg_namespace n on n.oid=c.opcnamespace
  where c.opcname='gin_trgm_ops' limit 1;
  execute format($index_sql$
    create index if not exists transactions_raw_expense_credit_keyword_idx
    on public.transactions_raw using gin
      (vendor_payee_public %1$I.gin_trgm_ops, description_public %1$I.gin_trgm_ops)
    where vendor_payee_public is not null and description_public is not null
      and year is not null and object is not null and amount is not null
      and upper(trim(coalesce(src,''))) <> 'BUC'
      and coalesce(comments,'') !~* '^\s*ORIGINAL BUDGET'
      and (left(trim(object),1)='5' or trim(object)='369300') and amount<0
  $index_sql$,operator_schema);
end;
$credit_index$;
create statistics if not exists public.transactions_raw_account_family_stats
  on (left(trim(object),1)) from public.transactions_raw;
analyze public.transactions_raw;
notify pgrst, 'reload schema';
commit;

-- Verify every eligible source row is preserved, including identical rows.
select (select count(*) from public.transactions_raw) as raw_rows,
       (select count(*) from public.transactions_raw
        where vendor_payee_public is not null and description_public is not null
          and year is not null and object is not null and amount is not null
          and upper(trim(coalesce(src, ''))) <> 'BUC'
          and coalesce(comments, '') !~* '^\s*ORIGINAL BUDGET') as eligible_rows,
       (select count(*) from public.transaction_search_public) as searchable_rows;
