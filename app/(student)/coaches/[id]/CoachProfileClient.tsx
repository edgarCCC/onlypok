'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CoachProfileClient({ id }: { id: string }) {
  const router = useRouter()
  useEffect(() => {
    router.replace('/coaches')
  }, [router])
  return null
}
