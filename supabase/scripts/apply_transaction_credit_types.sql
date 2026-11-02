-- Apply to the existing raw-backed search. No transaction data is changed.
begin;
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
do $patch$
declare definition text; updated text; first_pos integer; last_pos integer;
begin
  definition := pg_get_viewdef('public.transaction_search_public'::regclass,true);
  updated := regexp_replace(definition,'NULL::text AS category',
    'public.transaction_public_kind(transactions_raw.object,transactions_raw.amount) AS category','i');
  if updated=definition and strpos(definition,'transaction_public_kind')=0 then
    raise exception 'Unexpected public view definition; no changes applied';
  end if;
  execute 'create or replace view public.transaction_search_public with(security_barrier=true) as '||updated;

  definition := pg_get_functiondef('public.search_public_transactions(jsonb,integer,integer)'::regprocedure);
  updated := regexp_replace(definition,
    'r\.project::text\s*,\s*null::text\s*,\s*null::text\s*,\s*r\.object::text',
    'r.project::text,null::text,public.transaction_public_kind(r.object,r.amount),r.object::text','i');
  if updated=definition and strpos(definition,'transaction_public_kind')=0 then
    raise exception 'Unexpected public search projection; no changes applied';
  end if;
  definition := updated;
  first_pos := strpos(definition,'if kind=');
  last_pos := strpos(definition,'if nullif(_filters->>''dateFrom''');
  if first_pos>0 and last_pos>first_pos then
    definition := substr(definition,1,first_pos-1)||$filters$
      if kind='expense' then query:=query||' and left(trim(r.object),1)=''5'' and r.amount>0';
  elsif kind='expense_credit' then query:=query||' and (left(trim(r.object),1)=''5'' or trim(r.object)=''369300'') and r.amount<0';
  elsif kind='revenue' then query:=query||' and left(trim(r.object),1)=''3'' and trim(r.object)<>''369300'' and r.amount<0';
  elsif kind='revenue_refund' then query:=query||' and left(trim(r.object),1)=''3'' and trim(r.object)<>''369300'' and r.amount>0';
  elsif kind='adjustment' then query:=query||' and (r.amount=0 or left(trim(r.object),1) not in (''3'',''5'') or (trim(r.object)=''369300'' and r.amount>0))';
  end if;
      if nullif(_filters->>'amountMin','') is not null then
        query:=query||format(' and abs(r.amount)>=%L::numeric',abs((_filters->>'amountMin')::numeric));
      end if;
      if nullif(_filters->>'amountMax','') is not null then
        query:=query||format(' and abs(r.amount)<=%L::numeric',abs((_filters->>'amountMax')::numeric));
      end if;
    $filters$||substr(definition,last_pos);
  elsif strpos(definition,'if kind in')=0 then
    raise exception 'Unexpected public search filters; no changes applied';
  end if;
  if strpos(definition,'offset 0) r')=0 then
    updated := regexp_replace(definition,'query\s*:=\s*query\s*\|\|\s*case sorting',
      $keyword$if keyword is not null and kind='expense_credit' then
        query:=substr(query,1,strpos(query,'from public.transactions_raw r')-1)
          ||'from (select * '||substr(query,strpos(query,'from public.transactions_raw r'))||' offset 0) r';
      end if;
      query:=query||case sorting$keyword$);
    if updated=definition then raise exception 'Unexpected sorting clause; no changes applied'; end if;
    definition:=updated;
  end if;
  definition:=replace(definition,'if keyword is not null then query:=substr','if keyword is not null and kind=''expense_credit'' then query:=substr');
  execute definition;
end;
$patch$;
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
notify pgrst,'reload schema';
commit;
