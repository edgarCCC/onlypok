/* ─── Nettoyage des données de démonstration ──────────────────────────────────
   Supprime tout ce que scripts/seed-mock-data.mjs a créé : comptes
   @mock.onlypok.fr, profils, formations, avis, preuves et avatars.

   Usage : node scripts/cleanup-mock-data.mjs
──────────────────────────────────────────────────────────────────────────────── */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const MOCK_DOMAIN = '@mock.onlypok.fr'

console.log('── Cleanup OnlyPok mock data ──')

/* Récupère tous les comptes mock (pagination) */
const mockUsers = []
let page = 1
while (true) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
  if (error) throw error
  mockUsers.push(...data.users.filter(u => u.email?.endsWith(MOCK_DOMAIN)))
  if (data.users.length < 200) break
  page++
}
console.log(`comptes mock trouvés : ${mockUsers.length}`)
if (mockUsers.length === 0) { console.log('Rien à nettoyer.'); process.exit(0) }

const ids = mockUsers.map(u => u.id)

for (const [table, col] of [
  ['reviews', 'student_id'], ['reviews', 'coach_id'],
  ['coach_proofs', 'coach_id'], ['formations', 'coach_id'],
]) {
  const { error, count } = await admin.from(table).delete({ count: 'exact' }).in(col, ids)
  if (error) console.warn(`${table}(${col}) : ${error.message}`)
  else console.log(`${table}(${col}) supprimés : ${count ?? 0}`)
}

/* Avatars stockés sous avatars/mock/ */
const { data: files } = await admin.storage.from('avatars').list('mock', { limit: 200 })
if (files?.length) {
  await admin.storage.from('avatars').remove(files.map(f => `mock/${f.name}`))
  console.log(`avatars supprimés : ${files.length}`)
}

const { error: pErr } = await admin.from('profiles').delete().in('id', ids)
if (pErr) console.warn(`profiles : ${pErr.message}`)

let deleted = 0
for (const u of mockUsers) {
  const { error } = await admin.auth.admin.deleteUser(u.id)
  if (error) console.warn(`deleteUser ${u.email} : ${error.message}`)
  else deleted++
}
console.log(`comptes auth supprimés : ${deleted}`)
console.log('── Terminé ──')
