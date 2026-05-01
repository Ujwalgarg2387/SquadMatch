'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import {
  GAMES, INDIAN_REGIONS, LANGUAGES, CONNECTION_INTENTS,
  type GameName, type ConnectionIntent, type GameMeta,
} from '@/types'

// ── Types ────────────────────────────────────────────────────
interface FormData {
  username: string
  display_name: string
  age: string
  gender: string
  bio: string
  selected_games: GameName[]
  game_details: Record<GameName, { rank: string; role: string; game_id: string }>
  region: string
  language: string[]
  connection_intent: ConnectionIntent
}

const TOTAL_STEPS = 4

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir < 0 ? 60 : -60, opacity: 0 }),
}

// ── Step indicators ──────────────────────────────────────────
function StepDots({ step }: { step: number }) {
  const labels = ['Profile', 'Games', 'Location', 'Intent']
  return (
    <div className="flex items-center justify-center gap-2 mb-10">
      {labels.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
              ${i + 1 === step ? 'bg-brand-500 text-black' : i + 1 < step ? 'bg-brand-500/30 text-brand-400' : 'bg-surface-600 text-white/30'}`}>
              {i + 1 < step ? '✓' : i + 1}
            </div>
            <span className={`text-xs transition-colors ${i + 1 === step ? 'text-brand-400' : 'text-white/20'}`}>
              {label}
            </span>
          </div>
          {i < labels.length - 1 && (
            <div className={`w-8 h-px mb-4 transition-colors ${i + 1 < step ? 'bg-brand-500/50' : 'bg-white/10'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Step 1: Basic profile ────────────────────────────────────
function Step1({ data, onChange }: { data: FormData; onChange: (k: keyof FormData, v: string) => void }) {
  const [checking, setChecking] = useState(false)
  const [usernameOk, setUsernameOk] = useState<boolean | null>(null)
  const supabase = createClient()

  async function checkUsername(val: string) {
    if (val.length < 3) { setUsernameOk(null); return }
    setChecking(true)
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', val.toLowerCase())
      .single()
    setUsernameOk(!data)
    setChecking(false)
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="text-white/60 text-sm mb-1.5 block">Username *</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">@</span>
          <input
            className="input-dark pl-8"
            placeholder="your_gamertag"
            value={data.username}
            onChange={e => {
              const v = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
              onChange('username', v)
              checkUsername(v)
            }}
            maxLength={20}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm">
            {checking ? '⏳' : usernameOk === true ? '✅' : usernameOk === false ? '❌' : ''}
          </span>
        </div>
        <p className="text-white/20 text-xs mt-1">Lowercase, letters, numbers, underscores only</p>
      </div>

      <div>
        <label className="text-white/60 text-sm mb-1.5 block">Display name *</label>
        <input
          className="input-dark"
          placeholder="What should we call you?"
          value={data.display_name}
          onChange={e => onChange('display_name', e.target.value)}
          maxLength={30}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-white/60 text-sm mb-1.5 block">Age *</label>
          <input
            type="number"
            className="input-dark"
            placeholder="18"
            min={13} max={60}
            value={data.age}
            onChange={e => onChange('age', e.target.value)}
          />
        </div>
        <div>
          <label className="text-white/60 text-sm mb-1.5 block">Gender</label>
          <select
            className="input-dark"
            value={data.gender}
            onChange={e => onChange('gender', e.target.value)}
          >
            <option value="">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-white/60 text-sm mb-1.5 block">Bio <span className="text-white/20">(optional)</span></label>
        <textarea
          className="input-dark resize-none h-20"
          placeholder="Ace player, IGL by day. Don't miss my clutches. 🎯"
          value={data.bio}
          onChange={e => onChange('bio', e.target.value)}
          maxLength={300}
        />
        <p className="text-right text-white/20 text-xs mt-1">{data.bio.length}/300</p>
      </div>
    </div>
  )
}

// ── Step 2: Game selection ───────────────────────────────────
function Step2({ data, onToggleGame, onGameDetail }: {
  data: FormData
  onToggleGame: (g: GameName) => void
  onGameDetail: (g: GameName, k: string, v: string) => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-white/50 text-sm mb-4">Select all games you play</p>
        <div className="grid grid-cols-2 gap-3">
          {GAMES.filter(g => g.id !== 'other').map(game => {
            const selected = data.selected_games.includes(game.id)
            return (
              <button
                key={game.id}
                type="button"
                onClick={() => onToggleGame(game.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200
                  ${selected
                    ? 'border-brand-500/60 bg-brand-500/10 text-white'
                    : 'border-white/10 bg-surface-700 text-white/50 hover:border-white/20 hover:text-white/70'}`}
              >
                <span className="text-xl">{game.emoji}</span>
                <div>
                  <div className="text-sm font-medium">{game.label}</div>
                  {selected && (
                    <div className="text-xs text-brand-400 mt-0.5">Selected</div>
                  )}
                </div>
                {selected && (
                  <div className="ml-auto w-4 h-4 rounded-full bg-brand-500 flex items-center justify-center text-black text-xs font-bold">✓</div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Game details for each selected game */}
      {data.selected_games.map(gameId => {
        const game = GAMES.find(g => g.id === gameId)!
        const details = data.game_details[gameId] ?? { rank: '', role: '', game_id: '' }
        return (
          <div key={gameId} className="bg-surface-700 border border-white/8 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">{game.emoji}</span>
              <span className="font-medium text-white">{game.label}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-white/40 text-xs mb-1 block">Your rank</label>
                <select
                  className="input-dark text-sm py-2"
                  value={details.rank}
                  onChange={e => onGameDetail(gameId, 'rank', e.target.value)}
                >
                  <option value="">Select rank</option>
                  {game.ranks.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-white/40 text-xs mb-1 block">Your role</label>
                <select
                  className="input-dark text-sm py-2"
                  value={details.role}
                  onChange={e => onGameDetail(gameId, 'role', e.target.value)}
                >
                  <option value="">Select role</option>
                  {game.roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-white/40 text-xs mb-1 block">In-game ID / username</label>
                <input
                  className="input-dark text-sm py-2"
                  placeholder={`Your ${game.label} username`}
                  value={details.game_id}
                  onChange={e => onGameDetail(gameId, 'game_id', e.target.value)}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Step 3: Region + Language ────────────────────────────────
function Step3({ data, onChange, onToggleLang }: {
  data: FormData
  onChange: (k: keyof FormData, v: string) => void
  onToggleLang: (lang: string) => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <label className="text-white/60 text-sm mb-2 block">Your city / state *</label>
        <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
          {INDIAN_REGIONS.map(region => (
            <button
              key={region}
              type="button"
              onClick={() => onChange('region', region)}
              className={`py-2 px-3 rounded-lg text-sm text-left transition-all ${
                data.region === region
                  ? 'bg-brand-500/20 border border-brand-500/50 text-brand-400'
                  : 'bg-surface-700 border border-white/8 text-white/50 hover:text-white/70 hover:border-white/15'
              }`}
            >
              {region}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-white/60 text-sm mb-2 block">
          Languages you speak *
          <span className="text-white/30 ml-1">({data.language.length} selected)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map(lang => {
            const sel = data.language.includes(lang)
            return (
              <button
                key={lang}
                type="button"
                onClick={() => onToggleLang(lang)}
                className={`py-1.5 px-3 rounded-lg text-sm transition-all ${
                  sel
                    ? 'bg-brand-500/20 border border-brand-500/50 text-brand-400'
                    : 'bg-surface-700 border border-white/8 text-white/50 hover:text-white/70'
                }`}
              >
                {lang}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Step 4: Connection intent ────────────────────────────────
function Step4({ data, onChange }: {
  data: FormData
  onChange: (k: keyof FormData, v: string) => void
}) {
  return (
    <div className="space-y-4">
      <p className="text-white/50 text-sm mb-6 text-center">
        Be honest — it helps you find better matches
      </p>
      {CONNECTION_INTENTS.map(intent => (
        <button
          key={intent.value}
          type="button"
          onClick={() => onChange('connection_intent', intent.value)}
          className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200
            ${data.connection_intent === intent.value
              ? 'border-brand-500/60 bg-brand-500/10'
              : 'border-white/10 bg-surface-700 hover:border-white/20'}`}
        >
          <span className="text-3xl">{intent.emoji}</span>
          <div>
            <div className="font-display text-lg font-bold text-white">{intent.label}</div>
            <div className="text-white/40 text-sm">{intent.desc}</div>
          </div>
          {data.connection_intent === intent.value && (
            <div className="ml-auto w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center text-black font-bold text-xs">✓</div>
          )}
        </button>
      ))}
    </div>
  )
}

// ── Main Onboarding Component ────────────────────────────────
export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(1)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState<FormData>({
    username: '', display_name: '', age: '', gender: '',
    bio: '', selected_games: [], game_details: {} as FormData['game_details'],
    region: '', language: ['Hindi', 'English'],
    connection_intent: 'squad',
  })

  function setField(key: keyof FormData, val: string) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function toggleGame(game: GameName) {
    setForm(f => ({
      ...f,
      selected_games: f.selected_games.includes(game)
        ? f.selected_games.filter(g => g !== game)
        : [...f.selected_games, game],
    }))
  }

  function setGameDetail(game: GameName, key: string, val: string) {
    setForm(f => ({
      ...f,
      game_details: {
        ...f.game_details,
        [game]: { ...(f.game_details[game] ?? {}), [key]: val },
      },
    }))
  }

  function toggleLang(lang: string) {
    setForm(f => ({
      ...f,
      language: f.language.includes(lang)
        ? f.language.filter(l => l !== lang)
        : [...f.language, lang],
    }))
  }

  function validateStep(): boolean {
    if (step === 1) {
      if (!form.username || form.username.length < 3) { toast.error('Username must be 3+ characters'); return false }
      if (!form.display_name) { toast.error('Display name is required'); return false }
      if (!form.age || +form.age < 13) { toast.error('You must be at least 13'); return false }
    }
    if (step === 2 && form.selected_games.length === 0) {
      toast.error('Select at least one game'); return false
    }
    if (step === 3) {
      if (!form.region) { toast.error('Select your region'); return false }
      if (form.language.length === 0) { toast.error('Select at least one language'); return false }
    }
    return true
  }

  function next() {
    if (!validateStep()) return
    setDirection(1)
    setStep(s => Math.min(s + 1, TOTAL_STEPS))
  }

  function back() {
    setDirection(-1)
    setStep(s => Math.max(s - 1, 1))
  }

  // Map rank label to numeric tier for sorting
  function getRankTier(game: GameName, rank: string): number {
    const meta = GAMES.find(g => g.id === game)
    if (!meta) return 1
    const idx = meta.ranks.indexOf(rank)
    return idx === -1 ? 1 : idx + 1
  }

  async function handleSubmit() {
    if (!validateStep()) return
    setSaving(true)

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) { toast.error('Session expired, please login again'); setSaving(false); return }

    // Upsert main profile
    const { error: profileErr } = await supabase.from('profiles').upsert({
      id: user.id,
      username: form.username,
      display_name: form.display_name,
      age: parseInt(form.age),
      gender: form.gender || null,
      bio: form.bio || null,
      region: form.region,
      language: form.language,
      connection_intent: form.connection_intent,
      profile_complete: true,
    })

    if (profileErr) {
      if (profileErr.code === '23505') toast.error('Username already taken — try another')
      else toast.error('Failed to save profile: ' + profileErr.message)
      setSaving(false)
      return
    }

    // Insert gaming profiles
    if (form.selected_games.length > 0) {
      const gRows = form.selected_games.map((game, idx) => {
        const det = form.game_details[game] ?? {}
        return {
          profile_id: user.id,
          game,
          game_id: det.game_id || null,
          rank: det.rank || null,
          rank_tier: det.rank ? getRankTier(game, det.rank) : null,
          role: det.role || null,
          is_primary: idx === 0,
        }
      })

      const { error: gErr } = await supabase
        .from('gaming_profiles')
        .upsert(gRows, { onConflict: 'profile_id,game' })

      if (gErr) { toast.error('Failed to save games'); setSaving(false); return }
    }

    toast.success('Profile created! Welcome to SquadMatch 🎮')
    router.push('/browse')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] grid-bg flex items-start justify-center pt-8 pb-16 px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <a href="/" className="font-display text-2xl font-bold text-white inline-block mb-6">
            SQUAD<span className="text-brand-400">MATCH</span>
          </a>
          <h1 className="font-display text-3xl font-bold text-white mb-1">Set up your profile</h1>
          <p className="text-white/40 text-sm">Takes 2 minutes</p>
        </div>

        <StepDots step={step} />

        {/* Step card */}
        <div className="card-surface p-6 mb-6 overflow-hidden" style={{ minHeight: 360 }}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {step === 1 && <Step1 data={form} onChange={setField} />}
              {step === 2 && <Step2 data={form} onToggleGame={toggleGame} onGameDetail={setGameDetail} />}
              {step === 3 && <Step3 data={form} onChange={setField} onToggleLang={toggleLang} />}
              {step === 4 && <Step4 data={form} onChange={setField} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Nav buttons */}
        <div className="flex gap-3">
          {step > 1 && (
            <button onClick={back} className="btn-ghost flex-1 py-3">
              ← Back
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button onClick={next} className="btn-primary flex-1 py-3">
              Continue →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="btn-primary flex-1 py-3 disabled:opacity-50"
            >
              {saving ? 'Creating profile…' : 'Finish & Find Matches 🎮'}
            </button>
          )}
        </div>

        <p className="text-center text-white/20 text-xs mt-4">
          Step {step} of {TOTAL_STEPS}
        </p>
      </div>
    </div>
  )
}
