'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import {
  GAMES, INDIAN_REGIONS, LANGUAGES, CONNECTION_INTENTS,
  type GameName, type ConnectionIntent,
} from '@/types'
import { getGameMeta } from '@/lib/utils'

export default function EditProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [userId, setUserId] = useState('')

  const [form, setForm] = useState({
    display_name: '',
    bio: '',
    age: '',
    gender: '',
    region: '',
    language: [] as string[],
    connection_intent: 'squad' as ConnectionIntent,
    avatar_url: '',
  })

  const [games, setGames] = useState<Array<{
    id?: string
    game: GameName
    rank: string
    role: string
    game_id: string
    is_primary: boolean
  }>>([])

  // Load current profile on mount
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('*, gaming_profiles(*)')
        .eq('id', user.id)
        .single()

      if (profile) {
        setForm({
          display_name: profile.display_name ?? '',
          bio: profile.bio ?? '',
          age: profile.age?.toString() ?? '',
          gender: profile.gender ?? '',
          region: profile.region ?? '',
          language: profile.language ?? [],
          connection_intent: profile.connection_intent ?? 'squad',
          avatar_url: profile.avatar_url ?? '',
        })
        setGames((profile.gaming_profiles ?? []).map((gp: any) => ({
          id: gp.id,
          game: gp.game,
          rank: gp.rank ?? '',
          role: gp.role ?? '',
          game_id: gp.game_id ?? '',
          is_primary: gp.is_primary ?? false,
        })))
      }
    }
    load()
  }, [supabase, router])

  // Photo upload via Cloudinary unsigned upload
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Photo must be under 5MB'); return }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    if (!cloudName) {
      toast.error('Photo upload not configured yet')
      return
    }

    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('upload_preset', 'squadmatch_avatars') // create this preset in Cloudinary dashboard
    fd.append('folder', 'avatars')

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()
      if (data.secure_url) {
        setForm(f => ({ ...f, avatar_url: data.secure_url }))
        toast.success('Photo uploaded!')
      } else {
        toast.error('Upload failed')
      }
    } catch {
      toast.error('Upload failed — check your Cloudinary config')
    }
    setUploading(false)
  }

  function toggleLang(lang: string) {
    setForm(f => ({
      ...f,
      language: f.language.includes(lang)
        ? f.language.filter(l => l !== lang)
        : [...f.language, lang],
    }))
  }

  function updateGame(idx: number, key: string, val: string) {
    setGames(gs => gs.map((g, i) => i === idx ? { ...g, [key]: val } : g))
  }

  function setPrimary(idx: number) {
    setGames(gs => gs.map((g, i) => ({ ...g, is_primary: i === idx })))
  }

  async function handleSave() {
    if (!form.display_name.trim()) { toast.error('Display name is required'); return }
    setSaving(true)

    const { error: profileErr } = await supabase
      .from('profiles')
      .update({
        display_name: form.display_name.trim(),
        bio: form.bio.trim() || null,
        age: form.age ? parseInt(form.age) : null,
        gender: form.gender || null,
        region: form.region,
        language: form.language,
        connection_intent: form.connection_intent,
        avatar_url: form.avatar_url || null,
      })
      .eq('id', userId)

    if (profileErr) { toast.error('Failed to save: ' + profileErr.message); setSaving(false); return }

    // Upsert gaming profiles
    for (const g of games) {
      const meta = getGameMeta(g.game)
      const rankTier = g.rank ? meta.ranks.indexOf(g.rank) + 1 : null
      await supabase.from('gaming_profiles').upsert({
        ...(g.id ? { id: g.id } : {}),
        profile_id: userId,
        game: g.game,
        rank: g.rank || null,
        rank_tier: rankTier || null,
        role: g.role || null,
        game_id: g.game_id || null,
        is_primary: g.is_primary,
      }, { onConflict: 'profile_id,game' })
    }

    toast.success('Profile saved!')
    router.push('/profile')
    router.refresh()
    setSaving(false)
  }

  return (
    <div className="px-5 pt-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-white/40 hover:text-white">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 className="font-display text-2xl font-bold text-white">EDIT PROFILE</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="ml-auto btn-primary py-2 px-4 text-sm disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* Avatar */}
      <div className="card-surface p-5 mb-4">
        <p className="text-white/50 text-sm mb-3">Profile photo</p>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-surface-600 flex items-center justify-center text-3xl overflow-hidden shrink-0">
            {form.avatar_url
              ? <img src={form.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              : '🎮'
            }
          </div>
          <div>
            <label className="btn-ghost text-sm py-2 px-4 cursor-pointer inline-block">
              {uploading ? 'Uploading…' : 'Upload photo'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={uploading}
              />
            </label>
            <p className="text-white/25 text-xs mt-1">JPG, PNG · max 5MB</p>
          </div>
        </div>
      </div>

      {/* Basic info */}
      <div className="card-surface p-5 mb-4 space-y-4">
        <h2 className="font-display text-base font-bold text-white">Basic info</h2>
        <div>
          <label className="text-white/50 text-xs mb-1 block">Display name *</label>
          <input className="input-dark" value={form.display_name}
            onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} maxLength={30} />
        </div>
        <div>
          <label className="text-white/50 text-xs mb-1 block">Bio</label>
          <textarea className="input-dark resize-none h-20" value={form.bio}
            onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} maxLength={300} />
          <p className="text-right text-white/20 text-xs mt-1">{form.bio.length}/300</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-white/50 text-xs mb-1 block">Age</label>
            <input type="number" className="input-dark" min={13} max={60} value={form.age}
              onChange={e => setForm(f => ({ ...f, age: e.target.value }))} />
          </div>
          <div>
            <label className="text-white/50 text-xs mb-1 block">Gender</label>
            <select className="input-dark" value={form.gender}
              onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Games */}
      <div className="card-surface p-5 mb-4">
        <h2 className="font-display text-base font-bold text-white mb-4">My games</h2>
        {games.length === 0 ? (
          <p className="text-white/30 text-sm">No games added.</p>
        ) : (
          <div className="space-y-4">
            {games.map((g, idx) => {
              const meta = getGameMeta(g.game)
              return (
                <div key={g.game} className="bg-surface-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{meta.emoji}</span>
                      <span className="text-white font-medium text-sm">{meta.label}</span>
                    </div>
                    <button
                      onClick={() => setPrimary(idx)}
                      className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                        g.is_primary
                          ? 'border-brand-500/50 text-brand-400 bg-brand-500/10'
                          : 'border-white/10 text-white/30 hover:text-white/60'
                      }`}
                    >
                      {g.is_primary ? '★ Main' : 'Set main'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-white/30 text-xs mb-1 block">Rank</label>
                      <select className="input-dark text-sm py-2" value={g.rank}
                        onChange={e => updateGame(idx, 'rank', e.target.value)}>
                        <option value="">Select rank</option>
                        {meta.ranks.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-white/30 text-xs mb-1 block">Role</label>
                      <select className="input-dark text-sm py-2" value={g.role}
                        onChange={e => updateGame(idx, 'role', e.target.value)}>
                        <option value="">Select role</option>
                        {meta.roles.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-white/30 text-xs mb-1 block">In-game ID</label>
                      <input className="input-dark text-sm py-2" value={g.game_id}
                        onChange={e => updateGame(idx, 'game_id', e.target.value)}
                        placeholder={`${meta.label} username`} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Region */}
      <div className="card-surface p-5 mb-4">
        <h2 className="font-display text-base font-bold text-white mb-3">Region</h2>
        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
          {INDIAN_REGIONS.map(r => (
            <button key={r} type="button" onClick={() => setForm(f => ({ ...f, region: r }))}
              className={`py-2 px-3 rounded-lg text-sm text-left transition-all ${
                form.region === r
                  ? 'bg-brand-500/20 border border-brand-500/50 text-brand-400'
                  : 'bg-surface-700 border border-white/8 text-white/50 hover:text-white/70'
              }`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Languages */}
      <div className="card-surface p-5 mb-4">
        <h2 className="font-display text-base font-bold text-white mb-3">Languages</h2>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map(lang => (
            <button key={lang} type="button" onClick={() => toggleLang(lang)}
              className={`py-1.5 px-3 rounded-lg text-sm transition-all ${
                form.language.includes(lang)
                  ? 'bg-brand-500/20 border border-brand-500/50 text-brand-400'
                  : 'bg-surface-700 border border-white/8 text-white/50 hover:text-white/70'
              }`}>
              {lang}
            </button>
          ))}
        </div>
      </div>

      {/* Connection intent */}
      <div className="card-surface p-5 mb-6">
        <h2 className="font-display text-base font-bold text-white mb-3">Looking for</h2>
        <div className="space-y-2">
          {CONNECTION_INTENTS.map(c => (
            <button key={c.value} type="button"
              onClick={() => setForm(f => ({ ...f, connection_intent: c.value }))}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                form.connection_intent === c.value
                  ? 'border-brand-500/60 bg-brand-500/10'
                  : 'border-white/10 bg-surface-700 hover:border-white/20'
              }`}>
              <span className="text-2xl">{c.emoji}</span>
              <div>
                <div className="text-white font-medium text-sm">{c.label}</div>
                <div className="text-white/40 text-xs">{c.desc}</div>
              </div>
              {form.connection_intent === c.value && (
                <div className="ml-auto text-brand-400 text-sm font-bold">✓</div>
              )}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary w-full py-3.5 text-base disabled:opacity-50"
      >
        {saving ? 'Saving changes…' : 'Save profile'}
      </button>
    </div>
  )
}
