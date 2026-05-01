import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { GAMES, type GameName, type Profile, type GamingProfile } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getGameMeta(game: GameName) {
  return GAMES.find(g => g.id === game) ?? GAMES[GAMES.length - 1]
}

// Calculate match % between two profiles
export function calculateMatchScore(
  myProfile: Profile,
  myGames: GamingProfile[],
  theirProfile: Profile,
  theirGames: GamingProfile[]
): number {
  let score = 0
  let factors = 0

  // Same game overlap (biggest factor — 50 pts)
  const myGameIds = new Set(myGames.map(g => g.game))
  const theirGameIds = new Set(theirGames.map(g => g.game))
  const sharedGames = [...myGameIds].filter(g => theirGameIds.has(g))

  if (sharedGames.length > 0) {
    score += Math.min(sharedGames.length * 25, 50)
    factors++

    // Rank proximity on shared game (20 pts)
    for (const game of sharedGames) {
      const mine = myGames.find(g => g.game === game)
      const theirs = theirGames.find(g => g.game === game)
      if (mine?.rank_tier && theirs?.rank_tier) {
        const diff = Math.abs(mine.rank_tier - theirs.rank_tier)
        score += diff === 0 ? 20 : diff === 1 ? 15 : diff === 2 ? 8 : 0
        factors++
      }
    }
  }

  // Same region (15 pts)
  if (myProfile.region === theirProfile.region) {
    score += 15
  }
  factors++

  // Language overlap (10 pts)
  const myLangs = new Set(myProfile.language.map(l => l.toLowerCase()))
  const sharedLangs = theirProfile.language.filter(l => myLangs.has(l.toLowerCase()))
  if (sharedLangs.length > 0) score += 10
  factors++

  // Connection intent match (5 pts)
  if (myProfile.connection_intent === theirProfile.connection_intent) score += 5
  factors++

  // Normalize to 0–100
  const maxPossible = 100
  return Math.min(Math.round(score), maxPossible)
}

export function getMatchScoreColor(score: number): string {
  if (score >= 80) return 'text-accent-green'
  if (score >= 60) return 'text-accent-amber'
  if (score >= 40) return 'text-accent-cyan'
  return 'text-gray-400'
}

export function formatRelativeTime(date: string): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return then.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function getOnlineStatus(profile: Profile): string {
  if (profile.is_online) return 'Online'
  if (!profile.last_seen) return 'Offline'
  return formatRelativeTime(profile.last_seen)
}
