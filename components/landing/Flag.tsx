// Country flag sprites — faithful SVG vexillology

const FLAGS: Record<string, { name: string; svg: React.ReactElement }> = {
  FR: { name: 'France', svg: <svg viewBox="0 0 30 20"><rect width="10" height="20" fill="var(--brand)"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="var(--error)"/></svg> },
  US: { name: 'USA', svg: <svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#fff"/>{([0,2,4,6,8,10,12] as number[]).map(i => <rect key={i} y={i*1.54} width="30" height="1.54" fill="var(--error)"/>)}<rect width="12" height="10.78" fill="var(--brand)"/></svg> },
  GB: { name: 'United Kingdom', svg: <svg viewBox="0 0 30 20"><rect width="30" height="20" fill="var(--surface-2)"/><path d="M0,0 L30,20 M30,0 L0,20" stroke="#fff" strokeWidth="3"/><path d="M0,0 L30,20 M30,0 L0,20" stroke="var(--error)" strokeWidth="1.5"/><path d="M15,0 V20 M0,10 H30" stroke="#fff" strokeWidth="5"/><path d="M15,0 V20 M0,10 H30" stroke="var(--error)" strokeWidth="3"/></svg> },
  DE: { name: 'Germany', svg: <svg viewBox="0 0 30 20"><rect width="30" height="6.67" fill="#000"/><rect y="6.67" width="30" height="6.67" fill="var(--error)"/><rect y="13.33" width="30" height="6.67" fill="var(--brand)"/></svg> },
  ES: { name: 'Spain', svg: <svg viewBox="0 0 30 20"><rect width="30" height="20" fill="var(--error)"/><rect y="5" width="30" height="10" fill="var(--brand)"/></svg> },
  IT: { name: 'Italy', svg: <svg viewBox="0 0 30 20"><rect width="10" height="20" fill="var(--gain)"/><rect x="10" width="10" height="20" fill="var(--brand)"/><rect x="20" width="10" height="20" fill="var(--error)"/></svg> },
  NL: { name: 'Netherlands', svg: <svg viewBox="0 0 30 20"><rect width="30" height="6.67" fill="var(--error)"/><rect y="6.67" width="30" height="6.67" fill="#fff"/><rect y="13.33" width="30" height="6.67" fill="var(--brand)"/></svg> },
  BE: { name: 'Belgium', svg: <svg viewBox="0 0 30 20"><rect width="10" height="20" fill="#000"/><rect x="10" width="10" height="20" fill="var(--brand)"/><rect x="20" width="10" height="20" fill="var(--error)"/></svg> },
  PT: { name: 'Portugal', svg: <svg viewBox="0 0 30 20"><rect width="12" height="20" fill="var(--surface-2)"/><rect x="12" width="18" height="20" fill="var(--error)"/><circle cx="12" cy="10" r="3.5" fill="var(--brand)" stroke="#fff" strokeWidth="0.4"/></svg> },
  CH: { name: 'Switzerland', svg: <svg viewBox="0 0 30 20"><rect width="30" height="20" fill="var(--error)"/><rect x="13" y="4" width="4" height="12" fill="#fff"/><rect x="9" y="8" width="12" height="4" fill="#fff"/></svg> },
  SE: { name: 'Sweden', svg: <svg viewBox="0 0 30 20"><rect width="30" height="20" fill="var(--brand)"/><rect x="9" width="3" height="20" fill="var(--brand)"/><rect y="8.5" width="30" height="3" fill="var(--brand)"/></svg> },
  NO: { name: 'Norway', svg: <svg viewBox="0 0 30 20"><rect width="30" height="20" fill="var(--error)"/><rect x="9" width="3" height="20" fill="#fff"/><rect y="8.5" width="30" height="3" fill="#fff"/><rect x="10" width="1" height="20" fill="var(--surface-2)"/><rect y="9.5" width="30" height="1" fill="var(--surface-2)"/></svg> },
  CA: { name: 'Canada', svg: <svg viewBox="0 0 30 20"><rect width="7.5" height="20" fill="var(--error)"/><rect x="22.5" width="7.5" height="20" fill="var(--error)"/><rect x="7.5" width="15" height="20" fill="#fff"/><path d="M15,5 L16,8 L19,8 L17,10 L18,13 L15,11 L12,13 L13,10 L11,8 L14,8 Z" fill="var(--error)"/></svg> },
  BR: { name: 'Brazil', svg: <svg viewBox="0 0 30 20"><rect width="30" height="20" fill="var(--gain)"/><polygon points="15,2.5 27.5,10 15,17.5 2.5,10" fill="var(--brand)"/><circle cx="15" cy="10" r="4" fill="var(--brand)"/></svg> },
  AR: { name: 'Argentina', svg: <svg viewBox="0 0 30 20"><rect width="30" height="6.67" fill="var(--brand)"/><rect y="6.67" width="30" height="6.67" fill="#fff"/><rect y="13.33" width="30" height="6.67" fill="var(--brand)"/><circle cx="15" cy="10" r="1.6" fill="var(--brand)"/></svg> },
  MX: { name: 'Mexico', svg: <svg viewBox="0 0 30 20"><rect width="10" height="20" fill="var(--surface-2)"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="var(--error)"/></svg> },
  JP: { name: 'Japan', svg: <svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="6" fill="var(--error)"/></svg> },
  KR: { name: 'South Korea', svg: <svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="4" fill="var(--error)"/><path d="M11,10 a4,4 0 0 1 8,0 a2,2 0 0 1 -4,0 a2,2 0 0 0 -4,0" fill="var(--brand)"/></svg> },
  CN: { name: 'China', svg: <svg viewBox="0 0 30 20"><rect width="30" height="20" fill="var(--error)"/><polygon points="6,3 7,5.5 9.5,5.5 7.5,7 8.3,9.5 6,8 3.7,9.5 4.5,7 2.5,5.5 5,5.5" fill="var(--brand)"/></svg> },
  AU: { name: 'Australia', svg: <svg viewBox="0 0 30 20"><rect width="30" height="20" fill="var(--surface-2)"/><path d="M0,0 L15,10 M15,0 L0,10" stroke="#fff" strokeWidth="1.5"/><path d="M7.5,0 V10 M0,5 H15" stroke="#fff" strokeWidth="2.5"/><path d="M7.5,0 V10 M0,5 H15" stroke="var(--error)" strokeWidth="1.5"/><polygon points="22,3 22.5,4.5 24,4.5 22.8,5.5 23.3,7 22,6 20.7,7 21.2,5.5 20,4.5 21.5,4.5" fill="#fff"/></svg> },
  PL: { name: 'Poland', svg: <svg viewBox="0 0 30 20"><rect width="30" height="10" fill="#fff"/><rect y="10" width="30" height="10" fill="var(--error)"/></svg> },
  RU: { name: 'Russia', svg: <svg viewBox="0 0 30 20"><rect width="30" height="6.67" fill="#fff"/><rect y="6.67" width="30" height="6.67" fill="var(--brand)"/><rect y="13.33" width="30" height="6.67" fill="var(--error)"/></svg> },
  UA: { name: 'Ukraine', svg: <svg viewBox="0 0 30 20"><rect width="30" height="10" fill="var(--brand)"/><rect y="10" width="30" height="10" fill="var(--brand)"/></svg> },
  TR: { name: 'Turkey', svg: <svg viewBox="0 0 30 20"><rect width="30" height="20" fill="var(--error)"/><circle cx="11" cy="10" r="4" fill="#fff"/><circle cx="12" cy="10" r="3.2" fill="var(--error)"/><polygon points="15.5,10 13.5,10.7 14.7,9 13.5,7.3 15.5,8" fill="#fff"/></svg> },
  ZA: { name: 'South Africa', svg: <svg viewBox="0 0 30 20"><rect width="30" height="10" fill="var(--error)"/><rect y="10" width="30" height="10" fill="var(--brand)"/><polygon points="0,0 10,10 0,20" fill="var(--gain)"/><polygon points="0,2 8,10 0,18" fill="#fff"/><polygon points="0,4 6,10 0,16" fill="#000"/></svg> },
  IE: { name: 'Ireland', svg: <svg viewBox="0 0 30 20"><rect width="10" height="20" fill="var(--gain)"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="var(--brand)"/></svg> },
}

export const FLAG_CODES = Object.keys(FLAGS)
export const FLAG_BANK = FLAGS

interface Props { code: string }

export default function Flag({ code }: Props) {
  const c = (code || '').toUpperCase()
  const f = FLAGS[c]
  return (
    <div style={{
      width: 30, height: 20, borderRadius: 3, overflow: 'hidden',
      boxShadow: '0 0 0 1px color-mix(in srgb, var(--overlay) 18%, transparent), 0 2px 4px rgba(0,0,0,.4)',
      flexShrink: 0,
    }}>
      {f ? f.svg : <div style={{ width: '100%', height: '100%', background: 'var(--surface-3)' }} />}
    </div>
  )
}
