'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AuthShell from '@/components/auth/AuthShell'
import { FormError, PasswordField, TextField } from '@/components/auth/fields'

export default function AdminLoginPage() {
  const supabase = createClient()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [err,      setErr]      = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) {
      setErr('Identifiants incorrects')
      setLoading(false)
      return
    }

    /* Porte réservée aux admins : tout autre rôle est déconnecté immédiatement */
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', data.user.id).single()

    if (profile?.role !== 'admin') {
      await supabase.auth.signOut()
      setErr("Ce compte n'a pas les droits administrateur")
      setLoading(false)
      return
    }

    // Navigation dure : le middleware relit les cookies de session
    window.location.href = '/admin'
  }

  return (
    <AuthShell title="Administration" subtitle="Accès réservé aux administrateurs d’OnlyPok.">
      <form className="au-form" onSubmit={submit}>
        <TextField label="Adresse email" type="email" value={email} onChange={setEmail} autoComplete="email" required />
        <PasswordField label="Mot de passe" value={password} onChange={setPassword} autoComplete="current-password" />
        <FormError>{err}</FormError>
        <button type="submit" className="ui-btn ui-btn-primary au-submit" disabled={loading} aria-busy={loading}>
          {loading && <span className="ui-spinner" aria-hidden="true" />}
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </AuthShell>
  )
}
