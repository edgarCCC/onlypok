import type { Metadata } from 'next'
import TrackerLayoutClient from './TrackerLayoutClient'

export const metadata: Metadata = {
  title: 'Tracker poker — sessions, bankroll & stats',
  description:
    'Suis tes performances au poker : journal de sessions, courbe de bankroll et stats HUD (VPIP, PFR, 3-bet).',
}

export default function TrackerLayout({ children }: { children: React.ReactNode }) {
  return <TrackerLayoutClient>{children}</TrackerLayoutClient>
}
