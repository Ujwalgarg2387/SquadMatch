import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getGameMeta } from '@/lib/utils'
import { CONNECTION_INTENTS } from '@/types'
import ReportBlock from '@/components/profile/ReportBlock'

export default async function PublicProfilePage({ params }: { params: { username: string } }) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, gaming_profiles(*)')
    .eq('username', params.username)
    .eq('is_banned', false)
    .single()

  if (!profile) notFound()

  const isOwnProfile = user?.id === profile.id

  // Check if already matched
  let matchId: string | null = null
  if (user && !isOwnProfile) {
    const ids = [user.id, profile.id].sort()
    const { data: match } = await supabase
      .from('matches')
      .select('id')
      .eq('user_a', ids[0])
      .eq('user_b', ids[1])
      .maybeSingle()
    matchId = match?.id ?? null
  }

  const intent = CONNECTION_INTENTS.find(c => c.value === profile.connection_intent)
  const isPro =
    profile.subscription === 'pro' &&
    profile.subscription_expires_at &&
    new Date(profile.subscription_expires_at) > new Date()

  return (
    <div className="px-5 pt-6 pb-12">
      {/* Back button */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/browse" className="text-white/40 hover:text-white">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        {!isOwnProfile && user && (
          <ReportBlock reportedId={profile.id} reportedName={profile.display_name} />
        )}
        {isOwnProfile && (
          <Link href="/settings/edit" className="btn-ghost text-sm py-2 px-4">Edit</Link>
        )}
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
          {profile.is_online && (
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-brand-400 border-2 border-[#0a0a0f]" />
          )}
          {isPro && (
            <div className="absolute -top-1.5 -right-1.5 bg-brand-500 text-black text-xs font-bold px-1.5 py-0.5 rounded-full">
              PRO
            </div>
          )}
        </div>

        <h1 className="font-display text-2xl font-bold text-white mb-1">
          {profile.display_name}
          {profile.is_verified && <span className="text-accent-cyan text-base ml-1">✓</span>}
        </h1>
        <p className="text-white/40 text-sm mb-3">
          @{profile.username}
          {profile.age && ` · ${profile.age}y`}
          {' · '}{profile.region}
        </p>

        {intent && (
          <span className="inline-flex items-center gap-1.5 bg-surface-600 border border-white/10 rounded-full px-3 py-1 text-sm text-white/70">
            {intent.emoji} Looking for {intent.label}
          </span>
        )}

        {profile.bio && (
          <p className="text-white/50 text-sm mt-4 leading-relaxed">{profile.bio}</p>
        )}

        {/* Action button */}
        {!isOwnProfile && user && (
          <div className="mt-5">
            {matchId ? (
              <Link href={`/chat/${matchId}`} className="btn-primary px-8 py-2.5 inline-block">
                💬 Open chat
              </Link>
            ) : (
              <Link href="/browse" className="btn-ghost px-8 py-2.5 inline-block">
                Find in browse
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Games */}
      {(profile.gaming_profiles ?? []).length > 0 && (
        <div className="card-surface p-5 mb-4">
          <h2 className="font-display text-base font-bold text-white mb-4">Games</h2>
          <div className="space-y-3">
            {(profile.gaming_profiles ?? []).map((gp: any) => {
              const meta = getGameMeta(gp.game)
              return (
                <div key={gp.id} className="flex items-center gap-3 py-1">
                  <span className="text-2xl">{meta.emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm">{meta.label}</span>
                      {gp.is_primary && (
                        <span className="text-xs text-brand-400 border border-brand-500/30 rounded-full px-1.5">Main</span>
                      )}
                    </div>
                    <div className="text-white/40 text-xs mt-0.5">
                      {[gp.rank, gp.role].filter(Boolean).join(' · ')}
                      {gp.game_id && <span className="ml-1 text-white/20">· {gp.game_id}</span>}
                    </div>
                  </div>
                  {gp.rank && (
                    <span
                      className="text-xs font-medium px-2 py-1 rounded-lg border"
                      style={{ borderColor: `${meta.color}40`, color: meta.color, background: `${meta.color}15` }}
                    >
                      {gp.rank}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Languages */}
      <div className="card-surface p-5 mb-4">
        <h2 className="font-display text-base font-bold text-white mb-3">Languages</h2>
        <div className="flex flex-wrap gap-2">
          {(profile.language ?? []).map((l: string) => (
            <span key={l} className="text-sm text-white/60 border border-white/10 rounded-full px-3 py-1">
              {l}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
