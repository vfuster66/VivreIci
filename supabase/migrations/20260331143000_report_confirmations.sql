create table if not exists public.report_confirmations (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (report_id, user_id)
);

alter table public.report_confirmations enable row level security;

drop policy if exists "report confirmations are viewable by everyone"
on public.report_confirmations;

create policy "report confirmations are viewable by everyone"
on public.report_confirmations
for select
using (true);

drop policy if exists "report confirmations can be inserted by owner"
on public.report_confirmations;

create policy "report confirmations can be inserted by owner"
on public.report_confirmations
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "report confirmations can be deleted by owner or superadmin"
on public.report_confirmations;

create policy "report confirmations can be deleted by owner or superadmin"
on public.report_confirmations
for delete
to authenticated
using (
  auth.uid() = user_id
  or public.is_superadmin(auth.uid())
);
