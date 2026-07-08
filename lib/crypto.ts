import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

/**
 * Chiffrement des coordonnées de paiement (audit item 41).
 *
 * AES-256-GCM via le module `crypto` de Node — aucune dépendance externe.
 * Clé : process.env.PAYMENT_INFO_ENC_KEY (32 bytes, encodés en hex ou base64).
 *   Génération : openssl rand -hex 32
 *
 * Format stocké : enc:v1:<iv_b64>:<tag_b64>:<ciphertext_b64>
 * Le préfixe `enc:v1:` distingue les valeurs chiffrées des anciennes valeurs
 * en clair → migration progressive sans casse (rétrocompat lecture).
 *
 * Si la clé est absente/invalide : on loggue une erreur claire et on
 * lit/écrit en clair pour ne pas casser la prod.
 */

const ENC_PREFIX = 'enc:v1:'
const ALGO = 'aes-256-gcm'
const IV_LENGTH = 12 // recommandé pour GCM
const KEY_LENGTH = 32 // AES-256

let warnedMissingKey = false

function warnMissingKey(reason: string) {
  if (warnedMissingKey) return
  warnedMissingKey = true
  console.error(
    `[lib/crypto] PAYMENT_INFO_ENC_KEY ${reason} — les coordonnées de paiement ` +
    `sont traitées EN CLAIR. Génère une clé : openssl rand -hex 32, ` +
    `puis définis PAYMENT_INFO_ENC_KEY dans l'environnement.`
  )
}

/** Décode la clé env (hex 64 chars ou base64 de 32 bytes). null si absente/invalide. */
function getEncryptionKey(): Buffer | null {
  const raw = process.env.PAYMENT_INFO_ENC_KEY
  if (!raw) {
    warnMissingKey('manquante')
    return null
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw.trim())) {
    return Buffer.from(raw.trim(), 'hex')
  }
  try {
    const decoded = Buffer.from(raw.trim(), 'base64')
    if (decoded.length === KEY_LENGTH) return decoded
  } catch {
    // tombe dans le warn ci-dessous
  }
  warnMissingKey('invalide (attendu : 32 bytes en hex — 64 caractères — ou base64)')
  return null
}

/** true si une clé de chiffrement valide est disponible dans l'environnement */
export function isPaymentEncryptionConfigured(): boolean {
  return getEncryptionKey() !== null
}

/** true si la valeur est déjà au format chiffré enc:v1: */
export function isEncryptedPaymentValue(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(ENC_PREFIX)
}

/**
 * Chiffre une valeur de paiement. Renvoie null pour null/vide.
 * Si la clé env manque : log d'erreur et renvoie la valeur en clair (pas de casse prod).
 * Une valeur déjà chiffrée est renvoyée telle quelle (idempotent).
 */
export function encryptPaymentField(plain: string | null | undefined): string | null {
  if (plain === null || plain === undefined || plain === '') return null
  if (isEncryptedPaymentValue(plain)) return plain

  const key = getEncryptionKey()
  if (!key) return plain

  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGO, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return `${ENC_PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`
}

/**
 * Déchiffre une valeur stockée.
 * - null → null
 * - valeur sans préfixe enc:v1: → renvoyée telle quelle (anciennes données en clair)
 * - valeur chiffrée + clé absente ou déchiffrement impossible → log d'erreur + null
 */
export function decryptPaymentField(stored: string | null | undefined): string | null {
  if (stored === null || stored === undefined || stored === '') return null
  if (!isEncryptedPaymentValue(stored)) return stored // rétrocompat données en clair

  const key = getEncryptionKey()
  if (!key) {
    console.error('[lib/crypto] Valeur chiffrée rencontrée mais PAYMENT_INFO_ENC_KEY indisponible — impossible de déchiffrer.')
    return null
  }

  const parts = stored.slice(ENC_PREFIX.length).split(':')
  if (parts.length !== 3) {
    console.error('[lib/crypto] Format enc:v1 invalide (3 segments attendus).')
    return null
  }

  try {
    const [ivB64, tagB64, ctB64] = parts
    const iv = Buffer.from(ivB64, 'base64')
    const tag = Buffer.from(tagB64, 'base64')
    const ciphertext = Buffer.from(ctB64, 'base64')
    const decipher = createDecipheriv(ALGO, key, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
  } catch (err: unknown) {
    console.error('[lib/crypto] Échec de déchiffrement (clé changée ou donnée corrompue):', err instanceof Error ? err.message : err)
    return null
  }
}
