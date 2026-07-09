import { redirect } from 'next/navigation'
import { assertAdmin } from '@/lib/assert-admin'
import AdminTopbar from '@/components/admin/AdminTopbar'

/* Interface admin dédiée — indépendante des espaces coach/élève.
   Double protection : le middleware bloque déjà /admin/* pour les non-admins,
   ce layout revérifie côté serveur (défense en profondeur). */
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const user = await assertAdmin()
  if (!user) redirect('/admin/login')

  return (
    <div style={{ minHeight: '100vh', background: '#04040a' }}>
      <AdminTopbar email={user.email ?? ''} />
      {children}
    </div>
  )
}
