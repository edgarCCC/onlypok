import TrainerHub from '@/components/trainer/TrainerHub'

export default function TrainerPage() {
  return <TrainerHub base="/trainer" links={[{ label: 'Voir les formations', href: '/formations' }, { label: 'Trouver un coach', href: '/coaches' }]} />
}
