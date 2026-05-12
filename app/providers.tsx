'use client'
import { ProfileProvider } from '@/contexts/ProfileContext'

export default function Providers({ children }: { children: React.ReactNode }) {
  return <ProfileProvider>{children}</ProfileProvider>
}
