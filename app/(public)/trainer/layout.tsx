import type { Metadata } from 'next'
import TrainerLayoutClient from './TrainerLayoutClient'

export const metadata: Metadata = {
  title: 'Trainer poker — ranges, équité & quiz',
  description:
    "Entraîne-toi gratuitement au poker : trainer de ranges préflop, calculateur d'équité Monte Carlo et quiz de stratégie corrigés.",
}

export default function TrainerLayout({ children }: { children: React.ReactNode }) {
  return <TrainerLayoutClient>{children}</TrainerLayoutClient>
}
