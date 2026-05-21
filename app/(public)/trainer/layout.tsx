export default function TrainerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#07090e' }}>
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  )
}
