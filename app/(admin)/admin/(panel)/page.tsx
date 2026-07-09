import AdminPanel from '@/components/admin/AdminPanel'

export const metadata = { title: 'Administration' }

export default function AdminHomePage() {
  return <AdminPanel validationsHref="/admin/validations" />
}
