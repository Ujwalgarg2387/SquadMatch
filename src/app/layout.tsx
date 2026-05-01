import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'SquadMatch — Find Your Gaming Squad',
  description: 'Match with Indian gamers by game, rank, and playstyle. BGMI, Free Fire, Valorant, CS2 and more.',
  keywords: ['gaming', 'BGMI', 'Free Fire', 'Valorant', 'squad', 'India', 'gamer dating'],
  openGraph: {
    title: 'SquadMatch',
    description: 'India\'s gaming match platform',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#1a1a24',
              color: '#e8e8f0',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              fontFamily: 'var(--font-body)',
            },
            success: { iconTheme: { primary: '#39ff14', secondary: '#0a0a0f' } },
            error:   { iconTheme: { primary: '#ff375f', secondary: '#0a0a0f' } },
          }}
        />
      </body>
    </html>
  )
}
