import TrainerHub from '@/components/trainer/TrainerHub'

export default function StudentTrainerPage() {
  return <TrainerHub base="/train" links={[{ label: 'Voir les formations', href: '/formations' }, { label: 'Trouver un coach', href: '/coaches' }]} />
}
