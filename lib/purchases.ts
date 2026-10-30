import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { COACHING_FEE_PCT } from '@/lib/constants'

type PurchaseError = { message: string; code?: string } | null

/* Colonne stripe_session_id absente = migration sql/formation-purchases-ledger.sql
   pas encore exécutée. 42703 : colonne inconnue dans un filtre ; PGRST204 :
   colonne inconnue du cache de schéma PostgREST à l'écriture. */
function isLedgerMissing(err: { code?: string } | null): boolean {
  if (!err) return false
  return err.code === '42703' || err.code === 'PGRST204'
}

const toErr = (e: { message: string; code?: string } | null): PurchaseError =>
  e ? { message: e.message, code: e.code } : null

/* Source unique d'écriture dans formation_purchases.
   Trois chemins de paiement passent ici (webhook Stripe, verify-session,
   redirect success de la page formation), parfois en même temps.

   Registre (R10) : UNE LIGNE PAR PAIEMENT, clé unique stripe_session_id. Un
   second achat de coaching par le même élève crée une nouvelle ligne au lieu
   d'écraser le montant du premier. Idempotent : rejouer la même session ne
   crée jamais de doublon (ligne déjà là, ou 23505 sur la clé unique en cas de
   course entre deux chemins).

   Transition : les lignes antérieures à la migration n'ont pas de
   stripe_session_id. Si une session arrive (rejeu webhook, rechargement de
   l'URL de succès) et qu'une ligne « historique » lui correspond, on la
   rattache plutôt que d'en créer une seconde.

   Avant la migration SQL : repli automatique sur l'ancien upsert
   (formation_id, user_id) — aucune régression si le code est déployé avant. */
export async function recordPurchaseFromSession(
  admin: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<{ error: PurchaseError }> {
  const meta        = session.metadata ?? {}
  const formationId = meta.formation_id
  const userId      = meta.user_id
  const contentType = meta.content_type || null

  if (!formationId || !userId) {
    return { error: { message: 'Missing formation_id/user_id in session metadata' } }
  }

  /* Garde : si Stripe ne fournit pas de montant (session edge-case), on
     n'écrit aucun montant — jamais d'écrasement d'un montant correct. */
  const amounts = session.amount_total == null ? null : (() => {
    const amountPaid     = Math.round(session.amount_total! / 100) // euros, brut Stripe
    const platformFeePct = contentType === 'coaching' ? COACHING_FEE_PCT : 0
    const netAmount      = platformFeePct > 0
      ? Math.round(amountPaid / (1 + platformFeePct / 100)) // ce que touche le coach
      : amountPaid
    return { amount_paid: amountPaid, net_amount: netAmount, platform_fee_pct: platformFeePct }
  })()

  /* 1. Ce paiement est-il déjà enregistré ? */
  const { data: existing, error: existingError } = await admin
    .from('formation_purchases')
    .select('id')
    .eq('stripe_session_id', session.id)
    .limit(1)

  if (existingError) {
    if (isLedgerMissing(existingError)) return legacyUpsert(admin, formationId, userId, amounts)
    return { error: toErr(existingError) }
  }
  if (existing && existing.length > 0) return { error: null }

  /* 2. Ligne historique (sans stripe_session_id) à rattacher ?
     - formation / vidéo : un seul achat possible → la ligne historique EST
       ce paiement.
     - coaching : seulement si la ligne a été créée après l'ouverture de la
       session Stripe (= créée par ce paiement) ; sinon c'est un achat
       antérieur et ce paiement mérite sa propre ligne. */
  const { data: legacyRows, error: legacyError } = await admin
    .from('formation_purchases')
    .select('id, created_at')
    .eq('formation_id', formationId)
    .eq('user_id', userId)
    .is('stripe_session_id', null)
    .order('created_at', { ascending: false })
    .limit(1)
  if (legacyError) return { error: toErr(legacyError) }

  const legacy = legacyRows?.[0]
  const sessionCreatedMs = (session.created ?? 0) * 1000
  const legacyMatches = !!legacy && (
    contentType !== 'coaching'
    || (legacy.created_at != null && new Date(legacy.created_at).getTime() >= sessionCreatedMs)
  )
  if (legacy && legacyMatches) {
    const { error } = await admin
      .from('formation_purchases')
      .update({ stripe_session_id: session.id, ...(amounts ?? {}) })
      .eq('id', legacy.id)
      .is('stripe_session_id', null)
    if (!error) return { error: null }
    // 23505 : un autre chemin a enregistré cette session entre-temps — OK
    if (error.code === '23505') return { error: null }
    return { error: toErr(error) }
  }

  /* 3. Nouveau paiement : nouvelle ligne */
  const { error: insertError } = await admin.from('formation_purchases').insert({
    formation_id:      formationId,
    user_id:           userId,
    stripe_session_id: session.id,
    ...(amounts ?? {}),
  })
  if (!insertError) return { error: null }

  if (insertError.code === '23505') {
    /* Course entre webhook et verify-session : la même session vient d'être
       insérée par l'autre chemin → idempotent. Mais si la base a encore
       l'ancienne contrainte UNIQUE(formation_id, user_id) (migration
       partielle), on retombe sur l'ancien upsert pour ne rien perdre. */
    const { data: again } = await admin
      .from('formation_purchases').select('id').eq('stripe_session_id', session.id).limit(1)
    if (again && again.length > 0) return { error: null }
    return legacyUpsert(admin, formationId, userId, amounts)
  }
  if (isLedgerMissing(insertError)) return legacyUpsert(admin, formationId, userId, amounts)
  return { error: toErr(insertError) }
}

/* Ancien comportement (avant migration) : une ligne par (formation_id, user_id).
   Limite connue : un rachat de coaching écrase le montant du 1er achat. */
async function legacyUpsert(
  admin: SupabaseClient,
  formationId: string,
  userId: string,
  amounts: { amount_paid: number; net_amount: number; platform_fee_pct: number } | null,
): Promise<{ error: PurchaseError }> {
  const { error } = amounts
    ? await admin.from('formation_purchases').upsert({
        formation_id: formationId,
        user_id:      userId,
        ...amounts,
      }, { onConflict: 'formation_id,user_id' })
    : await admin.from('formation_purchases').upsert({
        formation_id: formationId,
        user_id:      userId,
      }, { onConflict: 'formation_id,user_id', ignoreDuplicates: true })
  return { error: toErr(error) }
}
