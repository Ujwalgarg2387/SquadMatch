-- ============================================================
-- Run this in Supabase SQL Editor AFTER schema.sql
-- ============================================================

-- RPC: increment swipe counter atomically
create or replace function increment_swipes(user_id uuid)
returns void as $$
begin
  update profiles
  set swipes_used_today = swipes_used_today + 1
  where id = user_id;
end;
$$ language plpgsql security definer;

-- View: browse feed (excludes banned, incomplete, self)
-- Used optionally for server-side rendering
create or replace view browse_feed as
select
  p.*,
  array_agg(row_to_json(gp)) filter (where gp.id is not null) as gaming_profiles
from profiles p
left join gaming_profiles gp on gp.profile_id = p.id
where p.is_banned = false
  and p.profile_complete = true
group by p.id;

-- Grant RPC to authenticated users
grant execute on function increment_swipes to authenticated;
