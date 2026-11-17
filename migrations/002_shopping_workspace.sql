begin;
create table public.collections (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check(length(trim(name)) between 1 and 60), description text not null default '' check(length(description)<=500),
  budget numeric check(budget >= 0 and budget::text not in ('NaN','Infinity','-Infinity')), currency text not null default 'INR' check(currency ~ '^[A-Z]{3}$'),
  is_public boolean not null default false, share_token uuid unique, created_at timestamptz not null default now()
);
create index collections_owner_idx on public.collections(user_id);
create table public.comparison_groups (
  id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,created_at timestamptz not null default now()
);
alter table public.products add column collection_id uuid references public.collections(id) on delete set null,
  add column comparison_group_id uuid references public.comparison_groups(id) on delete set null,
  add column delivery_cost numeric check(delivery_cost>=0 and delivery_cost::text not in ('NaN','Infinity','-Infinity')),
  add column restock_enabled boolean not null default false;
create index products_collection_idx on public.products(collection_id);
create index products_comparison_idx on public.products(comparison_group_id);
alter table public.catalog_products add column stock_status text not null default 'unknown' check(stock_status in ('unknown','in_stock','out_of_stock')),
  add column shipping_cost numeric check(shipping_cost>=0 and shipping_cost::text not in ('NaN','Infinity','-Infinity')),
  add column price_checked_at timestamptz;
update public.catalog_products set price_checked_at=checked_at;
create table public.catalog_observations (
  id uuid primary key default gen_random_uuid(), catalog_id uuid not null references public.catalog_products(id) on delete cascade,
  price numeric check(price>0 and price::text not in ('NaN','Infinity','-Infinity')), currency text not null,
  stock_status text not null check(stock_status in ('unknown','in_stock','out_of_stock')), shipping_cost numeric,
  checked_at timestamptz not null default now()
);
insert into public.catalog_observations(id,catalog_id,price,currency,stock_status,checked_at)
select id,catalog_id,price,currency,'unknown',checked_at from public.catalog_price_history;
alter table public.alert_events drop constraint alert_events_observation_id_fkey;
alter table public.alert_events add constraint alert_events_observation_id_fkey foreign key(observation_id) references public.catalog_observations(id);
alter table public.alert_events drop constraint alert_events_kind_check;
alter table public.alert_events add constraint alert_events_kind_check check(kind in ('target','drop','restock'));
alter table public.alert_events alter column old_price drop not null, alter column new_price drop not null;
create table public.purchases (
  id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid unique references public.products(id) on delete set null,
  collection_id uuid references public.collections(id) on delete set null,
  product_name text not null, product_url text not null, image_url text, currency text not null,
  paid_price numeric not null check(paid_price>=0 and paid_price::text not in ('NaN','Infinity','-Infinity')),
  quantity integer not null default 1 check(quantity between 1 and 1000), baseline_price numeric,
  purchased_at date not null, tracking_was_paused boolean not null default false, created_at timestamptz not null default now()
);
create index purchases_owner_date_idx on public.purchases(user_id,purchased_at desc);
alter table public.collections enable row level security;
alter table public.comparison_groups enable row level security;
alter table public.purchases enable row level security;
alter table public.catalog_observations enable row level security;
create policy collections_owner_read on public.collections for select to authenticated using(user_id=(select auth.uid()));
create policy collections_owner_insert on public.collections for insert to authenticated with check(user_id=(select auth.uid()));
create policy collections_owner_update on public.collections for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy collections_owner_delete on public.collections for delete to authenticated using(user_id=(select auth.uid()));
create policy comparisons_owner_read on public.comparison_groups for select to authenticated using(user_id=(select auth.uid()));
create policy purchases_owner_read on public.purchases for select to authenticated using(user_id=(select auth.uid()));
create policy observations_member_read on public.catalog_observations for select to authenticated using(exists(select 1 from public.products p where p.catalog_id=catalog_observations.catalog_id and p.user_id=(select auth.uid())));
revoke all on public.collections,public.comparison_groups,public.purchases,public.catalog_observations from anon,authenticated;
grant select,delete on public.collections to authenticated;
grant insert(user_id,name,description,budget,currency) on public.collections to authenticated;
grant update(name,description,budget,currency) on public.collections to authenticated;
grant select on public.comparison_groups,public.purchases,public.catalog_observations to authenticated;
grant all on public.collections,public.comparison_groups,public.purchases,public.catalog_observations to service_role;
grant update(restock_enabled) on public.products to authenticated;
-- Collection currency is stable once items or purchase records are attached.
create function public.protect_collection_currency() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.currency<>old.currency and (exists(select 1 from public.products where collection_id=old.id) or exists(select 1 from public.purchases where collection_id=old.id)) then raise exception 'Remove items before changing collection currency'; end if;
  return new;
end $$;
create trigger collection_currency_guard before update on public.collections for each row execute function public.protect_collection_currency();
revoke all on function public.protect_collection_currency() from public,anon,authenticated;

create function public.assign_collection(p_product uuid,p_collection uuid) returns void language plpgsql security definer set search_path='' as $$
declare w public.products; c public.collections;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select * into w from public.products where id=p_product and user_id=auth.uid() for update;
  if not found then raise exception 'Product not found'; end if;
  if p_collection is not null then
    select * into c from public.collections where id=p_collection and user_id=auth.uid();
    if not found then raise exception 'Collection not found'; end if;
    if c.currency<>w.currency then raise exception 'Collection and product currency must match'; end if;
  end if;
  update public.products set collection_id=p_collection where id=w.id;
  update public.purchases set collection_id=p_collection where product_id=w.id and user_id=auth.uid();
end $$;
create function public.set_collection_sharing(p_collection uuid,p_public boolean) returns uuid language plpgsql security definer set search_path='' as $$
declare token uuid;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  update public.collections set is_public=p_public,share_token=case when p_public then gen_random_uuid() else null end
    where id=p_collection and user_id=auth.uid() returning share_token into token;
  if not found then raise exception 'Collection not found'; end if;
  return token;
end $$;
create function public.public_wishlist(p_token uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare c public.collections; items jsonb;
begin
  select * into c from public.collections where is_public and share_token=p_token;
  if not found then return null; end if;
  select coalesce(jsonb_agg(jsonb_build_object('name',p.name,'url',p.url,'image_url',p.image_url,'price',p.current_price,'currency',p.currency,'stock_status',cat.stock_status,'checked_at',p.updated_at) order by p.created_at),'[]'::jsonb)
    into items from public.products p join public.catalog_products cat on cat.id=p.catalog_id
    where p.collection_id=c.id and p.user_id=c.user_id and not exists(select 1 from public.purchases b where b.product_id=p.id);
  return jsonb_build_object('name',c.name,'description',c.description,'items',items);
end $$;

create function public.record_purchase(p_product uuid,p_price numeric,p_quantity integer,p_date date) returns uuid language plpgsql security definer set search_path='' as $$
declare w public.products; result uuid;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if p_price is null or p_price<0 or p_price>1e9 or p_price::text in ('NaN','Infinity','-Infinity') or p_quantity is null or p_quantity not between 1 and 1000 or p_date is null or p_date>current_date then raise exception 'Invalid purchase details'; end if;
  select * into w from public.products where id=p_product and user_id=auth.uid() for update;
  if not found then raise exception 'Product not found'; end if;
  insert into public.purchases(user_id,product_id,collection_id,product_name,product_url,image_url,currency,paid_price,quantity,baseline_price,purchased_at,tracking_was_paused)
    values(auth.uid(),w.id,w.collection_id,w.name,w.url,w.image_url,w.currency,p_price,p_quantity,w.baseline_price,p_date,w.paused)
    on conflict(product_id) do update set paid_price=excluded.paid_price,quantity=excluded.quantity,purchased_at=excluded.purchased_at returning id into result;
  update public.products set paused=true where id=w.id;
  return result;
end $$;
create function public.remove_purchase(p_purchase uuid) returns void language plpgsql security definer set search_path='' as $$
declare b public.purchases;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select * into b from public.purchases where id=p_purchase and user_id=auth.uid() for update;
  if not found then raise exception 'Purchase not found'; end if;
  delete from public.purchases where id=b.id;
  if b.product_id is not null then update public.products set paused=b.tracking_was_paused where id=b.product_id and user_id=auth.uid(); end if;
end $$;

create function public.link_comparison(p_source uuid,p_offer uuid,p_confirmed boolean,p_delivery numeric) returns uuid language plpgsql security definer set search_path='' as $$
declare s public.products; o public.products; group_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if p_confirmed is not true then raise exception 'Confirm the exact model and variant match'; end if;
  if p_source=p_offer then raise exception 'Choose a different store listing'; end if;
  if p_delivery is not null and (p_delivery<0 or p_delivery>1e9 or p_delivery::text in ('NaN','Infinity','-Infinity')) then raise exception 'Invalid delivery cost'; end if;
  perform 1 from public.products where id in(p_source,p_offer) and user_id=auth.uid() order by id for update;
  select * into s from public.products where id=p_source and user_id=auth.uid();
  if not found then raise exception 'Product not found'; end if;
  select * into o from public.products where id=p_offer and user_id=auth.uid();
  if not found then raise exception 'Offer not found'; end if;
  if s.currency is distinct from o.currency then raise exception 'Offers must use the same currency'; end if;
  group_id:=s.comparison_group_id;
  if group_id is null then insert into public.comparison_groups(user_id,name) values(auth.uid(),s.name) returning id into group_id; end if;
  if o.comparison_group_id is not null and o.comparison_group_id<>group_id then
    update public.products set comparison_group_id=group_id where comparison_group_id=o.comparison_group_id and user_id=auth.uid();
    delete from public.comparison_groups where id=o.comparison_group_id and user_id=auth.uid();
  end if;
  update public.products set comparison_group_id=group_id where id in(s.id,o.id) and user_id=auth.uid();
  update public.products set delivery_cost=p_delivery where id=o.id;
  return group_id;
end $$;
create function public.unlink_comparison(p_product uuid) returns void language plpgsql security definer set search_path='' as $$
declare g uuid;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  update public.products set comparison_group_id=null,delivery_cost=null where id=p_product and user_id=auth.uid() returning comparison_group_id into g;
  if not found then raise exception 'Product not found'; end if;
end $$;

create or replace function public.reset_alert_rule() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if row(new.target_price,new.drop_percent,new.alert_enabled,new.paused,new.restock_enabled) is distinct from row(old.target_price,old.drop_percent,old.alert_enabled,old.paused,old.restock_enabled) then
    new.rule_version:=old.rule_version+1; new.alert_condition:=false;
    update public.alert_events set status='cancelled',error='Alert settings changed' where product_id=old.id and status in('pending','failed');
  end if;
  return new;
end $$;
create function public.complete_catalog_check(p_id uuid,p_token uuid,p_name text,p_price numeric,p_currency text,p_image text,p_stock text,p_shipping numeric)
returns integer language plpgsql set search_path='' as $$
declare c public.catalog_products; w public.products; obs uuid; eligible boolean; event_kind text; changed integer:=0;
begin
  select * into c from public.catalog_products where id=p_id and lease_token=p_token and lease_until>now() for update;
  if not found then raise exception 'Check lease expired'; end if;
  if p_stock is null or p_stock not in('unknown','in_stock','out_of_stock') or p_currency is null or p_currency!~'^[A-Z]{3}$' then raise exception 'Invalid extraction'; end if;
  if p_price is not null and (p_price<=0 or p_price::text in ('NaN','Infinity','-Infinity')) then raise exception 'Invalid price'; end if;
  if p_price is null and p_stock='unknown' then raise exception 'Neither price nor availability could be verified'; end if;
  if p_shipping is not null and (p_shipping<0 or p_shipping::text in ('NaN','Infinity','-Infinity')) then raise exception 'Invalid shipping'; end if;
  if c.currency is not null and c.currency<>p_currency then raise exception 'Currency changed'; end if;
  insert into public.catalog_observations(catalog_id,price,currency,stock_status,shipping_cost) values(p_id,p_price,p_currency,p_stock,p_shipping) returning id into obs;
  if p_price is not null then insert into public.catalog_price_history(id,catalog_id,price,currency) values(obs,p_id,p_price,p_currency); end if;
  update public.catalog_products set name=p_name,current_price=coalesce(p_price,current_price),currency=p_currency,image_url=coalesce(p_image,image_url),stock_status=p_stock,shipping_cost=p_shipping,
    checked_at=now(),price_checked_at=case when p_price is not null then now() else price_checked_at end,next_check_at=now()+interval '1 hour',last_error=null,lease_token=null,lease_until=null where id=p_id;
  for w in select * from public.products where catalog_id=p_id for update loop
    eligible:=not w.paused and w.alert_enabled and p_stock<>'out_of_stock' and p_price is not null and
      ((w.target_price is not null and p_price<=w.target_price) or (w.drop_percent is not null and w.baseline_price>0 and p_price<=w.baseline_price*(1-w.drop_percent/100)));
    event_kind:=null;
    if not w.paused and w.restock_enabled and c.stock_status='out_of_stock' and p_stock='in_stock' then event_kind:='restock';
    elsif eligible and not w.alert_condition then event_kind:=case when w.target_price is not null and p_price<=w.target_price then 'target' else 'drop' end; end if;
    if event_kind is not null then
      insert into public.alert_events(product_id,user_id,observation_id,product_name,product_url,kind,old_price,new_price,currency,target_price,drop_percent,rule_version)
      values(w.id,w.user_id,obs,coalesce(p_name,w.name,'Tracked product'),w.url,event_kind,w.current_price,p_price,p_currency,w.target_price,w.drop_percent,w.rule_version) on conflict do nothing;
    end if;
    update public.products set current_price=coalesce(p_price,current_price),baseline_price=coalesce(baseline_price,p_price),name=p_name,currency=p_currency,image_url=coalesce(p_image,image_url),updated_at=case when p_price is not null then now() else updated_at end,alert_condition=eligible where id=w.id;
  end loop;
  if p_price is not null and c.current_price is distinct from p_price then changed:=1; end if;
  return changed;
end $$;
create or replace function public.complete_catalog_check(p_id uuid,p_token uuid,p_name text,p_price numeric,p_currency text,p_image text)
returns integer language sql set search_path='' as $$ select public.complete_catalog_check(p_id,p_token,p_name,p_price,p_currency,p_image,'unknown',null) $$;
create or replace function public.claim_alert(p_id uuid) returns uuid language plpgsql set search_path='' as $$
declare token uuid:=gen_random_uuid(); claimed uuid;
begin
  update public.alert_events set status='cancelled',error='Delivery retry window expired' where id=p_id and status in('pending','failed','sending') and created_at<now()-interval '23 hours';
  update public.alert_events a set status='sending',lease_token=token,lease_until=now()+interval '5 minutes',attempts=attempts+1
  from public.products p where a.id=p_id and p.id=a.product_id and not p.paused and ((a.kind='restock' and p.restock_enabled) or (a.kind<>'restock' and p.alert_enabled)) and p.rule_version=a.rule_version
    and a.attempts<5 and a.status in('pending','failed','sending') and (a.lease_until is null or a.lease_until<now()) returning a.id into claimed;
  return case when claimed is null then null else token end;
end $$;
create function public.due_catalog_products(p_limit integer) returns table(id uuid,canonical_url text) language sql set search_path='' as $$
  select c.id,c.canonical_url from public.catalog_products c where exists(select 1 from public.products p where p.catalog_id=c.id and not p.paused)
    and (c.checked_at is null or c.checked_at<now()-interval '1 hour') and (c.next_check_at is null or c.next_check_at<=now()) and (c.lease_until is null or c.lease_until<now())
    order by c.checked_at nulls first limit least(greatest(p_limit,1),50)
$$;
revoke all on function public.assign_collection(uuid,uuid),public.set_collection_sharing(uuid,boolean),public.public_wishlist(uuid),public.record_purchase(uuid,numeric,integer,date),public.remove_purchase(uuid),public.link_comparison(uuid,uuid,boolean,numeric),public.unlink_comparison(uuid),public.complete_catalog_check(uuid,uuid,text,numeric,text,text,text,numeric),public.due_catalog_products(integer) from public,anon,authenticated;
grant execute on function public.assign_collection(uuid,uuid),public.set_collection_sharing(uuid,boolean),public.record_purchase(uuid,numeric,integer,date),public.remove_purchase(uuid),public.link_comparison(uuid,uuid,boolean,numeric),public.unlink_comparison(uuid) to authenticated;
grant execute on function public.public_wishlist(uuid) to anon,authenticated;
grant execute on function public.complete_catalog_check(uuid,uuid,text,numeric,text,text,text,numeric),public.due_catalog_products(integer) to service_role;
commit;
