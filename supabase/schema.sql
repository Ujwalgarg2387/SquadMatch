-- ============================================================
-- SquadMatch DB Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- for text search

-- ============================================================
-- ENUMS
-- ============================================================

create type game_name as enum (
  'bgmi', 'pubg_mobile', 'free_fire', 'valorant', 'cs2',
  'apex_legends', 'cod_mobile', 'minecraft', 'gta_online', 'other'
);

create type connection_intent as enum ('squad', 'bff', 'bromance', 'lover');

create type gender_type as enum ('male', 'female', 'other', 'prefer_not_to_say');

create type match_action as enum ('like', 'pass', 'superlike');

create type message_status as enum ('sent', 'delivered', 'read');

create type subscription_tier as enum ('free', 'pro');

-- ============================================================
-- PROFILES TABLE
-- ============================================================

create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  username        text unique not null,
  display_name    text not null,
  avatar_url      text,
  bio             text check (char_length(bio) <= 300),
  age             smallint check (age >= 13 and age <= 60),
  gender          gender_type,
  region          text not null default 'india',        -- city or state
  language        text[] not null default array['hindi','english'],
  connection_intent connection_intent not null default 'squad',
  is_online       boolean not null default false,
  last_seen       timestamptz,
  subscription    subscription_tier not null default 'free',
  subscription_expires_at timestamptz,
  swipes_used_today smallint not null default 0,
  swipes_reset_at timestamptz not null default now(),
  is_verified     boolean not null default false,
  is_banned       boolean not null default false,
  profile_complete boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- GAMING PROFILES (one per game per user)
-- ============================================================

create table gaming_profiles (
  id          uuid primary key default uuid_generate_v4(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  game        game_name not null,
  game_id     text,              -- in-game username/ID
  rank        text,              -- e.g. "Diamond", "Radiant", "Gold"
  rank_tier   smallint,          -- numeric for sorting: 1=Bronze ... 8=Radiant
  role        text,              -- e.g. "Fragger", "IGL", "Support", "Sniper"
  playtime_hours int,
  peak_rank   text,
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now(),
  unique(profile_id, game)
);

-- ============================================================
-- SWIPES / MATCH ACTIONS
-- ============================================================

create table swipes (
  id          uuid primary key default uuid_generate_v4(),
  from_user   uuid not null references profiles(id) on delete cascade,
  to_user     uuid not null references profiles(id) on delete cascade,
  action      match_action not null,
  created_at  timestamptz not null default now(),
  unique(from_user, to_user)
);

-- ============================================================
-- MATCHES (mutual likes)
-- ============================================================

create table matches (
  id          uuid primary key default uuid_generate_v4(),
  user_a      uuid not null references profiles(id) on delete cascade,
  user_b      uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  -- ensure user_a < user_b to prevent duplicates
  check (user_a < user_b),
  unique(user_a, user_b)
);

-- ============================================================
-- MESSAGES
-- ============================================================

create table messages (
  id          uuid primary key default uuid_generate_v4(),
  match_id    uuid not null references matches(id) on delete cascade,
  sender_id   uuid not null references profiles(id) on delete cascade,
  content     text not null check (char_length(content) <= 2000),
  status      message_status not null default 'sent',
  created_at  timestamptz not null default now()
);

-- ============================================================
-- BLOCKS / REPORTS
-- ============================================================

create table blocks (
  id          uuid primary key default uuid_generate_v4(),
  blocker_id  uuid not null references profiles(id) on delete cascade,
  blocked_id  uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique(blocker_id, blocked_id)
);

create table reports (
  id          uuid primary key default uuid_generate_v4(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  reported_id uuid not null references profiles(id) on delete cascade,
  reason      text not null,
  detail      text,
  resolved    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- SUBSCRIPTIONS (Razorpay)
-- ============================================================

create table subscription_payments (
  id                  uuid primary key default uuid_generate_v4(),
  profile_id          uuid not null references profiles(id) on delete cascade,
  razorpay_order_id   text,
  razorpay_payment_id text unique,
  amount_paise        int not null,   -- 7900 = ₹79
  status              text not null default 'pending',
  created_at          timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_profiles_region on profiles(region);
create index idx_profiles_subscription on profiles(subscription);
create index idx_profiles_online on profiles(is_online);
create index idx_gaming_profiles_game on gaming_profiles(game);
create index idx_gaming_profiles_profile on gaming_profiles(profile_id);
create index idx_swipes_from on swipes(from_user);
create index idx_swipes_to on swipes(to_user);
create index idx_matches_user_a on matches(user_a);
create index idx_matches_user_b on matches(user_b);
create index idx_messages_match on messages(match_id, created_at);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

-- ============================================================
-- MATCH CREATION TRIGGER
-- When both users like each other, auto-create a match
-- ============================================================

create or replace function check_and_create_match()
returns trigger as $$
declare
  mutual_exists boolean;
  user_lo uuid;
  user_hi uuid;
begin
  if new.action not in ('like', 'superlike') then
    return new;
  end if;

  select exists(
    select 1 from swipes
    where from_user = new.to_user
      and to_user = new.from_user
      and action in ('like', 'superlike')
  ) into mutual_exists;

  if mutual_exists then
    user_lo := least(new.from_user, new.to_user);
    user_hi := greatest(new.from_user, new.to_user);
    insert into matches (user_a, user_b)
    values (user_lo, user_hi)
    on conflict do nothing;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger on_swipe_check_match
  after insert on swipes
  for each row execute function check_and_create_match();

-- ============================================================
-- SWIPE RESET TRIGGER (daily limit)
-- ============================================================

create or replace function reset_daily_swipes()
returns trigger as $$
begin
  if new.swipes_reset_at < now() - interval '24 hours' then
    new.swipes_used_today := 0;
    new.swipes_reset_at := now();
  end if;
  return new;
end;
$$ language plpgsql;

create trigger on_profile_swipe_reset
  before update on profiles
  for each row execute function reset_daily_swipes();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table gaming_profiles enable row level security;
alter table swipes enable row level security;
alter table matches enable row level security;
alter table messages enable row level security;
alter table blocks enable row level security;
alter table reports enable row level security;
alter table subscription_payments enable row level security;

-- PROFILES: anyone can read non-banned profiles, only owner can update
create policy "Public profiles are viewable" on profiles
  for select using (is_banned = false);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);

-- GAMING PROFILES
create policy "Gaming profiles viewable" on gaming_profiles
  for select using (true);

create policy "Own gaming profiles writable" on gaming_profiles
  for all using (profile_id = auth.uid());

-- SWIPES: only you can see your swipes
create policy "Own swipes only" on swipes
  for all using (from_user = auth.uid());

-- MATCHES: visible to participants only
create policy "Match participants can view" on matches
  for select using (user_a = auth.uid() or user_b = auth.uid());

-- MESSAGES: match participants only
create policy "Message participants can view" on messages
  for select using (
    exists(
      select 1 from matches
      where id = match_id
        and (user_a = auth.uid() or user_b = auth.uid())
    )
  );

create policy "Match participants can send" on messages
  for insert with check (
    sender_id = auth.uid() and
    exists(
      select 1 from matches
      where id = match_id
        and (user_a = auth.uid() or user_b = auth.uid())
    )
  );

create policy "Realtime can read messages"
  on messages
  for select
  using (true);

-- BLOCKS
create policy "Own blocks readable" on blocks
  for select using (blocker_id = auth.uid());

create policy "Can block others" on blocks
  for insert with check (blocker_id = auth.uid());

-- REPORTS
create policy "Can report" on reports
  for insert with check (reporter_id = auth.uid());

-- SUBSCRIPTION PAYMENTS
create policy "Own payments only" on subscription_payments
  for select using (profile_id = auth.uid());

drop policy "Own swipes only" on swipes;

create policy "Users can view relevant swipes" on swipes
for select using (
  from_user = auth.uid() OR to_user = auth.uid()
);

create policy "Users can insert swipes" on swipes
for insert with check (from_user = auth.uid());