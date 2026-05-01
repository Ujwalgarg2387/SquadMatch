# SquadMatch — India's Gaming Match Platform

## Setup (do this in order)

### 1. Clone and install
```bash
git clone <your-repo>
cd squadmatch
npm install
```

### 2. Create your Supabase project
1. Go to https://supabase.com and create a free project
2. Go to **SQL Editor** and run `supabase/schema.sql` — paste the entire file
3. Then run `supabase/functions.sql`
4. Go to **Authentication → Providers** and enable:
   - Google OAuth (create at https://console.cloud.google.com)
   - Discord OAuth (create at https://discord.com/developers/applications)

### 3. Set up environment
```bash
cp .env.example .env.local
```
Fill in your values from:
- Supabase: Settings → API
- Razorpay: Dashboard → API Keys (use test keys first)
- Cloudinary: Console → Dashboard

### 4. Run locally
```bash
npm run dev
# Open http://localhost:3000
```

### 5. Deploy to Vercel
```bash
npx vercel
# Add all env vars in Vercel dashboard
```

### 6. Configure Razorpay webhook
In Razorpay dashboard → Webhooks → Add:
- URL: `https://your-domain.com/api/webhook/razorpay`
- Events: `payment.captured`

---

## File structure
```
src/
  app/
    page.tsx                    ← Landing page
    layout.tsx                  ← Root layout
    globals.css                 ← Dark gaming theme
    auth/
      login/page.tsx            ← Login (Google/Discord/Email)
      register/page.tsx         ← Register
      callback/route.ts         ← OAuth redirect handler
      verify-email/page.tsx     ← Email confirmation prompt
    onboarding/page.tsx         ← 4-step profile setup
    (app)/                      ← Protected routes
      layout.tsx                ← Auth guard + bottom nav
      browse/page.tsx           ← Swipe feed (CORE FEATURE)
      matches/page.tsx          ← Your matches
      chat/[matchId]/page.tsx   ← Real-time chat
      profile/page.tsx          ← Your profile
      settings/upgrade/page.tsx ← Razorpay ₹79/mo upgrade
    api/
      subscribe/route.ts        ← Create Razorpay order
      webhook/razorpay/route.ts ← Payment verification
  components/
    ui/BottomNav.tsx             ← Mobile bottom navigation
  lib/
    supabase/client.ts          ← Browser Supabase client
    supabase/server.ts          ← Server Supabase client
    utils.ts                    ← Match %, formatters, helpers
  middleware.ts                 ← Auth guard for all routes
  types/index.ts                ← All types + game metadata

supabase/
  schema.sql                   ← Full DB schema (run first)
  functions.sql                ← RPC functions (run second)
```

## Free tier limits (what you get for ₹0/month)
- Supabase: 500MB DB, 50K monthly active users, 2GB bandwidth
- Vercel: 100GB bandwidth, unlimited deployments
- Cloudinary: 25GB storage, 25GB monthly bandwidth

## When you hit limits
- ~2000 users: upgrade Supabase to Pro ($25/mo)
- ~10K users: add Redis (Upstash free tier) for session caching
- ~50K users: migrate to dedicated server, add CDN

## Key business rules (hardcoded)
- Free: 10 likes/day
- Pro: unlimited likes + see who liked you
- Pro price: ₹79/month
- Match trigger: automatic via DB trigger when both users like each other
- Swipe counter resets every 24 hours
