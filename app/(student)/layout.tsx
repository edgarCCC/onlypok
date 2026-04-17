import StudentSidebar from '@/components/layout/StudentSidebar'

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <StudentSidebar />
      <main style={{ flex: 1, padding: '32px', minWidth: 0 }}>
        {children}
      </main>
    </div>
  )
}
