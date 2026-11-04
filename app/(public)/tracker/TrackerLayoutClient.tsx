'use client'
import RoleHeader from '@/components/layout/RoleHeader'

export default function TrackerLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RoleHeader />
      {children}
    </>
  )
}
