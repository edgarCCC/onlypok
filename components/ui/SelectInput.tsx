'use client'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface SelectOption {
  value: string
  label: string
}

interface SelectInputProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  style?: React.CSSProperties
  id?: string
}

export default function SelectInput({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  style,
  id,
}: SelectInputProps) {
  const [focused, setFocused] = useState(false)

  return (
    <div style={{ position: 'relative', width: '100%', ...style }}>
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%',
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${focused ? 'rgba(124,58,237,0.5)' : 'rgba(232,228,220,0.08)'}`,
          borderRadius: 10,
          padding: '11px 40px 11px 14px',
          color: value ? '#f0f4ff' : 'rgba(240,244,255,0.35)',
          fontSize: 14,
          outline: 'none',
          fontFamily: 'inherit',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'border-color 150ms',
          WebkitAppearance: 'none',
          MozAppearance: 'none',
          appearance: 'none',
        }}
      >
        {placeholder && (
          <option value="" disabled hidden style={{ color: 'rgba(240,244,255,0.35)' }}>
            {placeholder}
          </option>
        )}
        {options.map(opt => (
          <option
            key={opt.value}
            value={opt.value}
            style={{ background: '#0d0f18', color: '#f0f4ff' }}
          >
            {opt.label}
          </option>
        ))}
      </select>

      <ChevronDown
        size={15}
        style={{
          position: 'absolute',
          right: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'rgba(240,244,255,0.4)',
          pointerEvents: 'none',
          transition: 'color 150ms',
        }}
      />
    </div>
  )
}
