'use client'
import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'

interface NumberStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
  disabled?: boolean
  style?: React.CSSProperties
}

export default function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  suffix,
  disabled = false,
  style,
}: NumberStepperProps) {
  const [focused, setFocused] = useState(false)

  function clamp(v: number) {
    return Math.min(max, Math.max(min, v))
  }

  function handleInput(raw: string) {
    const n = parseFloat(raw)
    if (!isNaN(n)) onChange(clamp(n))
    else if (raw === '' || raw === '-') onChange(min)
  }

  const btnBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    minWidth: 34,
    height: '100%',
    background: 'var(--surface-3)',
    border: 'none',
    color: disabled ? 'var(--text-disabled)' : 'var(--text-2)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background 120ms, color 120ms',
    flexShrink: 0,
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        background: 'var(--surface-2)',
        border: `1px solid ${focused ? 'var(--focus)' : 'var(--border-input)'}`,
        borderRadius: 10,
        overflow: 'hidden',
        height: 42,
        transition: 'border-color 150ms',
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - step))}
        onMouseEnter={e => { (e.currentTarget.style.background = 'var(--surface)') }}
        onMouseLeave={e => { (e.currentTarget.style.background = 'var(--surface-3)') }}
        style={{ ...btnBase, borderRight: '1px solid var(--border)' }}
      >
        <Minus size={13} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'center', position: 'relative' }}>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text)',
            fontSize: 14,
            fontWeight: 600,
            textAlign: 'center',
            fontFamily: 'inherit',
            padding: suffix ? '0 0 0 16px' : '0',
            MozAppearance: 'textfield',
          } as React.CSSProperties}
        />
        {suffix && (
          <span style={{ color: 'var(--text-3)', fontSize: 13, paddingRight: 8, flexShrink: 0 }}>
            {suffix}
          </span>
        )}
      </div>

      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={() => onChange(clamp(value + step))}
        onMouseEnter={e => { (e.currentTarget.style.background = 'var(--surface)') }}
        onMouseLeave={e => { (e.currentTarget.style.background = 'var(--surface-3)') }}
        style={{ ...btnBase, borderLeft: '1px solid var(--border)' }}
      >
        <Plus size={13} />
      </button>
    </div>
  )
}
