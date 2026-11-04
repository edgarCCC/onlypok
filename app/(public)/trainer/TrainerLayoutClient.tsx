'use client'
import RoleHeader from '@/components/layout/RoleHeader'

export default function TrainerLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
      <RoleHeader />
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  )
}
