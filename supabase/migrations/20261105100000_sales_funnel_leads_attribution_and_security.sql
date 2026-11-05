-- Sales funnel: lead management, consent-based drafts, attribution and RLS hardening.
alter table public.sales_leads
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists utm_term text,
  add column if not exists fbclid text,
  add column if not exists landing_path text,
  add column if not exists contacted_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();
create index if not exists sales_leads_created_at_idx on public.sales_leads(created_at desc);
create index if not exists sales_leads_status_idx on public.sales_leads(status);

drop policy if exists "Anyone can read global settings" on public.global_settings;
drop policy if exists "Public can read whitelisted settings" on public.global_settings;
create policy "Public can read whitelisted settings" on public.global_settings
for select to anon, authenticated
using (key = any(array['subscription_price','default_trial_days','owner_whatsapp','landing_pixel_id']));

drop policy if exists "Master admin can read sales leads" on public.sales_leads;
drop policy if exists "Master admin can update sales leads" on public.sales_leads;
create policy "Master admin can read sales leads" on public.sales_leads
for select to authenticated using ((select public.is_master_admin()));
create policy "Master admin can update sales leads" on public.sales_leads
for update to authenticated using ((select public.is_master_admin()))
with check ((select public.is_master_admin()));
grant select, update on public.sales_leads to authenticated;

insert into public.global_settings(key,value) values ('landing_pixel_id','')
on conflict (key) do nothing;
update public.global_settings set value='49.90', updated_at=now() where key='subscription_price';

create table if not exists public.sales_lead_drafts (
 id uuid primary key default gen_random_uuid(),
 capture_token uuid not null unique,
 name text, whatsapp text, business_name text, segment text,
 consent_at timestamptz not null, source text not null default 'landing_page',
 utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
 fbclid text, landing_path text,
 first_seen_at timestamptz not null default now(), last_seen_at timestamptz not null default now(),
 converted_lead_id uuid references public.sales_leads(id) on delete set null
);
alter table public.sales_lead_drafts enable row level security;
drop policy if exists "Master admin can read sales lead drafts" on public.sales_lead_drafts;
create policy "Master admin can read sales lead drafts" on public.sales_lead_drafts
for select to authenticated using ((select public.is_master_admin()));
grant select on public.sales_lead_drafts to authenticated;
create index if not exists sales_lead_drafts_last_seen_idx on public.sales_lead_drafts(last_seen_at desc);

create or replace function public.save_sales_lead_draft(
 p_capture_token uuid, p_name text default null, p_whatsapp text default null,
 p_business_name text default null, p_segment text default null,
 p_utm_source text default null, p_utm_medium text default null,
 p_utm_campaign text default null, p_utm_content text default null,
 p_utm_term text default null, p_fbclid text default null, p_landing_path text default null
) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if p_capture_token is null then raise exception 'Token de captura inválido'; end if;
 if length(coalesce(p_name,''))>120 or length(coalesce(p_whatsapp,''))>20
 or length(coalesce(p_business_name,''))>160 or length(coalesce(p_segment,''))>80 then
 raise exception 'Dados do formulário excedem o limite permitido'; end if;
 insert into public.sales_lead_drafts(capture_token,name,whatsapp,business_name,segment,consent_at,
 utm_source,utm_medium,utm_campaign,utm_content,utm_term,fbclid,landing_path)
 values(p_capture_token,nullif(trim(p_name),''),nullif(regexp_replace(coalesce(p_whatsapp,''),'[^0-9]','','g'),''),
 nullif(trim(p_business_name),''),nullif(trim(p_segment),''),now(),
 left(p_utm_source,200),left(p_utm_medium,200),left(p_utm_campaign,200),left(p_utm_content,200),
 left(p_utm_term,200),left(p_fbclid,300),left(p_landing_path,500))
 on conflict(capture_token) do update set
 name=coalesce(excluded.name,sales_lead_drafts.name),
 whatsapp=coalesce(excluded.whatsapp,sales_lead_drafts.whatsapp),
 business_name=coalesce(excluded.business_name,sales_lead_drafts.business_name),
 segment=coalesce(excluded.segment,sales_lead_drafts.segment),
 utm_source=coalesce(excluded.utm_source,sales_lead_drafts.utm_source),
 utm_medium=coalesce(excluded.utm_medium,sales_lead_drafts.utm_medium),
 utm_campaign=coalesce(excluded.utm_campaign,sales_lead_drafts.utm_campaign),
 utm_content=coalesce(excluded.utm_content,sales_lead_drafts.utm_content),
 utm_term=coalesce(excluded.utm_term,sales_lead_drafts.utm_term),
 fbclid=coalesce(excluded.fbclid,sales_lead_drafts.fbclid),
 landing_path=coalesce(excluded.landing_path,sales_lead_drafts.landing_path),last_seen_at=now();
end; $$;
revoke all on function public.save_sales_lead_draft(uuid,text,text,text,text,text,text,text,text,text,text,text) from public;
grant execute on function public.save_sales_lead_draft(uuid,text,text,text,text,text,text,text,text,text,text,text) to anon,authenticated;

create or replace function public.complete_sales_lead_draft(p_capture_token uuid,p_lead_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if p_capture_token is null or p_lead_id is null then return; end if;
 update public.sales_lead_drafts set converted_lead_id=p_lead_id,last_seen_at=now()
 where capture_token=p_capture_token;
end; $$;
revoke all on function public.complete_sales_lead_draft(uuid,uuid) from public;
grant execute on function public.complete_sales_lead_draft(uuid,uuid) to anon,authenticated;

create table if not exists public.sales_funnel_events(
 id uuid primary key default gen_random_uuid(),
 event_name text not null check(event_name in ('PageView','ViewContent','Lead','Contact','CompleteRegistration')),
 session_id uuid not null,path text,source text not null default 'landing_page',
 utm_source text,utm_medium text,utm_campaign text,utm_content text,utm_term text,fbclid text,
 created_at timestamptz not null default now()
);
create index if not exists sales_funnel_events_created_at_idx on public.sales_funnel_events(created_at desc);
alter table public.sales_funnel_events enable row level security;
drop policy if exists "Master admin can read funnel events" on public.sales_funnel_events;
create policy "Master admin can read funnel events" on public.sales_funnel_events
for select to authenticated using ((select public.is_master_admin()));
grant select on public.sales_funnel_events to authenticated;

create or replace function public.record_sales_funnel_event(
 p_event_name text,p_session_id uuid,p_path text default null,
 p_utm_source text default null,p_utm_medium text default null,p_utm_campaign text default null,
 p_utm_content text default null,p_utm_term text default null,p_fbclid text default null
) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if p_event_name not in ('PageView','ViewContent','Lead','Contact','CompleteRegistration') then
 raise exception 'Evento não permitido'; end if;
 if p_session_id is null then raise exception 'Sessão inválida'; end if;
 insert into public.sales_funnel_events(event_name,session_id,path,utm_source,utm_medium,utm_campaign,utm_content,utm_term,fbclid)
 values(p_event_name,p_session_id,left(p_path,500),left(p_utm_source,200),left(p_utm_medium,200),
 left(p_utm_campaign,200),left(p_utm_content,200),left(p_utm_term,200),left(p_fbclid,300));
end; $$;
revoke all on function public.record_sales_funnel_event(text,uuid,text,text,text,text,text,text,text) from public;
grant execute on function public.record_sales_funnel_event(text,uuid,text,text,text,text,text,text,text) to anon,authenticated;
