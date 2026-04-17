import CoachSidebar from '@/components/layout/CoachSidebar'

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <CoachSidebar />
      <main style={{ flex: 1, padding: '32px', minWidth: 0 }}>
        {children}
      </main>
    </div>
  )
}
