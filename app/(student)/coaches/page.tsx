import { redirect } from 'next/navigation'

/* L'annuaire coachs est intégré à la marketplace (onglet Coachs).
   Cette route redirige pour ne pas casser les anciens liens.
   Le profil public /coaches/[id] reste actif. */
export default function CoachesPage() {
  redirect('/formations?tab=coaching')
}
