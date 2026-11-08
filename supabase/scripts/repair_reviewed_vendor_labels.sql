-- Reviewed vendor corrections, 2026-11-06. Originals and amounts stay intact.
-- Government-office identity takes precedence over the payroll account label.
-- Contact names are removed before considering a business name for display.
create or replace function public.reviewed_public_vendor_label_v1(source_payee text, existing_label text)
returns text language plpgsql immutable
set search_path = pg_catalog, public
as $$
declare
  normalized text;
  business text;
  reviewed text;
begin
  if existing_label is not null and existing_label not in
      ('Name withheld','Payee withheld pending review','Not available')
      and coalesce(source_payee,'') not ilike '%SHERIFF%' then return existing_label; end if;
  normalized := upper(trim(regexp_replace(coalesce(source_payee,''),'\s+',' ','g')));
  business := trim(regexp_replace(normalized,'\s*\([^()]*,[^()]*\)?\s*$','','g'));
  if business in ('WALTON COUNTY SHERIFF DEPARTMENT','WALTON COUNTY SHERIFF',
      'WALTON COUNTY SHERIFF''S OFFICE','WALTON COUNTY SHERIFFS OFFICE','WALTON COUNTY SHERIFF DEPT') then
    return 'Walton County Sheriff';
  end if;
  if existing_label is not null and existing_label not in
    ('Name withheld','Payee withheld pending review','Not available') then
    return existing_label;
  end if;
  if business='' or business ~ '@|[0-9]{3}-[0-9]{2}-[0-9]{4}|[0-9]{9,}'
      or business ~ '(^|\s)(DBA|D/B/A)(\s|$)' then return existing_label; end if;
  reviewed := case business
    when 'PROPLOGIX' then 'PropLogix'
    when 'PEADEN' then 'Peaden'
    when 'DSLD HOMES (FLORIDA) LLC' then 'DSLD Homes (Florida) LLC'
    when 'REAL RES' then 'Real Res'
    when 'ELITE PROPERTY RESEARCH' then 'Elite Property Research'
    when 'ANDREW PL & ELEC' then 'Andrew PL & Elec'
    when 'D.R. HORTON' then 'D.R. Horton'
    when 'WADE JURNEY HOMES' then 'Wade Jurney Homes'
    when 'LUNSFORD AIR CONDITIONING &' then 'Lunsford Air Conditioning & Heating'
    when 'CENTURY COMPLETE' then 'Century Complete'
    when 'KOOL BREEZE OF NW FL' then 'Kool Breeze of Northwest Florida'
    when 'KOLTER SIGNATURE HOMES' then 'Kolter Signature Homes'
    when 'TFG REPORTS' then 'TFG Reports'
    when 'PANHANDLE PERMITTING' then 'Panhandle Permitting'
    when 'DAVIS-WATKINS FUNERAL HOME' then 'Davis-Watkins Funeral Home'
    when 'BRIDGET''S CATS OF 30A' then 'Bridget''s Cats of 30A'
    else null end;
  if reviewed is not null then return reviewed; end if;
  -- An embedded contact before a legal suffix still requires review.
  if business ~ '[(][^()]*,' then return existing_label; end if;
  -- Explicit legal business suffixes are sufficient organization evidence.
  -- Bare personal names, landlords, and ambiguous payees retain their labels.
  if business ~ '(^|[ ,])(LLC|L[.]L[.]C[.]?|INC[.]?|INCORPORATED|CORP[.]?|CORPORATION|COMPANY|CO[.]?|LTD[.]?)$' then
    return public.to_public_title_case(business);
  end if;
  return existing_label;
end;
$$;

create or replace function public.preserve_reviewed_public_vendor_v1()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.vendor_payee_public := public.reviewed_public_vendor_label_v1(new.vdr_name_item_desc,new.vendor_payee_public);
  return new;
end;
$$;
revoke all on function public.preserve_reviewed_public_vendor_v1() from public, anon, authenticated;
create or replace trigger preserve_reviewed_public_vendor
before insert or update of vdr_name_item_desc,vendor_payee_public
on public.transactions_raw for each row
execute function public.preserve_reviewed_public_vendor_v1();

-- Privacy and precedence regression checks; no source records are written.
do $$
begin
  if exists (
    select 1 from (values
      ('WALTON COUNTY SHERIFF DEPARTMENT','Walton County','Walton County Sheriff'),
      ('PropLogix (Example, Contact)','Payee withheld pending review','PropLogix'),
      ('DSLD HOMES (FLORIDA) LLC (EXAMPLE, CONTACT','Name withheld','DSLD Homes (Florida) LLC'),
      ('ACME LLC (EXAMPLE, CONTACT)','Name withheld','Acme LLC'),
      ('ACME (EXAMPLE, CONTACT) LLC','Name withheld','Name withheld'),
      ('EXAMPLE, PERSON','Name withheld','Name withheld'),
      ('EXAMPLE, PERSON & OTHER','Payee withheld pending review','Payee withheld pending review'),
      ('EXAMPLE, PERSON DBA ACME LLC','Name withheld','Name withheld'),
      ('BAY COUNTY SHERIFF','Bay County Sheriff','Bay County Sheriff'),
      ('','Walton County','Walton County')
    ) c(source,existing,expected)
    where public.reviewed_public_vendor_label_v1(source,existing) is distinct from expected
  ) then raise exception 'Reviewed vendor regression checks failed'; end if;
end;
$$;

-- Preview changes before applying the bounded copy below.
select vendor_payee_public as before,
  public.reviewed_public_vendor_label_v1(vdr_name_item_desc,vendor_payee_public) as after,
  count(*) rows
from public.transactions_raw
where vendor_payee_public is distinct from
  public.reviewed_public_vendor_label_v1(vdr_name_item_desc,vendor_payee_public)
group by 1,2 order by count(*) desc;

-- Repeat this statement until rows_updated = 0. It changes only display text.
with batch as materialized (
  select _public_transaction_id,
    public.reviewed_public_vendor_label_v1(vdr_name_item_desc,vendor_payee_public) label
  from public.transactions_raw
  where vendor_payee_public is distinct from
    public.reviewed_public_vendor_label_v1(vdr_name_item_desc,vendor_payee_public)
  limit 10000
), changed as (
  update public.transactions_raw r set vendor_payee_public=b.label
  from batch b where r._public_transaction_id=b._public_transaction_id
  returning r._public_transaction_id
)
select count(*) rows_updated from changed;

-- Audit baseline: 684066 source rows, sum(amount) = -304590852.30.
-- These labels are read directly by the public view; no second table is made.
-- Refresh keyword-search estimates after all correction batches finish.
analyze public.transactions_raw;
select count(*) raw_rows, sum(amount) amount_total,
  count(*) filter (where vendor_payee_public is distinct from
    public.reviewed_public_vendor_label_v1(vdr_name_item_desc,vendor_payee_public)) remaining_reviewed_corrections,
  count(*) filter (where upper(trim(vdr_name_item_desc))='WALTON COUNTY SHERIFF DEPARTMENT'
    and vendor_payee_public<>'Walton County Sheriff') wrong_sheriff_labels,
  round(pg_database_size(current_database())/1000000000.0,4) database_gb
from public.transactions_raw;
