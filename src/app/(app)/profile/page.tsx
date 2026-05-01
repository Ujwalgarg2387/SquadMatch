import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getGameMeta } from '@/lib/utils'
import { CONNECTION_INTENTS } from '@/types'

export default async function ProfilePage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, gaming_profiles(*)')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  // Get match count
  const { count: matchCount } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)

  const intent = CONNECTION_INTENTS.find(c => c.value === profile.connection_intent)
  const isPro =
    profile.subscription === 'pro' &&
    profile.subscription_expires_at &&
    new Date(profile.subscription_expires_at) > new Date()

  async function signOut() {
    'use server'
    const sb = createServerSupabaseClient()
    await sb.auth.signOut()
    redirect('/auth/login')
  }

  return (
    <div className="px-5 pt-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-white">MY PROFILE</h1>
        <div className="flex items-center gap-2">
          <Link href={`/profile/${profile.username}`} className="text-white/30 hover:text-white/60 p-2 transition-colors" title="View public profile">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
            </svg>
          </Link>
          <Link href="/settings/edit" className="btn-ghost text-sm py-2 px-4">Edit</Link>
        </div>
      </div>

      {/* Avatar + name */}
      <div className="card-surface p-6 mb-4 text-center">
        <div className="relative w-24 h-24 mx-auto mb-4">
          <div className="w-24 h-24 rounded-2xl bg-surface-600 flex items-center justify-center text-5xl overflow-hidden">
            {profile.avatar_url
              ? <Image src={profile.avatar_url} alt={profile.display_name} fill className="object-cover rounded-2xl" />
              : '🎮'
            }
          </div>
          {isPro && (
            <div className="absolute -top-1.5 -right-1.5 bg-brand-500 text-black text-xs font-bold px-1.5 py-0.5 rounded-full">
              PRO
            </div>
          )}
        </div>

        <h2 className="font-display text-2xl font-bold text-white mb-1">{profile.display_name}</h2>
        <p className="text-white/40 text-sm mb-3">@{profile.username}</p>

        {intent && (
          <span className="inline-flex items-center gap-1.5 bg-surface-600 border border-white/10 rounded-full px-3 py-1 text-sm text-white/70">
            {intent.emoji} {intent.label}
          </span>
        )}

        {profile.bio && (
          <p className="text-white/50 text-sm mt-4 leading-relaxed">{profile.bio}</p>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Matches', value: matchCount ?? 0 },
          { label: 'Games', value: profile.gaming_profiles?.length ?? 0 },
          { label: 'Region', value: profile.region },
        ].map(s => (
          <div key={s.label} className="card-surface p-4 text-center">
            <div className="font-display text-xl font-bold text-white mb-0.5">{s.value}</div>
            <div className="text-white/30 text-xs">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Gaming profiles */}
      <div className="card-surface p-5 mb-4">
        <h3 className="font-display text-base font-bold text-white mb-4">My Games</h3>
        {(profile.gaming_profiles ?? []).length === 0 ? (
          <p className="text-white/30 text-sm">No games added yet</p>
        ) : (
          <div className="space-y-3">
            {profile.gaming_profiles.map((gp: any) => {
              const meta = getGameMeta(gp.game)
              return (
                <div key={gp.id} className="flex items-center gap-3">
                  <span className="text-2xl">{meta.emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm">{meta.label}</span>
                      {gp.is_primary && (
                        <span className="text-xs text-brand-400 border border-brand-500/30 rounded-full px-1.5 py-0.5">Main</span>
                      )}
                    </div>
                    <div className="text-white/40 text-xs">
                      {[gp.rank, gp.role, gp.game_id].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Languages */}
      <div className="card-surface p-5 mb-4">
        <h3 className="font-display text-base font-bold text-white mb-3">Languages</h3>
        <div className="flex flex-wrap gap-2">
          {profile.language.map((l: string) => (
            <span key={l} className="text-sm text-white/60 border border-white/10 rounded-full px-3 py-1">
              {l}
            </span>
          ))}
        </div>
      </div>

      {/* Upgrade CTA if free */}
      {!isPro && (
        <Link href="/settings/upgrade" className="card-surface border-brand-500/20 p-5 mb-4 flex items-center justify-between">
          <div>
            <div className="font-display text-base font-bold text-white mb-0.5">Upgrade to Pro ⚡</div>
            <div className="text-white/40 text-sm">Unlimited swipes · See who liked you</div>
          </div>
          <div className="text-brand-400 font-display font-bold text-lg">₹79/mo →</div>
        </Link>
      )}

      {/* Sign out */}
      <form action={signOut}>
        <button type="submit" className="w-full text-red-400/70 hover:text-red-400 text-sm py-3 transition-colors">
          Sign out
        </button>
      </form>
    </div>
  )
}