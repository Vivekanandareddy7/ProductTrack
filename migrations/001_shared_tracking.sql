-- Run once with a database owner. Transactional; preserves legacy price history.
begin;
create table public.catalog_products (
  id uuid primary key default gen_random_uuid(), canonical_url text not null unique,
  name text, current_price numeric check (current_price > 0), currency text, image_url text,
  checked_at timestamptz, next_check_at timestamptz, last_error text, lease_token uuid, lease_until timestamptz,
  created_at timestamptz not null default now()
);
create table public.catalog_price_history (
  id uuid primary key default gen_random_uuid(), catalog_id uuid not null references public.catalog_products(id) on delete cascade,
  price numeric not null check (price > 0), currency text not null, checked_at timestamptz not null default now()
);
create index catalog_history_time_idx on public.catalog_price_history(catalog_id, checked_at);
alter table public.products
  add column catalog_id uuid references public.catalog_products(id),
  add column baseline_price numeric,
  add column target_price numeric check (target_price > 0),
  add column drop_percent numeric check (drop_percent > 0 and drop_percent < 100),
  add column alert_enabled boolean not null default false,
  add column paused boolean not null default false,
  add column alert_condition boolean not null default false,
  add column rule_version integer not null default 1;

-- JS URL canonicalization is used for future writes. This helper normalizes existing rows.
create function public.migration_canonical_url(input text) returns text language plpgsql immutable set search_path = '' as $$
declare clean text; host text; path text; query text; asin text; pair text; kept text[] := '{}';
begin
  clean := split_part(input, '#', 1);
  host := lower(regexp_replace(split_part(split_part(clean, '://', 2), '/', 1), '^www\.', ''));
  host := split_part(host, '?', 1);
  path := regexp_replace(split_part(regexp_replace(clean, '^https?://[^/]+', ''), '?', 1), '/+$', '');
  if path = '' then path := '/'; end if;
  query := case when position('?' in clean) > 0 then split_part(clean, '?', 2) else '' end;
  if host ~ '(^|\.)amazon\.' then
    asin := substring(path from '/(?:dp|gp/product)/([A-Za-z0-9]{10})(?:/|$)');
    if asin is not null then path := '/dp/' || upper(asin); end if;
  end if;
  foreach pair in array string_to_array(query, '&') loop
    if (host ~ '(^|\.)amazon\.' and split_part(pair, '=', 1) in ('psc','th'))
       or (host = 'flipkart.com' and split_part(pair, '=', 1) = 'pid') then kept := array_append(kept, pair); end if;
  end loop;
  select coalesce(array_agg(v order by v), '{}') into kept from unnest(kept) v;
  return 'https://' || host || path || case when cardinality(kept) > 0 then '?' || array_to_string(kept, '&') else '' end;
end $$;
insert into public.catalog_products(canonical_url, name, current_price, currency, image_url, checked_at)
select distinct on (public.migration_canonical_url(url)) public.migration_canonical_url(url), name,
  case when current_price > 0 then current_price else null end, coalesce(currency, 'INR'), image_url, updated_at
from public.products order by public.migration_canonical_url(url), updated_at desc nulls last;
update public.products p set catalog_id = c.id,
  baseline_price = coalesce((select h.price from public.price_history h where h.product_id = p.id and h.price > 0 order by h.checked_at limit 1), p.current_price)
from public.catalog_products c where c.canonical_url = public.migration_canonical_url(p.url);
insert into public.catalog_price_history(catalog_id, price, currency, checked_at)
select distinct p.catalog_id, h.price, coalesce(h.currency, p.currency, 'INR'), h.checked_at
from public.price_history h join public.products p on p.id = h.product_id where h.price > 0;
insert into public.catalog_price_history(catalog_id, price, currency, checked_at)
select c.id, c.current_price, coalesce(c.currency, 'INR'), coalesce(c.checked_at, now()) from public.catalog_products c
where c.current_price > 0 and not exists (select 1 from public.catalog_price_history h where h.catalog_id = c.id);
-- Consolidate only duplicate trackers belonging to the same user; retain their old observations.
create temporary table tracker_duplicates on commit drop as
select id, first_value(id) over (partition by user_id, catalog_id order by created_at nulls last, id) keeper from public.products;
update public.price_history h set product_id = d.keeper from tracker_duplicates d where h.product_id = d.id and d.id <> d.keeper;
delete from public.products p using tracker_duplicates d where p.id = d.id and d.id <> d.keeper;
update public.products p set url = c.canonical_url from public.catalog_products c where c.id = p.catalog_id;
alter table public.products alter column catalog_id set not null;
alter table public.products add constraint products_user_catalog_key unique(user_id, catalog_id);
create index products_catalog_idx on public.products(catalog_id);
drop function public.migration_canonical_url(text);
-- Make removing a tracker cleanly remove its private legacy observations.
do $$ declare r record; begin
  for r in select conname from pg_constraint where conrelid = 'public.price_history'::regclass and contype = 'f' and confrelid = 'public.products'::regclass loop
    execute format('alter table public.price_history drop constraint %I', r.conname);
  end loop;
end $$;
alter table public.price_history add constraint price_history_product_id_fkey foreign key(product_id) references public.products(id) on delete cascade;

create table public.alert_events (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  observation_id uuid not null references public.catalog_price_history(id),
  product_name text not null, product_url text not null, kind text not null check (kind in ('target', 'drop')),
  old_price numeric not null, new_price numeric not null, currency text not null, target_price numeric, drop_percent numeric,
  rule_version integer not null, status text not null default 'pending' check(status in ('pending','sending','sent','failed','cancelled')),
  error text, attempts integer not null default 0, lease_token uuid, lease_until timestamptz,
  created_at timestamptz not null default now(), sent_at timestamptz,
  constraint alert_observation_rule_key unique(product_id, observation_id, rule_version)
);
create index alert_user_time_idx on public.alert_events(user_id, created_at desc);

-- Replace earlier permissive policies. Watchlists and alerts remain private.
do $$ declare r record; begin
  for r in select tablename, policyname from pg_policies where schemaname = 'public' and tablename in ('products','price_history') loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;
alter table public.products enable row level security;
alter table public.price_history enable row level security;
alter table public.catalog_products enable row level security;
alter table public.catalog_price_history enable row level security;
alter table public.alert_events enable row level security;
create policy products_owner_select on public.products for select to authenticated using(user_id = (select auth.uid()));
create policy products_owner_update on public.products for update to authenticated using(user_id = (select auth.uid())) with check(user_id = (select auth.uid()));
create policy products_owner_delete on public.products for delete to authenticated using(user_id = (select auth.uid()));
create policy legacy_history_owner on public.price_history for select to authenticated using(exists(select 1 from public.products p where p.id = product_id and p.user_id = (select auth.uid())));
create policy catalog_member on public.catalog_products for select to authenticated using(exists(select 1 from public.products p where p.catalog_id = catalog_products.id and p.user_id = (select auth.uid())));
create policy catalog_history_member on public.catalog_price_history for select to authenticated using(exists(select 1 from public.products p where p.catalog_id = catalog_price_history.catalog_id and p.user_id = (select auth.uid())));
create policy alerts_owner on public.alert_events for select to authenticated using(user_id = (select auth.uid()));
revoke all on public.products, public.price_history, public.catalog_products, public.catalog_price_history, public.alert_events from anon, authenticated;
grant select, delete on public.products to authenticated;
grant update(target_price, drop_percent, alert_enabled, paused) on public.products to authenticated;
grant select on public.price_history, public.catalog_products, public.catalog_price_history, public.alert_events to authenticated;
grant all on public.products, public.price_history, public.catalog_products, public.catalog_price_history, public.alert_events to service_role;

create function public.reset_alert_rule() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if row(new.target_price, new.drop_percent, new.alert_enabled, new.paused) is distinct from row(old.target_price, old.drop_percent, old.alert_enabled, old.paused) then
    new.rule_version := old.rule_version + 1;
    new.alert_condition := false;
    update public.alert_events set status = 'cancelled', error = 'Alert settings changed' where product_id = old.id and status in ('pending','failed');
  end if;
  return new;
end $$;
create trigger products_reset_alert before update on public.products for each row execute function public.reset_alert_rule();
revoke all on function public.reset_alert_rule() from public, anon, authenticated;

-- A database lease prevents simultaneous jobs/add requests from scraping the same URL.
create function public.claim_catalog_check(p_id uuid) returns uuid language plpgsql set search_path = '' as $$
declare token uuid := gen_random_uuid(); claimed uuid;
begin
  update public.catalog_products set lease_token = token, lease_until = now() + interval '5 minutes'
  where id = p_id and (lease_until is null or lease_until < now())
    and (next_check_at is null or next_check_at <= now())
    and (checked_at is null or checked_at < now() - interval '1 hour') returning id into claimed;
  if claimed is null then return null; end if;
  return token;
end $$;

-- Observation, current prices, eligibility state and outbox are committed together.
create function public.complete_catalog_check(p_id uuid, p_token uuid, p_name text, p_price numeric, p_currency text, p_image text)
returns integer language plpgsql set search_path = '' as $$
declare c public.catalog_products; w public.products; obs uuid; eligible boolean; kind text; changes integer := 0;
begin
  select * into c from public.catalog_products where id = p_id and lease_token = p_token and lease_until > now() for update;
  if not found then raise exception 'Check lease expired'; end if;
  if p_price is null or p_price <= 0 or p_price::text in ('NaN','Infinity','-Infinity') or p_currency !~ '^[A-Z]{3}$' then raise exception 'Invalid extracted price/currency'; end if;
  if c.currency is not null and c.currency <> p_currency then raise exception 'Currency changed; refusing to mix price history'; end if;
  insert into public.catalog_price_history(catalog_id,price,currency) values(p_id,p_price,p_currency) returning id into obs;
  update public.catalog_products set name = p_name, current_price = p_price, currency = p_currency, image_url = coalesce(p_image, image_url), checked_at = now(), next_check_at = now() + interval '1 hour', last_error = null, lease_token = null, lease_until = null where id = p_id;
  for w in select * from public.products where catalog_id = p_id for update loop
    eligible := not w.paused and w.alert_enabled and
      ((w.target_price is not null and p_price <= w.target_price) or
       (w.drop_percent is not null and w.baseline_price > 0 and p_price <= w.baseline_price * (1 - w.drop_percent / 100)));
    if eligible and not w.alert_condition then
      kind := case when w.target_price is not null and p_price <= w.target_price then 'target' else 'drop' end;
      insert into public.alert_events(product_id,user_id,observation_id,product_name,product_url,kind,old_price,new_price,currency,target_price,drop_percent,rule_version)
      values(w.id,w.user_id,obs,coalesce(p_name,w.name,'Tracked product'),w.url,kind,coalesce(w.current_price,p_price),p_price,p_currency,w.target_price,w.drop_percent,w.rule_version)
      on conflict do nothing;
    end if;
    update public.products set current_price = p_price, name = p_name, currency = p_currency, image_url = coalesce(p_image,image_url), updated_at = now(), alert_condition = eligible where id = w.id;
  end loop;
  if c.current_price is distinct from p_price then changes := 1; end if;
  return changes;
end $$;

create function public.claim_alert(p_id uuid) returns uuid language plpgsql set search_path = '' as $$
declare token uuid := gen_random_uuid(); claimed uuid;
begin
  -- Avoid replaying ambiguous deliveries beyond the provider's 24-hour deduplication window.
  update public.alert_events set status = 'cancelled', error = 'Delivery retry window expired'
    where id = p_id and status in ('pending','failed','sending') and created_at < now() - interval '23 hours';
  update public.alert_events a set status = 'sending', lease_token = token, lease_until = now() + interval '5 minutes', attempts = attempts + 1
  from public.products p where a.id = p_id and p.id = a.product_id and not p.paused and p.alert_enabled and p.rule_version = a.rule_version
    and a.attempts < 5 and a.status in ('pending','failed','sending') and (a.lease_until is null or a.lease_until < now()) returning a.id into claimed;
  if claimed is null then return null; end if;
  return token;
end $$;
revoke all on function public.claim_catalog_check(uuid), public.complete_catalog_check(uuid,uuid,text,numeric,text,text), public.claim_alert(uuid) from public, anon, authenticated;
grant execute on function public.claim_catalog_check(uuid), public.complete_catalog_check(uuid,uuid,text,numeric,text,text), public.claim_alert(uuid) to service_role;
commit;
