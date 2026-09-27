import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Lit le profil complet de l'utilisateur connecté (colonnes privées incluses).
 *
 * Depuis la migration RLS (sql/security-rls.sql), les colonnes privées de
 * `profiles` ne sont plus lisibles par un select direct : on passe par la RPC
 * `get_my_profile()`. Tant que la migration n'est pas exécutée (fonction
 * absente, PGRST202), on retombe sur l'ancien select pour ne rien casser.
 */
export async function fetchOwnProfile(supabase: SupabaseClient, userId: string) {
  const rpc = await supabase.rpc('get_my_profile').maybeSingle()
  if (!rpc.error || rpc.error.code !== 'PGRST202') return rpc
  return supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
}
