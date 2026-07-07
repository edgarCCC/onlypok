import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/assert-admin'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { encryptPaymentField, isEncryptedPaymentValue } from '@/lib/crypto'

/**
 * Migration ponctuelle (audit item 41) : chiffre toutes les coordonnées de
 * paiement encore stockées EN CLAIR dans `profiles`.
 * Idempotente : les valeurs déjà au format enc:v1: sont ignorées.
 *
 * POST /api/admin/encrypt-payment-info — admin uniquement.
 */

const ENCRYPTED_FIELDS = ['iban', 'paypal_email', 'stripe_account', 'revolut_tag', 'payment_notes'] as const

type ProfileRow = { id: string } & Record<(typeof ENCRYPTED_FIELDS)[number], string | null>

export async function POST() {
  const adminUser = await assertAdmin()
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Refus explicite si la clé n'est pas configurée : sans elle, encryptPaymentField
  // renverrait le clair et la "migration" ne ferait rien (faux sentiment de sécurité).
  if (!process.env.PAYMENT_INFO_ENC_KEY) {
    return NextResponse.json(
      { error: 'PAYMENT_INFO_ENC_KEY manquante — génère-la (openssl rand -hex 32) et configure-la avant de migrer.' },
      { status: 500 }
    )
  }

  const admin = createAdminSupabaseClient()
  const { data: rows, error } = await admin
    .from('profiles')
    .select(['id', ...ENCRYPTED_FIELDS].join(', '))
    .returns<ProfileRow[]>()

  if (error) {
    console.error('[encrypt-payment-info] select failed:', error.message)
    return NextResponse.json({ error: 'Lecture des profils impossible' }, { status: 500 })
  }

  let scanned = 0
  let updated = 0
  let fieldsEncrypted = 0
  const failures: string[] = []

  for (const row of rows ?? []) {
    scanned++
    const update: Record<string, string | null> = {}

    for (const field of ENCRYPTED_FIELDS) {
      const value = row[field]
      if (value === null || value === '' || isEncryptedPaymentValue(value)) continue
      const encrypted = encryptPaymentField(value)
      // Sécurité : n'écrit que si le chiffrement a réellement eu lieu
      if (encrypted !== null && isEncryptedPaymentValue(encrypted)) {
        update[field] = encrypted
        fieldsEncrypted++
      }
    }

    if (Object.keys(update).length === 0) continue

    const { error: updateError } = await admin.from('profiles').update(update).eq('id', row.id)
    if (updateError) {
      console.error(`[encrypt-payment-info] update failed for ${row.id}:`, updateError.message)
      failures.push(row.id)
    } else {
      updated++
    }
  }

  return NextResponse.json({
    ok: failures.length === 0,
    scanned,
    profilesUpdated: updated,
    fieldsEncrypted,
    failures,
  })
}
