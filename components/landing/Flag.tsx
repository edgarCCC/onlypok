// Country flag sprites — faithful SVG vexillology

const FLAGS: Record<string, { name: string; svg: React.ReactElement }> = {
  FR: { name: 'France', svg: <svg viewBox="0 0 30 20"><rect width="10" height="20" fill="#0055A4"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#EF4135"/></svg> },
  US: { name: 'USA', svg: <svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#fff"/>{([0,2,4,6,8,10,12] as number[]).map(i => <rect key={i} y={i*1.54} width="30" height="1.54" fill="#B22234"/>)}<rect width="12" height="10.78" fill="#3C3B6E"/></svg> },
  GB: { name: 'United Kingdom', svg: <svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#012169"/><path d="M0,0 L30,20 M30,0 L0,20" stroke="#fff" strokeWidth="3"/><path d="M0,0 L30,20 M30,0 L0,20" stroke="#C8102E" strokeWidth="1.5"/><path d="M15,0 V20 M0,10 H30" stroke="#fff" strokeWidth="5"/><path d="M15,0 V20 M0,10 H30" stroke="#C8102E" strokeWidth="3"/></svg> },
  DE: { name: 'Germany', svg: <svg viewBox="0 0 30 20"><rect width="30" height="6.67" fill="#000"/><rect y="6.67" width="30" height="6.67" fill="#DD0000"/><rect y="13.33" width="30" height="6.67" fill="#FFCE00"/></svg> },
  ES: { name: 'Spain', svg: <svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#AA151B"/><rect y="5" width="30" height="10" fill="#F1BF00"/></svg> },
  IT: { name: 'Italy', svg: <svg viewBox="0 0 30 20"><rect width="10" height="20" fill="#008C45"/><rect x="10" width="10" height="20" fill="#F4F9FF"/><rect x="20" width="10" height="20" fill="#CD212A"/></svg> },
  NL: { name: 'Netherlands', svg: <svg viewBox="0 0 30 20"><rect width="30" height="6.67" fill="#AE1C28"/><rect y="6.67" width="30" height="6.67" fill="#fff"/><rect y="13.33" width="30" height="6.67" fill="#21468B"/></svg> },
  BE: { name: 'Belgium', svg: <svg viewBox="0 0 30 20"><rect width="10" height="20" fill="#000"/><rect x="10" width="10" height="20" fill="#FAE042"/><rect x="20" width="10" height="20" fill="#ED2939"/></svg> },
  PT: { name: 'Portugal', svg: <svg viewBox="0 0 30 20"><rect width="12" height="20" fill="#006600"/><rect x="12" width="18" height="20" fill="#FF0000"/><circle cx="12" cy="10" r="3.5" fill="#FFCC00" stroke="#fff" strokeWidth="0.4"/></svg> },
  CH: { name: 'Switzerland', svg: <svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#FF0000"/><rect x="13" y="4" width="4" height="12" fill="#fff"/><rect x="9" y="8" width="12" height="4" fill="#fff"/></svg> },
  SE: { name: 'Sweden', svg: <svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#006AA7"/><rect x="9" width="3" height="20" fill="#FECC00"/><rect y="8.5" width="30" height="3" fill="#FECC00"/></svg> },
  NO: { name: 'Norway', svg: <svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#EF2B2D"/><rect x="9" width="3" height="20" fill="#fff"/><rect y="8.5" width="30" height="3" fill="#fff"/><rect x="10" width="1" height="20" fill="#002868"/><rect y="9.5" width="30" height="1" fill="#002868"/></svg> },
  CA: { name: 'Canada', svg: <svg viewBox="0 0 30 20"><rect width="7.5" height="20" fill="#FF0000"/><rect x="22.5" width="7.5" height="20" fill="#FF0000"/><rect x="7.5" width="15" height="20" fill="#fff"/><path d="M15,5 L16,8 L19,8 L17,10 L18,13 L15,11 L12,13 L13,10 L11,8 L14,8 Z" fill="#FF0000"/></svg> },
  BR: { name: 'Brazil', svg: <svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#009C3B"/><polygon points="15,2.5 27.5,10 15,17.5 2.5,10" fill="#FFDF00"/><circle cx="15" cy="10" r="4" fill="#002776"/></svg> },
  AR: { name: 'Argentina', svg: <svg viewBox="0 0 30 20"><rect width="30" height="6.67" fill="#74ACDF"/><rect y="6.67" width="30" height="6.67" fill="#fff"/><rect y="13.33" width="30" height="6.67" fill="#74ACDF"/><circle cx="15" cy="10" r="1.6" fill="#F6B40E"/></svg> },
  MX: { name: 'Mexico', svg: <svg viewBox="0 0 30 20"><rect width="10" height="20" fill="#006847"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#CE1126"/></svg> },
  JP: { name: 'Japan', svg: <svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="6" fill="#BC002D"/></svg> },
  KR: { name: 'South Korea', svg: <svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="4" fill="#CD2E3A"/><path d="M11,10 a4,4 0 0 1 8,0 a2,2 0 0 1 -4,0 a2,2 0 0 0 -4,0" fill="#0047A0"/></svg> },
  CN: { name: 'China', svg: <svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#DE2910"/><polygon points="6,3 7,5.5 9.5,5.5 7.5,7 8.3,9.5 6,8 3.7,9.5 4.5,7 2.5,5.5 5,5.5" fill="#FFDE00"/></svg> },
  AU: { name: 'Australia', svg: <svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#012169"/><path d="M0,0 L15,10 M15,0 L0,10" stroke="#fff" strokeWidth="1.5"/><path d="M7.5,0 V10 M0,5 H15" stroke="#fff" strokeWidth="2.5"/><path d="M7.5,0 V10 M0,5 H15" stroke="#E4002B" strokeWidth="1.5"/><polygon points="22,3 22.5,4.5 24,4.5 22.8,5.5 23.3,7 22,6 20.7,7 21.2,5.5 20,4.5 21.5,4.5" fill="#fff"/></svg> },
  PL: { name: 'Poland', svg: <svg viewBox="0 0 30 20"><rect width="30" height="10" fill="#fff"/><rect y="10" width="30" height="10" fill="#DC143C"/></svg> },
  RU: { name: 'Russia', svg: <svg viewBox="0 0 30 20"><rect width="30" height="6.67" fill="#fff"/><rect y="6.67" width="30" height="6.67" fill="#0039A6"/><rect y="13.33" width="30" height="6.67" fill="#D52B1E"/></svg> },
  UA: { name: 'Ukraine', svg: <svg viewBox="0 0 30 20"><rect width="30" height="10" fill="#005BBB"/><rect y="10" width="30" height="10" fill="#FFD500"/></svg> },
  TR: { name: 'Turkey', svg: <svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#E30A17"/><circle cx="11" cy="10" r="4" fill="#fff"/><circle cx="12" cy="10" r="3.2" fill="#E30A17"/><polygon points="15.5,10 13.5,10.7 14.7,9 13.5,7.3 15.5,8" fill="#fff"/></svg> },
  ZA: { name: 'South Africa', svg: <svg viewBox="0 0 30 20"><rect width="30" height="10" fill="#E03C31"/><rect y="10" width="30" height="10" fill="#002395"/><polygon points="0,0 10,10 0,20" fill="#007749"/><polygon points="0,2 8,10 0,18" fill="#fff"/><polygon points="0,4 6,10 0,16" fill="#000"/></svg> },
  IE: { name: 'Ireland', svg: <svg viewBox="0 0 30 20"><rect width="10" height="20" fill="#169B62"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#FF883E"/></svg> },
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
      boxShadow: '0 0 0 1px rgba(255,255,255,.18), 0 2px 4px rgba(0,0,0,.4)',
      flexShrink: 0,
    }}>
      {f ? f.svg : <div style={{ width: '100%', height: '100%', background: '#3a3a3a' }} />}
    </div>
  )
}
