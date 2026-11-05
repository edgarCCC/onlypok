import type { Metadata } from 'next'
import { Unbounded } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'
import Providers from './providers'

// Unbounded ne sert plus qu'au logotype : tout le reste est en police système (styles/tokens.css).
const unbounded = Unbounded({
  subsets: ['latin'],
  weight: ['700'],
  variable: '--font-logo',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://onlypok.com'),
  title: {
    default: 'OnlyPok — La plateforme des joueurs de poker',
    template: '%s — OnlyPok',
  },
  description: 'Formations, coaching et outils pour progresser au poker. Apprenez des meilleurs, progressez vite.',
  openGraph: {
    title: 'OnlyPok — La plateforme des joueurs de poker',
    description: 'Formations, coaching et outils pour progresser au poker. Apprenez des meilleurs, progressez vite.',
    siteName: 'OnlyPok',
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OnlyPok — La plateforme des joueurs de poker',
    description: 'Formations, coaching et outils pour progresser au poker.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={unbounded.variable} suppressHydrationWarning>
      <head>
      </head>
      <body>
        <Providers>{children}</Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
