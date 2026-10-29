import { Suspense } from 'react'
import AgendaClient from './AgendaClient'

export const metadata = { title: 'Agenda — Espace coach' }

export default function CoachAgendaPage() {
  return (
    <Suspense fallback={null}>
      <AgendaClient />
    </Suspense>
  )
}
