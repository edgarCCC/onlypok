import type { Metadata } from 'next'
import { DM_Mono, Unbounded, Space_Grotesk } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'
import Providers from './providers'

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
})

const unbounded = Unbounded({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800', '900'],
  variable: '--font-syne',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-space',
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
    <html lang="fr" className={`${dmMono.variable} ${unbounded.variable} ${spaceGrotesk.variable}`}>
      <body>
        <Providers>{children}</Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
