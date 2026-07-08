import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { COACHING_FEE_PCT } from '@/lib/constants'

/* Source unique d'écriture dans formation_purchases.
   Trois chemins de paiement passent ici (webhook Stripe, verify-session,
   redirect success de la page formation) : upsert sur (formation_id, user_id)
   pour que la ligne soit complète (montants inclus) quel que soit le chemin
   qui gagne la course. */
export async function recordPurchaseFromSession(
  admin: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<{ error: { message: string; code?: string } | null }> {
  const meta        = session.metadata ?? {}
  const formationId = meta.formation_id
  const userId      = meta.user_id
  const contentType = meta.content_type || null

  if (!formationId || !userId) {
    return { error: { message: 'Missing formation_id/user_id in session metadata' } }
  }

  /* Garde : si Stripe ne fournit pas de montant (session edge-case), on ne doit
     jamais écraser un montant correct déjà enregistré — insert-si-absent seulement. */
  if (session.amount_total == null) {
    const { error } = await admin.from('formation_purchases').upsert({
      formation_id: formationId,
      user_id:      userId,
    }, { onConflict: 'formation_id,user_id', ignoreDuplicates: true })
    return { error: error ? { message: error.message, code: error.code } : null }
  }

  const amountPaid     = Math.round(session.amount_total / 100) // euros, brut Stripe
  const platformFeePct = contentType === 'coaching' ? COACHING_FEE_PCT : 0
  const netAmount      = platformFeePct > 0
    ? Math.round(amountPaid / (1 + platformFeePct / 100)) // ce que touche le coach
    : amountPaid

  /* Limite connue : la table est UNIQUE(formation_id, user_id) — un rachat de
     coaching par le même élève écrase le montant du 1er achat (dernier gagnant).
     Corriger proprement = passer en ledger (1 ligne par session Stripe), ce qui
     impacte les checks hasPurchased en .single() → décision produit à part. */
  const { error } = await admin.from('formation_purchases').upsert({
    formation_id:     formationId,
    user_id:          userId,
    amount_paid:      amountPaid,
    net_amount:       netAmount,
    platform_fee_pct: platformFeePct,
  }, { onConflict: 'formation_id,user_id' })

  return { error: error ? { message: error.message, code: error.code } : null }
}
