-- Secure customer order tracking: history, delivery contact and ETA.
alter table public.orders
  add column if not exists delivery_person_name text,
  add column if not exists delivery_person_phone text,
  add column if not exists estimated_delivery_at timestamptz;

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  status text not null,
  changed_at timestamptz not null default now(),
  changed_by uuid null references auth.users(id) on delete set null
);

create index if not exists order_status_history_order_changed_idx
  on public.order_status_history(order_id, changed_at);

alter table public.order_status_history enable row level security;
revoke all on public.order_status_history from anon, authenticated;
grant select, insert, delete on public.order_status_history to postgres, service_role;

create or replace function public.capture_order_status_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_history(order_id, store_id, status, changed_by)
    values (new.id, new.store_id, coalesce(new.status, 'pending'), auth.uid());
  elsif new.status is distinct from old.status then
    insert into public.order_status_history(order_id, store_id, status, changed_by)
    values (new.id, new.store_id, coalesce(new.status, 'pending'), auth.uid());
  end if;
  return new;
end;
$$;
revoke all on function public.capture_order_status_history() from public, anon, authenticated;

drop trigger if exists trg_capture_order_status_history on public.orders;
create trigger trg_capture_order_status_history
after insert or update of status on public.orders
for each row execute function public.capture_order_status_history();

insert into public.order_status_history(order_id, store_id, status, changed_at)
select o.id, o.store_id, coalesce(o.status, 'pending'), coalesce(o.created_at, now())
from public.orders o
where not exists (
  select 1 from public.order_status_history h where h.order_id = o.id
);

drop function if exists public.get_order_details(uuid, text);
create function public.get_order_details(order_id_param uuid, session_token_param text)
returns table(
  id uuid, status text, total numeric, items jsonb, payment_method text,
  created_at timestamptz, store_name text, delivery_person_name text,
  delivery_person_phone text, estimated_delivery_at timestamptz, status_history jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if order_id_param is null or session_token_param is null or trim(session_token_param) = '' then
    return;
  end if;
  return query
  select o.id, o.status, o.total, o.items, o.payment_method, o.created_at,
    s.name, o.delivery_person_name, o.delivery_person_phone, o.estimated_delivery_at,
    coalesce((
      select jsonb_agg(jsonb_build_object('status', h.status, 'changed_at', h.changed_at) order by h.changed_at asc)
      from public.order_status_history h
      where h.order_id = o.id and h.store_id = o.store_id
    ), '[]'::jsonb)
  from public.orders o
  join public.stores s on s.id = o.store_id
  where o.id = order_id_param and o.customer_session_token = session_token_param;
end;
$$;
revoke all on function public.get_order_details(uuid, text) from public;
grant execute on function public.get_order_details(uuid, text) to anon, authenticated;
