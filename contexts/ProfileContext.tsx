'use client'
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js'

export type Profile = {
  id: string
  email: string | null
  username: string | null
  role: 'student' | 'coach' | 'admin'
  bio: string | null
  xp: number
  cal_url: string | null
  avatar_url: string | null
  onboarding_completed: boolean | null
  /* coach-specific */
  vision: string | null
  rooms: string[] | null
  variants: string[] | null
  advantages: string[] | null
  coaching_mode: 'auto' | 'manual' | null
  hourly_rate: number | null
  weekend_rate_pct: number | null
  coaching_packages: unknown[] | null
  years_experience: number | null
  is_pro: boolean | null
  /* legal */
  phone: string | null
  address_line: string | null
  city: string | null
  zip_code: string | null
  country: string | null
  is_company: boolean | null
  company_name: string | null
  siret: string | null
  vat_number: string | null
  /* payment */
  iban: string | null
  paypal_email: string | null
  stripe_account: string | null
  revolut_tag: string | null
  payment_notes: string | null
  /* preferences */
  notification_prefs: Record<string, boolean> | null
  privacy_prefs: Record<string, boolean> | null
  language: string | null
}

type ProfileContextValue = {
  user: User | null
  profile: Profile | null
  loading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), [])
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (u: User) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', u.id)
      .single()
    setProfile(data ?? null)
  }, [supabase])

  const refreshProfile = useCallback(async () => {
    if (!user) return
    await fetchProfile(user)
  }, [user, fetchProfile])

  useEffect(() => {
    let mounted = true

    // onAuthStateChange fires INITIAL_SESSION on mount — no separate getUser() needed.
    // getUser() acquires a Web Lock; calling it in parallel with onAuthStateChange causes
    // "lock stolen" errors in React Strict Mode (double-mount).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (!mounted) return
      const u = session?.user ?? null
      setUser(u)
      setLoading(false)   // unblock immediately — auth state is from localStorage, no network needed
      if (u) {
        fetchProfile(u)   // fire-and-forget — profile fills in ~200ms later
      } else {
        setProfile(null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }, [supabase])

  return (
    <ProfileContext.Provider value={{ user, profile, loading, refreshProfile, signOut }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used inside ProfileProvider')
  return ctx
}
