import { redirect } from 'next/navigation'

/* Fusionnée dans l'Agenda coach (onglets). Gardée pour les anciens liens (emails, favoris). */
export default function CoachCalendarRedirect() {
  redirect('/coach/agenda?tab=availability')
}
