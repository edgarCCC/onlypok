'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AuthShell from '@/components/auth/AuthShell'
import { FormError, TextField } from '@/components/auth/fields'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
    setLoading(false)
    if (error) { setError('Impossible d’envoyer l’email. Réessaie dans quelques minutes.'); return }
    setSent(true)
  }

  if (sent) {
    return (
      <AuthShell title="Vérifie ta boîte mail" subtitle={<>Si un compte existe pour <strong>{email}</strong>, tu recevras un lien pour choisir un nouveau mot de passe.</>}>
        <Link href="/login" className="au-link">Retour à la connexion</Link>
      </AuthShell>
    )
  }
  return (
    <AuthShell title="Mot de passe oublié" subtitle="Entre ton adresse email, on t’envoie un lien pour en choisir un nouveau.">
      <form className="au-form" onSubmit={handleSubmit}>
        <TextField label="Adresse email" type="email" value={email} onChange={setEmail} placeholder="toi@exemple.com" autoComplete="email" required />
        <FormError>{error}</FormError>
        <button type="submit" className="ui-btn ui-btn-primary au-submit" disabled={loading} aria-busy={loading}>
          {loading && <span className="ui-spinner" aria-hidden="true" />}
          {loading ? 'Envoi…' : 'Envoyer le lien'}
        </button>
      </form>
      <p className="au-switch"><Link href="/login" className="au-quiet">Retour à la connexion</Link></p>
    </AuthShell>
  )
}
