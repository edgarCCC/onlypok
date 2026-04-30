import CoachLayoutClient from './CoachLayoutClient'

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return <CoachLayoutClient>{children}</CoachLayoutClient>
}
