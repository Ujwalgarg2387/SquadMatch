import { createServerSupabaseClient } from '@/lib/supabase/server'
import Image from 'next/image'
import Link from 'next/link'
import { getGameMeta } from '@/lib/utils'

export default async function MatchDetailsPage({
  params,
}: {
  params: { matchId: string }
}) {
  const supabase = createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // ── Fetch match ─────────────────────────────────────────────
  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', params.matchId)
    .single()

  if (!match) return <div className="p-6 text-white">Match not found</div>

  const otherUserId =
    match.user_a === user.id ? match.user_b : match.user_a

  // ── Fetch other profile ─────────────────────────────────────
  const { data: other } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, gaming_profiles(*)')
    .eq('id', otherUserId)
    .single()

  const games = other?.gaming_profiles ?? []
  const primary = games.find((g: any) => g.is_primary) ?? games[0]
  const gameMeta = primary ? getGameMeta(primary.game as any) : null

  // ── Dummy insights (replace later with real logic) ───────────
  const matchPercent = 82

  return (
    <div className="px-5 pt-6 text-white">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative w-16 h-16 rounded-2xl bg-surface-600 overflow-hidden flex items-center justify-center text-2xl">
          {other?.avatar_url ? (
            <Image
              src={other.avatar_url}
              alt={other.display_name}
              fill
              className="object-cover"
            />
          ) : (
            <span>{gameMeta?.emoji ?? '🎮'}</span>
          )}
        </div>

        <div>
          <h2 className="font-display text-xl font-bold">
            {other?.display_name}
          </h2>
          <p className="text-white/40 text-sm">
            Great match potential 🎯
          </p>
        </div>
      </div>

      {/* Match % Card */}
      <div className="card-surface p-6 mb-5 text-center">
        <div className="text-4xl font-bold text-brand-400 mb-1">
          {matchPercent}%
        </div>
        <p className="text-white/40 text-sm">
          Compatibility Score
        </p>
      </div>

      {/* Game Info */}
      {gameMeta && (
        <div className="card-surface p-4 mb-5 flex items-center justify-between">
          <div>
            <p className="text-white/40 text-sm">Primary Game</p>
            <p className="font-semibold">
              {gameMeta.emoji} {gameMeta.label}
            </p>
          </div>

          {primary?.rank && (
            <div className="text-right">
              <p className="text-white/40 text-sm">Rank</p>
              <p className="font-semibold">{primary.rank}</p>
            </div>
          )}
        </div>
      )}

      {/* Insights Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="card-surface p-4 text-center">
          <p className="text-lg font-bold">🎮</p>
          <p className="text-xs text-white/40">Same Game</p>
        </div>

        <div className="card-surface p-4 text-center">
          <p className="text-lg font-bold">⚡</p>
          <p className="text-xs text-white/40">Skill Match</p>
        </div>

        <div className="card-surface p-4 text-center">
          <p className="text-lg font-bold">🌍</p>
          <p className="text-xs text-white/40">Region Match</p>
        </div>

        <div className="card-surface p-4 text-center">
          <p className="text-lg font-bold">💬</p>
          <p className="text-xs text-white/40">Play Style</p>
        </div>
      </div>

      {/* CTA */}
      <Link
        href={`/chat/${params.matchId}`}
        className="btn-primary w-full py-3 text-center block"
      >
        Start Chatting
      </Link>
    </div>
  )
}