import Link from 'next/link'

export default function VerifyEmailPage() {
  return (
    <div className="card-surface p-8 text-center">
      <div className="text-5xl mb-4">📧</div>
      <h1 className="font-display text-2xl font-bold text-white mb-3">Check your email</h1>
      <p className="text-white/50 text-sm mb-6 leading-relaxed">
        We sent a confirmation link to your inbox. Click it to activate your account and set up your gaming profile.
      </p>
      <p className="text-white/30 text-xs">
        Already confirmed?{' '}
        <Link href="/auth/login" className="text-brand-400 hover:text-brand-300">
          Sign in
        </Link>
      </p>
    </div>
  )
}
