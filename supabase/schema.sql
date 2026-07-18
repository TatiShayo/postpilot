-- PostPilot Schema
create extension if not exists "uuid-ossp";

create table profiles (
  id uuid references auth.users primary key,
  username text unique,
  full_name text,
  avatar_url text,
  company_name text,
  subscription_tier text default 'free',
  stripe_customer_id text,
  created_at timestamptz default now()
);

create table subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade,
  stripe_subscription_id text unique,
  stripe_customer_id text,
  plan text,
  status text,
  current_period_end timestamptz,
  created_at timestamptz default now()
);

create table social_accounts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade,
  platform text not null,
  username text,
  display_name text,
  is_connected boolean default false,
  followers_count int default 0,
  created_at timestamptz default now()
);

create table posts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade,
  content text not null,
  media_urls text[],
  platforms text[],
  hashtags text,
  status text default 'draft',
  scheduled_at timestamptz,
  published_at timestamptz,
  ai_generated boolean default false,
  created_at timestamptz default now()
);

create table post_analytics (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references posts(id) on delete cascade,
  platform text,
  likes int default 0,
  comments int default 0,
  shares int default 0,
  impressions int default 0,
  clicks int default 0,
  recorded_at timestamptz default now()
);

create table waitlist (
  id uuid default uuid_generate_v4() primary key,
  email text unique not null,
  signed_up_at timestamptz default now()
);

alter table profiles enable row level security;
alter table social_accounts enable row level security;
alter table posts enable row level security;
alter table subscriptions enable row level security;
alter table post_analytics enable row level security;
alter table waitlist enable row level security;

-- RLS policies
create policy "Users own their data" on profiles for all using (auth.uid() = id);

-- Auto-create profile on signup (was missing — broke all gating)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, subscription_tier)
  values (new.id, 'free');
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
create policy "Users own their data" on social_accounts for all using (auth.uid() = user_id);
create policy "Users own their data" on posts for all using (auth.uid() = user_id);

create policy "Users can view own subscription" on subscriptions for select using (auth.uid() = user_id);
create policy "Users can view analytics of own posts" on post_analytics for select using (
  exists (
    select 1 from posts
    where posts.id = post_analytics.post_id and posts.user_id = auth.uid()
  )
);
create policy "Anyone can join waitlist" on waitlist for insert with check (true);

-- ---------------------------------------------------------------------------
-- Public portfolio read access
-- Published posts are intentionally public (the /u/[username] portfolio page).
-- Drafts/scheduled posts stay private via the owner-only policy above.
create policy "Public can view published posts" on posts
  for select using (status = 'published');

-- Safe, column-limited public view of profiles for the portfolio page.
-- Never exposes stripe_customer_id / subscription_tier. Runs with the view
-- owner's rights so the underlying owner-only RLS on profiles is bypassed for
-- these safe columns only.
create or replace view public.public_profiles
  with (security_invoker = false) as
  select id, username, full_name, avatar_url from public.profiles;

grant select on public.public_profiles to anon, authenticated;

-- ---------------------------------------------------------------------------
-- AI usage metering (denial-of-wallet guard)
-- Per-user, per-month credit counter enforced atomically before any paid
-- OpenAI call. See public.consume_ai_credit below.
create table ai_usage (
  user_id uuid references profiles(id) on delete cascade,
  period text not null,           -- 'YYYY-MM'
  count int not null default 0,
  updated_at timestamptz default now(),
  primary key (user_id, period)
);

alter table ai_usage enable row level security;
create policy "Users can view own AI usage" on ai_usage
  for select using (auth.uid() = user_id);
-- No insert/update policy: only the security-definer RPC mutates this table.

create index if not exists ai_usage_user_idx on ai_usage(user_id);

-- Atomically consume one credit if under the monthly limit. Returns true when a
-- credit was granted, false when the limit is already reached. The conditional
-- ON CONFLICT ... WHERE makes the check-and-increment a single atomic statement,
-- so concurrent requests cannot race past the limit.
create or replace function public.consume_ai_credit(p_limit int)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_period text := to_char(now(), 'YYYY-MM');
  v_count int;
begin
  if auth.uid() is null then
    return false;
  end if;

  insert into ai_usage (user_id, period, count)
    values (auth.uid(), v_period, 1)
  on conflict (user_id, period) do update
    set count = ai_usage.count + 1, updated_at = now()
    where ai_usage.count < p_limit
  returning count into v_count;

  -- Null means the conflicting row existed but the WHERE guard blocked the
  -- update (limit reached).
  return v_count is not null;
end;
$$;

revoke all on function public.consume_ai_credit(int) from public;
grant execute on function public.consume_ai_credit(int) to authenticated;

-- ---------------------------------------------------------------------------
-- Stripe webhook idempotency ledger
-- Every processed event id is recorded; a duplicate insert (unique violation)
-- signals a replay/retry and short-circuits re-provisioning.
create table stripe_events (
  id text primary key,
  type text,
  received_at timestamptz default now()
);

alter table stripe_events enable row level security;
-- No policies: only the service-role admin client (which bypasses RLS) writes here.

-- ---------------------------------------------------------------------------
-- Performance indexes on foreign keys and hot lookup columns
create index if not exists posts_user_idx on posts(user_id);
create index if not exists posts_published_idx on posts(user_id, published_at desc)
  where status = 'published';
create index if not exists social_accounts_user_idx on social_accounts(user_id);
create index if not exists post_analytics_post_idx on post_analytics(post_id);
create index if not exists subscriptions_user_idx on subscriptions(user_id);
create index if not exists profiles_stripe_customer_idx on profiles(stripe_customer_id);
create index if not exists profiles_username_idx on profiles(username);
