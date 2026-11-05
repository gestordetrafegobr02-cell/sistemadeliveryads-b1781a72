create table if not exists public.sales_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  whatsapp text not null check (char_length(regexp_replace(whatsapp, '[^0-9]', '', 'g')) between 10 and 15),
  business_name text not null check (char_length(btrim(business_name)) between 2 and 160),
  segment text not null check (char_length(btrim(segment)) between 2 and 80),
  source text not null default 'landing_page' check (source = 'landing_page'),
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'onboarding', 'converted', 'lost')),
  created_at timestamptz not null default now()
);

alter table public.sales_leads enable row level security;
revoke all on table public.sales_leads from anon, authenticated;
grant insert on table public.sales_leads to anon, authenticated;

create policy "Public can submit sales leads" on public.sales_leads
  for insert to anon, authenticated
  with check (
    char_length(btrim(name)) between 2 and 120
    and char_length(regexp_replace(whatsapp, '[^0-9]', '', 'g')) between 10 and 15
    and char_length(btrim(business_name)) between 2 and 160
    and char_length(btrim(segment)) between 2 and 80
    and source = 'landing_page'
    and status = 'new'
  );

create index if not exists sales_leads_created_at_idx on public.sales_leads (created_at desc);
