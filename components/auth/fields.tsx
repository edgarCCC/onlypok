'use client'
import { useId, useState, type ChangeEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface TextFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'email' | 'tel' | 'date'
  placeholder?: string
  autoComplete?: string
  required?: boolean
  name?: string
}

export function TextField({ label, value, onChange, type = 'text', placeholder, autoComplete, required, name }: TextFieldProps) {
  const id = useId()
  return (
    <div className="ui-field">
      <label className="ui-field-label" htmlFor={id}>{label}</label>
      <input id={id} name={name} className="ui-input" type={type} value={value} placeholder={placeholder} autoComplete={autoComplete} required={required} onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)} />
    </div>
  )
}

interface PasswordFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
  minLength?: number
  labelAction?: React.ReactNode
  help?: string
}

export function PasswordField({ label, value, onChange, autoComplete, minLength, labelAction, help }: PasswordFieldProps) {
  const id = useId()
  const [visible, setVisible] = useState(false)
  return (
    <div className="ui-field">
      <div className="au-labelrow">
        <label className="ui-field-label" htmlFor={id}>{label}</label>
        {labelAction}
      </div>
      <div className="au-pw">
        <input id={id} className="ui-input" type={visible ? 'text' : 'password'} value={value} autoComplete={autoComplete} minLength={minLength} required onChange={(event) => onChange(event.target.value)} />
        <button type="button" className="au-pw-btn" aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} aria-pressed={visible} onClick={() => setVisible((v) => !v)}>
          {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        </button>
      </div>
      {help && <p className="ui-field-help">{help}</p>}
    </div>
  )
}

export function FormError({ children }: { children: React.ReactNode }) {
  if (!children) return null
  return <p className="ui-field-error" role="alert">{children}</p>
}

/** La marque Google garde ses quatre couleurs officielles : c'est la seule exception à la palette, imposée par Google. */
export function GoogleButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="ui-btn ui-btn-secondary au-google" onClick={onClick}>
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
      {label}
    </button>
  )
}
