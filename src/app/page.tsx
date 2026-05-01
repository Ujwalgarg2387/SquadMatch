'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { GAMES, CONNECTION_INTENTS } from '@/types'

const HERO_PROFILES = [
  { name: 'Rahul_GG',   game: 'BGMI',     rank: 'Conqueror', region: 'Delhi',     intent: '💘' },
  { name: 'Priya_FF',   game: 'Free Fire', rank: 'Heroic',    region: 'Mumbai',    intent: '🤝' },
  { name: 'ArjunValo',  game: 'Valorant',  rank: 'Immortal',  region: 'Bangalore', intent: '💪' },
  { name: 'SkullCS',    game: 'CS2',       rank: 'Eagle',     region: 'Hyderabad', intent: '🎮' },
]

const STATS = [
  { value: '10K+', label: 'Gamers waiting' },
  { value: '4',    label: 'Major games' },
  { value: '₹79',  label: 'Per month pro' },
  { value: '100%', label: 'Made for India' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] grid-bg">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <span className="font-display text-2xl font-bold text-white tracking-wide">
          SQUAD<span className="text-brand-400">MATCH</span>
        </span>
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="btn-ghost text-sm py-2 px-4">
            Sign in
          </Link>
          <Link href="/auth/register" className="btn-primary text-sm py-2 px-4">
            Join free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-full px-4 py-1.5 mb-8">
            <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
            <span className="text-brand-400 text-sm font-medium">India's first gaming match platform</span>
          </div>

          <h1 className="font-display text-6xl md:text-8xl font-bold text-white mb-6 leading-none">
            FIND YOUR<br />
            <span className="text-glow-green text-brand-400">PERFECT</span><br />
            SQUAD MATE
          </h1>

          <p className="text-white/50 text-lg max-w-xl mx-auto mb-10">
            Match with Indian gamers by game, rank, and vibe.
            BGMI · Free Fire · Valorant · CS2
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/register" className="btn-primary text-base px-8 py-3 w-full sm:w-auto">
              Start matching — it's free
            </Link>
            <Link href="#how-it-works" className="btn-ghost text-base px-8 py-3 w-full sm:w-auto">
              How it works
            </Link>
          </div>
        </motion.div>

        {/* Floating profile cards */}
        <motion.div
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {HERO_PROFILES.map((p, i) => (
            <motion.div
              key={p.name}
              className="card-surface p-4 text-left relative overflow-hidden"
              animate={{ y: [0, i % 2 === 0 ? -8 : 8, 0] }}
              transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="w-10 h-10 rounded-xl bg-surface-600 flex items-center justify-center text-xl mb-3">
                {GAMES.find(g => g.label === p.game)?.emoji ?? '🎮'}
              </div>
              <p className="text-white font-semibold text-sm">{p.name}</p>
              <p className="text-white/40 text-xs">{p.game}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="tag border-brand-500/30 text-brand-400 bg-brand-500/10 text-xs">{p.rank}</span>
              </div>
              <div className="absolute top-3 right-3 text-base">{p.intent}</div>
              <div className="mt-2 text-white/30 text-xs">{p.region}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Stats */}
      <section className="border-y border-white/5 bg-surface-800/50">
        <div className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <div className="font-display text-4xl font-bold text-brand-400 text-glow-green">{s.value}</div>
              <div className="text-white/40 text-sm mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
            HOW IT WORKS
          </h2>
          <p className="text-white/40">Three steps to your next gaming partner</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { step: '01', title: 'Build your gaming profile', desc: 'Add your games, rank, role, and what kind of connection you\'re looking for.', emoji: '🎮' },
            { step: '02', title: 'Browse & match',            desc: 'See your compatibility % with each gamer. Like profiles, get matched when it\'s mutual.', emoji: '⚡' },
            { step: '03', title: 'Start chatting',            desc: 'Chat only with your matches. No randoms, no spam — just real gaming conversations.', emoji: '💬' },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              className="card-surface card-surface-hover p-6"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              viewport={{ once: true }}
            >
              <div className="font-mono text-brand-500/40 text-xs mb-3">{item.step}</div>
              <div className="text-3xl mb-4">{item.emoji}</div>
              <h3 className="font-display text-xl font-bold text-white mb-2">{item.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Connection types */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
            WHAT ARE YOU LOOKING FOR?
          </h2>
          <p className="text-white/40">Be honest. Everyone here is.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CONNECTION_INTENTS.map((c, i) => (
            <motion.div
              key={c.value}
              className="card-surface card-surface-hover p-5 text-center cursor-pointer"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.03 }}
            >
              <div className="text-4xl mb-3">{c.emoji}</div>
              <div className="font-display text-lg font-bold text-white">{c.label}</div>
              <div className="text-white/40 text-xs mt-1">{c.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">PRICING</h2>
          <p className="text-white/40">Less than a BGMI UC pack per month</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Free */}
          <div className="card-surface p-6">
            <div className="font-display text-2xl font-bold text-white mb-1">Free</div>
            <div className="text-4xl font-bold text-white/30 mb-6">₹0</div>
            <ul className="space-y-3 text-sm text-white/60">
              {['10 profile views/day', 'Match when both like', 'Basic chat', 'Basic filters'].map(f => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-brand-500">✓</span> {f}
                </li>
              ))}
              {['See who liked you', 'Unlimited swipes', 'Priority in browse'].map(f => (
                <li key={f} className="flex items-center gap-2 opacity-40">
                  <span>✗</span> {f}
                </li>
              ))}
            </ul>
            <Link href="/auth/register" className="btn-ghost w-full text-center mt-6 block">
              Get started
            </Link>
          </div>

          {/* Pro */}
          <div className="card-surface border-brand-500/30 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-brand-500 text-black text-xs font-bold px-3 py-1 rounded-bl-xl">
              PRO
            </div>
            <div className="font-display text-2xl font-bold text-white mb-1">Pro</div>
            <div className="text-4xl font-bold text-brand-400 mb-1">₹79</div>
            <div className="text-white/30 text-xs mb-6">per month · cancel anytime</div>
            <ul className="space-y-3 text-sm text-white/80">
              {[
                'Everything in Free',
                'Unlimited swipes/day',
                'See who liked your profile',
                'Priority in browse feed',
                'Pro badge on profile',
              ].map(f => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-brand-400">✓</span> {f}
                </li>
              ))}
            </ul>
            <Link href="/auth/register" className="btn-primary w-full text-center mt-6 block">
              Start pro — ₹79/mo
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/5 bg-surface-800/30">
        <div className="max-w-3xl mx-auto px-6 py-24 text-center">
          <h2 className="font-display text-5xl md:text-7xl font-bold text-white mb-6">
            READY TO<br />
            <span className="text-brand-400 text-glow-green">SQUAD UP?</span>
          </h2>
          <p className="text-white/40 mb-10">
            Join thousands of Indian gamers already on SquadMatch.
          </p>
          <Link href="/auth/register" className="btn-primary text-lg px-10 py-4 inline-block">
            Create your profile — free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-white/30 text-sm">
          <span className="font-display text-lg font-bold text-white/50">
            SQUAD<span className="text-brand-500/50">MATCH</span>
          </span>
          <div className="flex gap-6">
            <Link href="/legal/privacy" className="hover:text-white/60 transition-colors">Privacy</Link>
            <Link href="/legal/terms"   className="hover:text-white/60 transition-colors">Terms</Link>
            <Link href="/about"   className="hover:text-white/60 transition-colors">About</Link>
          </div>
          <span>Made with ❤️ for Indian gamers</span>
        </div>
      </footer>
    </div>
  )
}
