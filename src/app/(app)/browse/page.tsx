'use client'
import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  type ProfileWithGames, type GameName,
  GAMES, INDIAN_REGIONS, FREE_DAILY_SWIPES, CONNECTION_INTENTS,
} from '@/types'
import { calculateMatchScore, getMatchScoreColor, cn, getGameMeta } from '@/lib/utils'

// ── Profile card ─────────────────────────────────────────────
function ProfileCard({
  profile,
  myProfile,
  myGames,
  onLike,
  onPass,
  isTop,
}: {
  profile: ProfileWithGames
  myProfile: ProfileWithGames | null
  myGames: ProfileWithGames['gaming_profiles']
  onLike: () => void
  onPass: () => void
  isTop: boolean
}) {
  const [dragX, setDragX] = useState(0)
  const [swiping, setSwiping] = useState<'left' | 'right' | null>(null)

  const score = myProfile
    ? calculateMatchScore(myProfile, myGames, profile, profile.gaming_profiles)
    : 0

  const scoreColor = getMatchScoreColor(score)
  const primaryGame = profile.gaming_profiles.find(g => g.is_primary) ?? profile.gaming_profiles[0]
  const gameMeta = primaryGame ? getGameMeta(primaryGame.game) : null
  const intent = CONNECTION_INTENTS.find(c => c.value === profile.connection_intent)

  async function handleAction(action: 'like' | 'pass') {
    setSwiping(action === 'like' ? 'right' : 'left')
    await new Promise(r => setTimeout(r, 320))
    if (action === 'like') onLike()
    else onPass()
    setSwiping(null)
    setDragX(0)
  }

  if (!isTop) {
    return (
      <div className="absolute inset-0 card-surface scale-95 opacity-60 pointer-events-none" />
    )
  }

  return (
    <motion.div
      className={cn(
        'absolute inset-0 card-surface overflow-hidden cursor-grab active:cursor-grabbing select-none',
        swiping === 'right' && 'swiping-right',
        swiping === 'left'  && 'swiping-left',
      )}
      style={{ x: dragX }}
      drag="x"
      dragConstraints={{ left: -200, right: 200 }}
      onDrag={(_, info) => setDragX(info.offset.x)}
      onDragEnd={(_, info) => {
        if (info.offset.x > 80)       handleAction('like')
        else if (info.offset.x < -80) handleAction('pass')
        else setDragX(0)
      }}
      animate={{ x: swiping ? undefined : 0 }}
    >
      {/* Swipe indicators */}
      <div className={cn('absolute top-6 left-6 z-10 border-4 border-brand-400 text-brand-400 font-display font-bold text-2xl px-3 py-1 rounded-lg rotate-[-15deg] transition-opacity', dragX > 40 ? 'opacity-100' : 'opacity-0')}>
        LIKE
      </div>
      <div className={cn('absolute top-6 right-6 z-10 border-4 border-red-500 text-red-500 font-display font-bold text-2xl px-3 py-1 rounded-lg rotate-[15deg] transition-opacity', dragX < -40 ? 'opacity-100' : 'opacity-0')}>
        PASS
      </div>

      {/* Avatar / photo area */}
      <div className="relative h-56 bg-surface-700 flex items-center justify-center overflow-hidden">
        {profile.avatar_url ? (
          <Image src={profile.avatar_url} alt={profile.display_name} fill className="object-cover" />
        ) : (
          <div className="text-7xl select-none">{gameMeta?.emoji ?? '🎮'}</div>
        )}
        {/* Match score badge */}
        <div className={cn('absolute top-3 right-3 bg-surface-800/90 backdrop-blur rounded-xl px-3 py-1.5 flex items-center gap-1.5')}>
          <span className="w-2 h-2 rounded-full bg-brand-400" />
          <span className={cn('font-display font-bold text-lg', scoreColor)}>{score}%</span>
          <span className="text-white/40 text-xs">match</span>
        </div>
        {/* Online indicator */}
        {profile.is_online && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-surface-800/90 backdrop-blur rounded-full px-2 py-1">
            <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
            <span className="text-brand-400 text-xs font-medium">Online</span>
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#111118] to-transparent" />
      </div>

      {/* Info */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">
              {profile.display_name}
              {profile.is_verified && <span className="text-accent-cyan text-base ml-1">✓</span>}
            </h2>
            <p className="text-white/40 text-sm">@{profile.username} · {profile.age && `${profile.age}y`} · {profile.region}</p>
          </div>
          {intent && (
            <div className="bg-surface-600 rounded-xl px-3 py-1.5 text-center">
              <div className="text-xl">{intent.emoji}</div>
              <div className="text-xs text-white/40">{intent.label}</div>
            </div>
          )}
        </div>

        {profile.bio && (
          <p className="text-white/60 text-sm mb-4 leading-relaxed line-clamp-2">{profile.bio}</p>
        )}

        {/* Games */}
        <div className="flex flex-wrap gap-2 mb-4">
          {profile.gaming_profiles.slice(0, 3).map(gp => {
            const meta = getGameMeta(gp.game)
            return (
              <div key={gp.id} className="flex items-center gap-1.5 bg-surface-700 border border-white/8 rounded-lg px-2.5 py-1.5">
                <span className="text-sm">{meta.emoji}</span>
                <span className="text-white/70 text-xs font-medium">{meta.label}</span>
                {gp.rank && <span className="text-white/30 text-xs">· {gp.rank}</span>}
              </div>
            )
          })}
        </div>

        {/* Languages */}
        <div className="flex gap-2">
          {profile.language.slice(0, 3).map(lang => (
            <span key={lang} className="text-xs text-white/30 border border-white/10 rounded-full px-2 py-0.5">
              {lang}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ── Filters panel ────────────────────────────────────────────
function FiltersPanel({
  filters,
  onChange,
  onClose,
}: {
  filters: { game: GameName | ''; region: string }
  onChange: (k: string, v: string) => void
  onClose: () => void
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full max-w-lg bg-surface-800 border-t border-white/10 rounded-t-2xl p-6"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl font-bold text-white">Filters</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-2xl leading-none">×</button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-white/50 text-sm mb-2 block">Game</label>
            <select
              className="input-dark"
              value={filters.game}
              onChange={e => onChange('game', e.target.value)}
            >
              <option value="">All games</option>
              {GAMES.map(g => <option key={g.id} value={g.id}>{g.emoji} {g.label}</option>)}
            </select>
          </div>

          <div>
            <label className="text-white/50 text-sm mb-2 block">Region</label>
            <select
              className="input-dark"
              value={filters.region}
              onChange={e => onChange('region', e.target.value)}
            >
              <option value="">All India</option>
              {INDIAN_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        <button onClick={onClose} className="btn-primary w-full mt-6 py-3">
          Apply filters
        </button>
      </motion.div>
    </motion.div>
  )
}

// ── Match modal ──────────────────────────────────────────────
function MatchModal({ profile, onClose }: { profile: ProfileWithGames; onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="card-surface w-full max-w-sm p-8 text-center"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300, delay: 0.1 }}
      >
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="font-display text-3xl font-bold text-white mb-2">IT'S A MATCH!</h2>
        <p className="text-white/50 mb-6">
          You and <span className="text-brand-400 font-medium">{profile.display_name}</span> both liked each other!
        </p>
        <div className="flex gap-3">
          <Link
            href="/chat"
            className="btn-primary flex-1 py-3"
            onClick={onClose}
          >
            Send message
          </Link>
          <button onClick={onClose} className="btn-ghost flex-1 py-3">
            Keep browsing
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main Browse Page ─────────────────────────────────────────
export default function BrowsePage() {
  const [profiles, setProfiles] = useState<ProfileWithGames[]>([])
  const [myProfile, setMyProfile] = useState<ProfileWithGames | null>(null)
  const [swipesLeft, setSwipesLeft] = useState(FREE_DAILY_SWIPES)
  const [isPro, setIsPro] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [matchedProfile, setMatchedProfile] = useState<ProfileWithGames | null>(null)
  const [filters, setFilters] = useState({ game: '' as GameName | '', region: '' })
  const supabase = createClient()

  const loadMyProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('profiles')
      .select('*, gaming_profiles(*)')
      .eq('id', user.id)
      .single()

    if (data) {
      setMyProfile(data as ProfileWithGames)
      setSwipesLeft(Math.max(0, FREE_DAILY_SWIPES - data.swipes_used_today))
      setIsPro(data.subscription === 'pro')
    }
  }, [supabase])

  const loadProfiles = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get already-swiped IDs
    const { data: swiped } = await supabase
      .from('swipes')
      .select('to_user')
      .eq('from_user', user.id)

    // Get blocked user IDs
    const { data: blockedData } = await supabase.rpc('get_blocked_ids')
    const blockedIds: string[] = blockedData ?? []

    const swipedIds = swiped?.map(s => s.to_user) ?? []
    // Always include own ID to exclude self
    const excludeIds = [...new Set([...swipedIds, ...blockedIds, user.id])]

    let query = supabase
      .from('profiles')
      .select('*, gaming_profiles(*)')
      .eq('is_banned', false)
      .eq('profile_complete', true)
      // Use array syntax — Supabase handles UUID arrays correctly this way
      .not('id', 'in', `(${excludeIds.map(id => `"${id}"`).join(',')})`)
      .limit(20)

    if (filters.region) query = query.eq('region', filters.region)

    const { data } = await query

    let results = (data ?? []) as ProfileWithGames[]

    // Client-side game filter
    if (filters.game) {
      results = results.filter(p =>
        p.gaming_profiles.some(gp => gp.game === filters.game)
      )
    }

    // Sort by match score descending
    if (myProfile) {
      results.sort((a, b) =>
        calculateMatchScore(myProfile, myProfile.gaming_profiles, b, b.gaming_profiles) -
        calculateMatchScore(myProfile, myProfile.gaming_profiles, a, a.gaming_profiles)
      )
    }

    setProfiles(results)
    setLoading(false)
  }, [supabase, filters, myProfile])

  useEffect(() => { loadMyProfile() }, [loadMyProfile])
  useEffect(() => { if (myProfile) loadProfiles() }, [myProfile, loadProfiles])

  async function recordSwipe(profile: ProfileWithGames, action: 'like' | 'pass') {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Check swipe limit for free users
    if (!isPro && action === 'like') {
      if (swipesLeft <= 0) {
        toast.error('Daily limit reached! Upgrade to Pro for unlimited swipes 🚀', { duration: 4000 })
        return
      }
      setSwipesLeft(s => s - 1)
    }

    // Remove card immediately — optimistic UI so the swipe feels instant
    setProfiles(ps => ps.filter(p => p.id !== profile.id))

    // Record swipe — upsert handles re-swipes gracefully
    const { error: swipeErr } = await supabase.from('swipes').upsert({
      from_user: user.id,
      to_user: profile.id,
      action,
    }, { onConflict: 'from_user,to_user' })

    if (swipeErr) {
      console.error('Swipe insert error:', swipeErr)
      return
    }

    // Increment daily counter for likes
    if (action === 'like') {
      await supabase.rpc('increment_swipes', { user_id: user.id })
    }

    // ── Match detection (only needed for likes) ───────────────
    // Primary path: DB trigger (check_and_create_match with SECURITY DEFINER)
    //   fires after the swipe INSERT and creates the match row automatically.
    // Fallback path: client-side check below in case the trigger was slow
    //   or wasn't yet patched with SECURITY DEFINER.
    if (action !== 'like') return

    // Step 1 — Check directly: did the other user already like us?
    //   Requires updated swipes RLS: "to_user = auth.uid() OR from_user = auth.uid()"
    const { data: theirLike } = await supabase
      .from('swipes')
      .select('id')
      .eq('from_user', profile.id)
      .eq('to_user', user.id)
      .eq('action', 'like')
      .maybeSingle()

    if (!theirLike) return  // No mutual like yet — nothing to do

    // Step 2 — It's mutual. UUIDs sorted lexicographically (same as Postgres least/greatest)
    const ids    = [user.id, profile.id].sort()
    const userLo = ids[0]
    const userHi = ids[1]

    // Step 3 — Try to insert match directly as client-side fallback.
    //   The trigger may have already done this; on conflict do nothing handles that.
    //   Requires matches INSERT policy: auth.uid() in (user_a, user_b)
    await supabase.from('matches').upsert(
      { user_a: userLo, user_b: userHi },
      { onConflict: 'user_a,user_b', ignoreDuplicates: true }
    )

    // Step 4 — Confirm the row exists then show the match modal
    const { data: match } = await supabase
      .from('matches')
      .select('id')
      .eq('user_a', userLo)
      .eq('user_b', userHi)
      .maybeSingle()

    if (match) setMatchedProfile(profile)
  }

  const current = profiles[0]
  const next    = profiles[1]

  return (
    <div className="flex flex-col h-full min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">BROWSE</h1>
          {!isPro && (
            <p className="text-white/30 text-xs">
              {swipesLeft}/{FREE_DAILY_SWIPES} likes left today
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!isPro && (
            <Link href="/settings/upgrade" className="text-xs bg-brand-500/10 border border-brand-500/30 text-brand-400 px-3 py-1.5 rounded-full">
              Go Pro ⚡
            </Link>
          )}
          <button
            onClick={() => setShowFilters(true)}
            className={cn(
              'p-2 rounded-xl border transition-colors',
              (filters.game || filters.region)
                ? 'border-brand-500/50 text-brand-400 bg-brand-500/10'
                : 'border-white/10 text-white/50 hover:text-white'
            )}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Card stack */}
      <div className="flex-1 px-5">
        <div className="relative h-[520px]">
          {loading ? (
            <div className="absolute inset-0 card-surface flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 border-2 border-brand-500/50 border-t-brand-500 rounded-full animate-spin" />
              <p className="text-white/40 text-sm">Finding your squad…</p>
            </div>
          ) : profiles.length === 0 ? (
            <div className="absolute inset-0 card-surface flex flex-col items-center justify-center gap-4 text-center p-8">
              <div className="text-5xl">🎮</div>
              <h3 className="font-display text-xl font-bold text-white">You've seen everyone!</h3>
              <p className="text-white/40 text-sm">Check back tomorrow for new gamers, or adjust your filters.</p>
              <button
                onClick={() => setFilters({ game: '', region: '' })}
                className="btn-ghost text-sm py-2 px-4 mt-2"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              {next && (
                <ProfileCard
                  key={next.id}
                  profile={next}
                  myProfile={myProfile}
                  myGames={myProfile?.gaming_profiles ?? []}
                  onLike={() => {}}
                  onPass={() => {}}
                  isTop={false}
                />
              )}
              {current && (
                <ProfileCard
                  key={current.id}
                  profile={current}
                  myProfile={myProfile}
                  myGames={myProfile?.gaming_profiles ?? []}
                  onLike={() => recordSwipe(current, 'like')}
                  onPass={() => recordSwipe(current, 'pass')}
                  isTop={true}
                />
              )}
            </>
          )}
        </div>

        {/* Action buttons */}
        {!loading && profiles.length > 0 && current && (
          <div className="flex items-center justify-center gap-8 mt-6">
            <button
              onClick={() => recordSwipe(current, 'pass')}
              className="w-14 h-14 rounded-full bg-surface-700 border border-white/10 flex items-center justify-center text-red-400 hover:border-red-400/40 hover:bg-red-400/10 transition-all active:scale-90"
            >
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            <button
              onClick={() => recordSwipe(current, 'like')}
              className="w-16 h-16 rounded-full bg-brand-500 flex items-center justify-center text-black hover:bg-brand-400 transition-all active:scale-90 shadow-lg shadow-brand-500/30"
            >
              <svg width="28" height="28" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
          </div>
        )}

        {/* Swipe hint for new users */}
        {!loading && profiles.length > 0 && (
          <p className="text-center text-white/20 text-xs mt-4">
            Drag card or use buttons · Swipe right to like
          </p>
        )}
      </div>

      {/* Filters modal */}
      <AnimatePresence>
        {showFilters && (
          <FiltersPanel
            filters={filters}
            onChange={(k, v) => setFilters(f => ({ ...f, [k]: v }))}
            onClose={() => setShowFilters(false)}
          />
        )}
      </AnimatePresence>

      {/* Match modal */}
      <AnimatePresence>
        {matchedProfile && (
          <MatchModal profile={matchedProfile} onClose={() => setMatchedProfile(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}