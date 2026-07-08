import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { decryptPaymentField, encryptPaymentField, isPaymentEncryptionConfigured } from '@/lib/crypto'

/**
 * Coordonnées de paiement du coach (audit item 41).
 * Les champs sensibles ne transitent plus par un .update() Supabase côté client :
 * ils sont chiffrés (AES-256-GCM) côté serveur avant écriture, et déchiffrés
 * uniquement pour le propriétaire authentifié.
 */

/* Champs chiffrés au repos */
const ENCRYPTED_FIELDS = ['iban', 'paypal_email', 'stripe_account', 'revolut_tag', 'payment_notes'] as const
/* Champ non sensible (simple identifiant de méthode : 'iban' | 'paypal' | 'stripe' | 'revolut') */
const PLAIN_FIELDS = ['preferred_payment'] as const

type EncryptedField = (typeof ENCRYPTED_FIELDS)[number]
type PlainField = (typeof PLAIN_FIELDS)[number]
type PaymentField = EncryptedField | PlainField

const ALL_FIELDS: readonly PaymentField[] = [...ENCRYPTED_FIELDS, ...PLAIN_FIELDS]
const MAX_FIELD_LENGTH = 500

async function getAuthenticatedUser() {
  const userClient = await createServerSupabaseClient()
  const { data: { user } } = await userClient.auth.getUser()
  return user
}

// GET /api/coach/payment-info → champs déchiffrés du user authentifié uniquement
export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('profiles')
    .select(ALL_FIELDS.join(', '))
    .eq('id', user.id)
    .single<Record<PaymentField, string | null>>()

  if (error) {
    console.error('[payment-info] GET select failed:', error.message)
    return NextResponse.json({ error: 'Lecture impossible' }, { status: 500 })
  }

  const result: Record<string, string | null> = {}
  for (const field of ENCRYPTED_FIELDS) result[field] = decryptPaymentField(data?.[field] ?? null)
  for (const field of PLAIN_FIELDS) result[field] = data?.[field] ?? null

  return NextResponse.json(result)
}

// PUT /api/coach/payment-info → chiffre et écrit les champs du user authentifié
export async function PUT(req: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  /* Fail-closed en production : sans clé, on refuse d'écrire plutôt que de
     stocker silencieusement en clair. En dev, on dégrade (log dans lib/crypto). */
  if (!isPaymentEncryptionConfigured() && process.env.NODE_ENV === 'production') {
    console.error('[payment-info] PUT refusé : PAYMENT_INFO_ENC_KEY absente/invalide en production')
    return NextResponse.json({ error: 'Chiffrement non configuré — contactez le support' }, { status: 503 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Payload invalide' }, { status: 400 })
  }

  const payload = body as Record<string, unknown>
  const update: Record<string, string | null> = {}

  for (const field of ALL_FIELDS) {
    if (!(field in payload)) continue // update partiel autorisé
    const value = payload[field]
    if (value !== null && typeof value !== 'string') {
      return NextResponse.json({ error: `Champ ${field} invalide` }, { status: 400 })
    }
    if (typeof value === 'string' && value.length > MAX_FIELD_LENGTH) {
      return NextResponse.json({ error: `Champ ${field} trop long (max ${MAX_FIELD_LENGTH})` }, { status: 400 })
    }
    const normalized = value === '' ? null : value
    update[field] = (ENCRYPTED_FIELDS as readonly string[]).includes(field)
      ? encryptPaymentField(normalized)
      : normalized
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Aucun champ de paiement fourni' }, { status: 400 })
  }

  const admin = createAdminSupabaseClient()
  const { error } = await admin.from('profiles').update(update).eq('id', user.id)

  if (error) {
    console.error('[payment-info] PUT update failed:', error.message)
    return NextResponse.json({ error: 'Sauvegarde impossible' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
