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

create policy "Users own their data" on profiles for all using (auth.uid() = id);
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
