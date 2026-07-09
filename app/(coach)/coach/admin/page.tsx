import AdminPanel from '@/components/admin/AdminPanel'

/* Accès admin historique via l'espace coach.
   L'interface dédiée est /admin (login séparé : /admin/login). */
export default function CoachAdminPage() {
  return <AdminPanel validationsHref="/coach/admin/validations" />
}
