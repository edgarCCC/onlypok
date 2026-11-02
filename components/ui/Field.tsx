import { useId, type ChangeEvent, type HTMLInputAutoCompleteAttribute, type ReactNode } from 'react'
import { cx } from '@/lib/cx'

export type FieldType = 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number' | 'date' | 'time'

export interface FieldProps {
  label: ReactNode
  /** Identifiant du champ ; généré sinon. */
  id?: string
  name?: string
  type?: FieldType
  value?: string
  defaultValue?: string
  placeholder?: string
  /** Aide sous le champ, en --text-3 : « On t'envoie un lien de connexion. » */
  help?: ReactNode
  /** Erreur : message seul sous le champ, en --error, phrase concrète ; aria-invalid et aria-describedby sont posés. Aucun filet rouge (décision 3). */
  error?: ReactNode
  /** Rend un textarea. */
  multiline?: boolean
  rows?: number
  required?: boolean
  disabled?: boolean
  readOnly?: boolean
  autoComplete?: HTMLInputAutoCompleteAttribute
  inputMode?: 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url'
  maxLength?: number
  min?: number | string
  max?: number | string
  step?: number | string
  autoFocus?: boolean
  /** Reçoit la valeur texte, comme SelectInput et NumberStepper. */
  onChange?: (value: string) => void
  onBlur?: () => void
  className?: string
  /** Classe posée sur l'input (largeur, états forcés de la page de kit). */
  inputClassName?: string
}

export default function Field({
  label, id, name, type = 'text', value, defaultValue, placeholder, help, error, multiline = false, rows = 4,
  required, disabled, readOnly, autoComplete, inputMode, maxLength, min, max, step, autoFocus,
  onChange, onBlur, className, inputClassName,
}: FieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const helpId = `${fieldId}-help`
  const errorId = `${fieldId}-error`
  const describedBy = [help ? helpId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined
  const handleChange = onChange
    ? (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value)
    : undefined
  const shared = {
    id: fieldId,
    name,
    value,
    defaultValue,
    placeholder,
    required,
    disabled,
    readOnly,
    autoComplete,
    maxLength,
    autoFocus,
    className: cx('ui-input', inputClassName),
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    onChange: handleChange,
    onBlur,
  }

  return (
    <div className={cx('ui-field', className)}>
      <label className="ui-field-label" htmlFor={fieldId}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {multiline
        ? <textarea {...shared} rows={rows} />
        : <input {...shared} type={type} inputMode={inputMode} min={min} max={max} step={step} />}
      {help ? <p className="ui-field-help" id={helpId}>{help}</p> : null}
      {error ? <p className="ui-field-error" id={errorId} role="alert">{error}</p> : null}
    </div>
  )
}
