export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] grid-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="font-display text-3xl font-bold text-white tracking-wide inline-block">
            SQUAD<span className="text-brand-400">MATCH</span>
          </a>
        </div>
        {children}
      </div>
    </div>
  )
}
