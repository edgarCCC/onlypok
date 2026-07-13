import { redirect } from 'next/navigation'

/* La home du tracker entre directement dans l'app : le dashboard gère
   lui-même les états déconnecté et vide. */
export default function TrackerHome() {
  redirect('/tracker/dashboard')
}
