export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#080c10' }}>
      {children}
    </div>
  )
}
