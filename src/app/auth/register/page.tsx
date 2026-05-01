'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleOAuth(provider: 'google' | 'discord') {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Check your email to confirm your account!')
      router.push('/auth/verify-email')
    }
    setLoading(false)
  }

  return (
    <div className="card-surface p-8">
      <h1 className="font-display text-3xl font-bold text-white mb-2">Join SquadMatch</h1>
      <p className="text-white/40 text-sm mb-8">Find your gaming squad for free</p>

      <div className="space-y-3 mb-6">
        <button
          onClick={() => handleOAuth('google')}
          className="w-full flex items-center justify-center gap-3 bg-surface-700 hover:bg-surface-600 border border-white/10 hover:border-white/20 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 active:scale-95"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign up with Google
        </button>

        <button
          onClick={() => handleOAuth('discord')}
          className="w-full flex items-center justify-center gap-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 active:scale-95"
        >
          <svg width="20" height="16" viewBox="0 0 20 16" fill="white">
            <path d="M16.93 1.33A16.1 16.1 0 0 0 13.07 0c-.16.3-.35.7-.48 1.02a15 15 0 0 0-4.58 0A10.8 10.8 0 0 0 7.54 0a16.2 16.2 0 0 0-3.87 1.34A17.2 17.2 0 0 0 .7 11.9a15.3 15.3 0 0 0 4.7 2.42c.38-.52.72-1.08 1-1.66-.55-.21-1.08-.47-1.57-.78.13-.1.26-.2.38-.31a10.9 10.9 0 0 0 9.56 0c.13.11.26.21.39.31-.5.31-1.02.57-1.58.78.29.59.63 1.14 1.01 1.67a15.3 15.3 0 0 0 4.71-2.43 17.1 17.1 0 0 0-2.97-10.57ZM6.68 9.78c-.99 0-1.8-.93-1.8-2.07 0-1.14.79-2.08 1.8-2.08 1.02 0 1.82.94 1.8 2.08 0 1.14-.78 2.07-1.8 2.07Zm6.64 0c-.99 0-1.8-.93-1.8-2.07 0-1.14.8-2.08 1.8-2.08 1.01 0 1.82.94 1.8 2.08 0 1.14-.78 2.07-1.8 2.07Z"/>
          </svg>
          Sign up with Discord
        </button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-white/30 text-xs">or email</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="text-white/60 text-sm mb-1.5 block">Email</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="input-dark" />
        </div>
        <div>
          <label className="text-white/60 text-sm mb-1.5 block">Password</label>
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" className="input-dark" />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full py-3 disabled:opacity-50">
          {loading ? 'Creating account…' : 'Create free account'}
        </button>
      </form>

      <p className="text-center text-white/30 text-xs mt-6">
        By signing up you agree to our{' '}
        <Link href="/terms" className="text-brand-500/70 hover:text-brand-400">Terms</Link> and{' '}
        <Link href="/privacy" className="text-brand-500/70 hover:text-brand-400">Privacy Policy</Link>
      </p>
      <p className="text-center text-white/40 text-sm mt-4">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-brand-400 hover:text-brand-300">Sign in</Link>
      </p>
    </div>
  )
}
