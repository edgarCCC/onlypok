'use client'
import { usePathname } from 'next/navigation'
import StudentHeader from '@/components/layout/StudentHeader'

export default function StudentLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // these pages have their own inline fixed header
  const hideHeader = pathname.startsWith('/formations') || pathname.startsWith('/coaches')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#07090e' }}>
      {!hideHeader && <StudentHeader />}
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  )
}
