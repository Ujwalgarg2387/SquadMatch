// ============================================================
// Database types — mirrors Supabase schema exactly
// ============================================================

export type GameName =
  | 'bgmi' | 'pubg_mobile' | 'free_fire' | 'valorant'
  | 'cs2'  | 'apex_legends' | 'cod_mobile' | 'minecraft'
  | 'gta_online' | 'other'

export type ConnectionIntent = 'squad' | 'bff' | 'bromance' | 'lover'
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say'
export type MatchAction = 'like' | 'pass' | 'superlike'
export type SubscriptionTier = 'free' | 'pro'
export type MessageStatus = 'sent' | 'delivered' | 'read'

export interface Profile {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  age: number | null
  gender: Gender | null
  region: string
  language: string[]
  connection_intent: ConnectionIntent
  is_online: boolean
  last_seen: string | null
  subscription: SubscriptionTier
  subscription_expires_at: string | null
  swipes_used_today: number
  swipes_reset_at: string
  is_verified: boolean
  is_banned: boolean
  profile_complete: boolean
  created_at: string
  updated_at: string
}

export interface GamingProfile {
  id: string
  profile_id: string
  game: GameName
  game_id: string | null
  rank: string | null
  rank_tier: number | null
  role: string | null
  playtime_hours: number | null
  peak_rank: string | null
  is_primary: boolean
  created_at: string
}

export interface Match {
  id: string
  user_a: string
  user_b: string
  created_at: string
}

export interface Message {
  id: string
  match_id: string
  sender_id: string
  content: string
  status: MessageStatus
  created_at: string
}

// ============================================================
// Enriched types (joined queries)
// ============================================================

export interface ProfileWithGames extends Profile {
  gaming_profiles: GamingProfile[]
}

export interface MatchWithProfiles extends Match {
  other_user: ProfileWithGames
  last_message?: Message | null
  unread_count?: number
}

// ============================================================
// Game metadata (static config)
// ============================================================

export interface GameMeta {
  id: GameName
  label: string
  emoji: string
  ranks: string[]
  roles: string[]
  color: string
}

export const GAMES: GameMeta[] = [
  {
    id: 'bgmi',
    label: 'BGMI',
    emoji: '🎯',
    color: '#f59e0b',
    ranks: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Crown', 'Ace', 'Conqueror'],
    roles: ['Fragger', 'IGL', 'Support', 'Sniper', 'Rush', 'All-rounder'],
  },
  {
    id: 'free_fire',
    label: 'Free Fire',
    emoji: '🔥',
    color: '#ef4444',
    ranks: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Heroic', 'Grandmaster'],
    roles: ['Fragger', 'Support', 'Rusher', 'Sniper', 'Entry fragger'],
  },
  {
    id: 'valorant',
    label: 'Valorant',
    emoji: '⚡',
    color: '#ff4655',
    ranks: ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal', 'Radiant'],
    roles: ['Duelist', 'Controller', 'Initiator', 'Sentinel', 'Flex'],
  },
  {
    id: 'cs2',
    label: 'CS2',
    emoji: '💣',
    color: '#f97316',
    ranks: ['Silver', 'Gold Nova', 'Master Guardian', 'Distinguished', 'Legendary Eagle', 'Supreme', 'Global Elite'],
    roles: ['Entry fragger', 'AWPer', 'Lurker', 'Support', 'IGL'],
  },
  {
    id: 'pubg_mobile',
    label: 'PUBG Mobile',
    emoji: '🎮',
    color: '#a855f7',
    ranks: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Crown', 'Ace', 'Conqueror'],
    roles: ['Fragger', 'IGL', 'Support', 'Sniper', 'Driver', 'All-rounder'],
  },
  {
    id: 'apex_legends',
    label: 'Apex Legends',
    emoji: '🎯',
    color: '#ea384c',
    ranks: ['Rookie', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Predator'],
    roles: ['Fragger', 'Support', 'Recon', 'Controller', 'Skirmisher'],
  },
  {
    id: 'cod_mobile',
    label: 'COD Mobile',
    emoji: '🔫',
    color: '#22c55e',
    ranks: ['Rookie', 'Veteran', 'Elite', 'Pro', 'Master', 'Grandmaster', 'Legend'],
    roles: ['Rusher', 'Sniper', 'Support', 'Fragger', 'Camper'],
  },
  {
    id: 'other',
    label: 'Other',
    emoji: '🕹️',
    color: '#6b7280',
    ranks: ['Beginner', 'Intermediate', 'Advanced', 'Expert', 'Pro'],
    roles: ['Player'],
  },
]

export const INDIAN_REGIONS = [
  'Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai',
  'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow',
  'Chandigarh', 'Bhopal', 'Indore', 'Nagpur', 'Patna',
  'Other',
]

export const LANGUAGES = [
  'Hindi', 'English', 'Tamil', 'Telugu', 'Marathi',
  'Bengali', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi',
  'Odia', 'Urdu',
]

export const CONNECTION_INTENTS: { value: ConnectionIntent; label: string; desc: string; emoji: string }[] = [
  { value: 'squad',    label: 'Squad',    emoji: '🎮', desc: 'Gaming partners only' },
  { value: 'bff',      label: 'BFF',      emoji: '🤝', desc: 'Close gaming friend' },
  { value: 'bromance', label: 'Bromance', emoji: '💪', desc: 'Best bro squad vibes' },
  { value: 'lover',    label: 'Lover',    emoji: '💘', desc: 'Romance + gaming' },
]

// ============================================================
// Free tier limits
// ============================================================

export const FREE_DAILY_SWIPES = 10
export const PRO_PRICE_PAISE  = 7900   // ₹79
export const PRO_PRICE_DISPLAY = '₹79'
