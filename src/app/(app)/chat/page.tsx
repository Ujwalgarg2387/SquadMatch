import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { formatRelativeTime, getGameMeta } from '@/lib/utils'

export default async function ChatListPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // ── Step 1: fetch all match rows ─────────────────────────────
  // Never use profiles!matches_user_b_fkey — that FK hint is
  // unreliable when both FK columns point to the same table.
  const { data: matchRows, error: matchErr } = await supabase
    .from('matches')
    .select('id, created_at, user_a, user_b')
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .order('created_at', { ascending: false })

  if (matchErr) console.error('Match fetch error:', matchErr.message)

  const rows = matchRows ?? []

  // ── Step 2: collect the other user ID for each match ─────────
  const otherIds = [...new Set(
    rows.map(m => m.user_a === user.id ? m.user_b : m.user_a)
  )]

  // ── Step 3: fetch those profiles + games in one query ────────
  const { data: otherProfiles } = otherIds.length > 0
    ? await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url, region, is_online, last_seen, gaming_profiles(*)')
        .in('id', otherIds)
    : { data: [] }

  const profileMap = new Map((otherProfiles ?? []).map(p => [p.id, p]))

  // ── Step 4: last message per match ───────────────────────────
  const matchIds = rows.map(m => m.id)

  const { data: allMessages } = matchIds.length > 0
    ? await supabase
        .from('messages')
        .select('match_id, content, created_at, sender_id')
        .in('match_id', matchIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  const lastMsgByMatch = new Map<string, { content: string; created_at: string; sender_id: string }>()
  ;(allMessages ?? []).forEach(m => {
    if (!lastMsgByMatch.has(m.match_id)) lastMsgByMatch.set(m.match_id, m)
  })

  // ── Step 5: assemble final list ───────────────────────────────
  const matches = rows
    .map(m => ({
      id:           m.id,
      created_at:   m.created_at,
      other:        profileMap.get(m.user_a === user.id ? m.user_b : m.user_a),
      last_message: lastMsgByMatch.get(m.id) ?? null,
    }))
    .filter(m => m.other != null) as Array<{
      id: string
      created_at: string
      other: NonNullable<ReturnType<typeof profileMap.get>>
      last_message: { content: string; created_at: string; sender_id: string } | null
    }>

  return (
    <div className="px-5 pt-6">
      <h1 className="font-display text-2xl font-bold text-white mb-1">CHATS with your MATCH</h1>
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
            const lastMsg  = match.last_message
            const games    = (match.other as any).gaming_profiles ?? []
            const primary  = games.find((g: any) => g.is_primary) ?? games[0]
            const gameMeta = primary ? getGameMeta(primary.game as any) : null

            return (
              <Link
                key={match.id}
                href={`/chat/${match.id}`}
                className="card-surface card-surface-hover flex items-center gap-4 p-4"
              >
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

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-white truncate">
                      {match.other.display_name}
                    </span>
                    <span className="text-white/30 text-xs shrink-0 ml-2">
                      {lastMsg
                        ? formatRelativeTime(lastMsg.created_at)
                        : formatRelativeTime(match.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {gameMeta && (
                      <span className="text-xs text-white/30">
                        {gameMeta.emoji} {gameMeta.label}
                      </span>
                    )}
                    {primary?.rank && (
                      <span className="text-xs text-white/20">· {primary.rank}</span>
                    )}
                  </div>
                  <p className="text-white/40 text-sm truncate">
                    {lastMsg
                      ? (lastMsg.sender_id === user.id ? 'You: ' : '') + lastMsg.content
                      : '🎮 New match! Say hello'}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}