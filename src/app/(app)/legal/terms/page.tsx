import Link from 'next/link'

const LAST_UPDATED = 'April 8, 2026'

// ✅ FIXED TYPES
type Block = {
  text: string
  subtitle?: string
}

type Section = {
  title: string
  content: Block[]
}

const sections: Section[] = [
  {
    title: '1. Acceptance of terms',
    content: [
      {
        text: 'By using SquadMatch, you agree to these Terms and Conditions.',
      },
    ],
  },
  {
    title: '2. Your account',
    content: [
      {
        subtitle: 'Account responsibility',
        text: 'You are responsible for your account and its activity.',
      },
      {
        subtitle: 'Accurate information',
        text: 'You must provide accurate information.',
      },
    ],
  },
]

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] grid-bg">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-4xl mx-auto border-b border-white/5">
        <Link href="/" className="text-2xl font-bold text-white">
          SQUAD<span className="text-green-400">MATCH</span>
        </Link>
        <Link href="/auth/login" className="btn-ghost text-sm py-2 px-4">
          Sign in
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            Terms & Conditions
          </h1>
          <p className="text-white/40 text-sm">Last updated: {LAST_UPDATED}</p>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {sections.map((section) => (
            <div key={section.title} className="p-6 bg-white/5 rounded-xl">
              <h2 className="text-xl font-bold text-white mb-4">
                {section.title}
              </h2>

              {section.content.map((block, i) => (
                <div key={i} className="mb-4">
                  {/* ✅ NO ERROR */}
                  {block.subtitle && (
                    <h3 className="text-green-400 text-sm font-semibold mb-1">
                      {block.subtitle}
                    </h3>
                  )}
                  <p className="text-white/60 text-sm">{block.text}</p>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Link */}
        <div className="mt-10">
          <Link href="/legal/privacy" className="text-green-400">
            Privacy Policy →
          </Link>
        </div>
      </main>
    </div>
  )
}