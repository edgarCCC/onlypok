import TrainerHub from '@/components/trainer/TrainerHub'

export default function CoachTrainerPage() {
  return <TrainerHub base="/coach/trainer" links={[{ label: 'Mes formations', href: '/coach/formations' }]} />
}
