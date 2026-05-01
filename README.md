# 🎮 SquadMatch

India's gaming matchmaking platform — find teammates based on game, role, and skill level. Swipe-based matching, real-time chat, and a premium tier for serious players.

---

## 📸 Preview

<img width="1919" height="922" alt="image" src="https://github.com/user-attachments/assets/fc1e2234-a95f-473d-9cd9-6dc2bf231ff9" />

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, TailwindCSS, TypeScript |
| Backend | Supabase (PostgreSQL + Auth + Realtime) |
| Payments | Razorpay |

---

## ✨ Features

- 🔐 Google, Discord & Email auth
- 🃏 Swipe-based teammate matching
- 💬 Real-time chat for matched players
- 👑 Pro tier — unlimited likes + see who liked you
- 💳 Razorpay payment integration
- 🎯 Match % scoring based on game, role & skill

---

## ⚙️ Prerequisites

- Node.js 18+ with npm
- [Supabase](https://supabase.com) account (free)
- [Razorpay](https://razorpay.com) account (test keys for dev)

---

## 🛠️ Setup

### 1. Clone & install

```bash
git clone <your-repo>
cd squadmatch
npm install
```

---

### 2. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `supabase/schema.sql` (paste the full file)
3. Then run `supabase/functions.sql`
4. Go to **Authentication → Providers** and enable:
   - **Google OAuth** — create credentials at [console.cloud.google.com](https://console.cloud.google.com)
   - **Discord OAuth** — create app at [discord.com/developers](https://discord.com/developers/applications)

---

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in values from:

```env
# Supabase → Settings → API
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Razorpay → Dashboard → API Keys
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

```

---

### 4. Run locally

```bash
npm run dev
# Open http://localhost:3000
```

---

> Add all env vars in the Vercel dashboard after deploying.

---

### 6. Set up Razorpay webhook

In Razorpay Dashboard → **Webhooks → Add**:
- URL: `https://your-domain.com/api/webhook/razorpay`
- Event: `payment.captured`

---

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx                    ← Landing page
│   ├── auth/                       ← Login, Register, OAuth callback
│   ├── onboarding/page.tsx         ← 4-step profile setup
│   ├── (app)/                      ← Protected routes
│   │   ├── browse/page.tsx         ← Swipe feed (core feature)
│   │   ├── matches/page.tsx        ← Your matches
│   │   ├── chat/[matchId]/page.tsx ← Real-time chat
│   │   ├── profile/page.tsx        ← Your profile
│   │   └── settings/upgrade/       ← Razorpay upgrade
│   └── api/
│       ├── subscribe/route.ts      ← Create Razorpay order
│       └── webhook/razorpay/       ← Payment verification
├── components/ui/BottomNav.tsx
├── lib/
│   ├── supabase/                   ← Browser & server clients
│   └── utils.ts                    ← Match %, formatters
├── middleware.ts                   ← Auth guard
└── types/index.ts                  ← Types + game metadata

supabase/
├── schema.sql                      ← Run this first
└── functions.sql                   ← Run this second
```

---

## 🔑 Free Limits

- **Free:** 10 likes/day, resets every 24 hours
- **Pro (₹79/mo):** Unlimited likes + see who liked you
- Matches trigger automatically via DB trigger when both users like each other
