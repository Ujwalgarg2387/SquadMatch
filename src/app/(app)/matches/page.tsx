import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { formatRelativeTime, getGameMeta } from '@/lib/utils'

export default async function MatchesPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // ── Step 1: fetch all match rows ─────────────────────────────
  const { data: matchRows, error: matchErr } = await supabase
    .from('matches')
    .select('id, created_at, user_a, user_b')
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .order('created_at', { ascending: false })

  if (matchErr) console.error('Match fetch error:', matchErr.message)

  const rows = matchRows ?? []

  // ── Step 2: collect other user IDs ───────────────────────────
  const otherIds = [...new Set(
    rows.map(m => m.user_a === user.id ? m.user_b : m.user_a)
  )]

  // ── Step 3: fetch profiles ───────────────────────────────────
  const { data: otherProfiles } = otherIds.length > 0
    ? await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url, region, is_online, last_seen, gaming_profiles(*)')
        .in('id', otherIds)
    : { data: [] }

  const profileMap = new Map((otherProfiles ?? []).map(p => [p.id, p]))

  // ── Step 4: final matches ────────────────────────────────────
  const matches = rows
    .map(m => ({
      id: m.id,
      created_at: m.created_at,
      other: profileMap.get(m.user_a === user.id ? m.user_b : m.user_a),
    }))
    .filter(m => m.other != null) as Array<{
      id: string
      created_at: string
      other: NonNullable<ReturnType<typeof profileMap.get>>
    }>

  return (
    <div className="px-5 pt-6">
      <h1 className="font-display text-2xl font-bold text-white mb-1">MATCHES</h1>
      <p className="text-white/30 text-sm mb-6">
        {matches.length} mutual connection{matches.length !== 1 ? 's' : ''}
      </p>

      {matches.length === 0 ? (
        <div className="card-surface p-10 text-center mt-8">
          <div className="text-5xl mb-4">🎮</div>
          <h3 className="font-display text-xl font-bold text-white mb-2">No matches yet</h3>
          <p className="text-white/40 text-sm mb-6">
            Start liking profiles in Browse — when someone likes you back, they appear here.
          </p>
          <Link href="/browse" className="btn-primary px-6 py-2.5 inline-block">
            Start browsing
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map(match => {
            const games = (match.other as any).gaming_profiles ?? []
            const primary = games.find((g: any) => g.is_primary) ?? games[0]
            const gameMeta = primary ? getGameMeta(primary.game as any) : null

            return (
              <Link
                key={match.id}
                href={`/matches/${match.id}`}
                className="card-surface card-surface-hover flex items-center gap-4 p-4"
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="relative w-14 h-14 rounded-2xl bg-surface-600 flex items-center justify-center text-2xl overflow-hidden">
                    {match.other.avatar_url ? (
                      <Image
                        src={match.other.avatar_url}
                        alt={match.other.display_name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <span>{gameMeta?.emoji ?? '🎮'}</span>
                    )}
                  </div>

                  {match.other.is_online && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-brand-400 border-2 border-[#0a0a0f]" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-white truncate">
                      {match.other.display_name}
                    </span>

                    <span className="text-white/30 text-xs shrink-0 ml-2">
                      {formatRelativeTime(match.created_at)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 mb-1">
                    {gameMeta && (
                      <span className="text-xs text-white/30">
                        {gameMeta.emoji} {gameMeta.label}
                      </span>
                    )}
                    {primary?.rank && (
                      <span className="text-xs text-white/20">· {primary.rank}</span>
                    )}
                  </div>

                  {/* New UI (no chat content) */}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 bg-brand-500/10 text-brand-400 rounded-full">
                      New Match
                    </span>
                    <span className="text-white/40 text-sm">
                      Check compatibility insights
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}