/* ─── Validation des entrées des routes API (Q11) ────────────────────────────
   Helper maison, sans dépendance. zod n'est pas dans package.json (il n'arrive
   dans node_modules que par @anthropic-ai/sdk et eslint-config-next) : s'y
   accrocher serait une dépendance fantôme, décision laissée à Edgar.

   - readJsonBody(req, schéma, { tag }) : Content-Type JSON obligatoire (415),
     corps borné et lu en flux (413 dès que la limite est dépassée), JSON
     invalide (400), schéma (400) → `{ ok: true, data }` typé, sinon
     `{ ok: false, response }` prête à renvoyer. Le motif (champ + raison,
     JAMAIS la valeur reçue) est journalisé sous `[tag]` ; le client reçoit un
     message court en français, jamais un message brut (JSON.parse, Supabase,
     Stripe).
   - readFormFile(req, { tag, maxBytes }) : même contrat pour un upload multipart
     (Content-Length contrôlé avant de lire le formulaire).
   - Validateurs composables : uuid (renvoyé en minuscules), int, string (NUL et
     substituts isolés refusés, option truncate), oneOf, boolean, optional,
     object ; prédicats isUuid, isInt ; parseJson sûr. Les dates ISO restent à
     parseIsoInstant / validateSlot (lib/slots.ts), pas de doublon ici.

   Module pur (aucun import Next), testé sans serveur dans tests/e2e/validate.spec.ts :
   E2E_BASE_URL=http://127.0.0.1:9 npx playwright test validate --grep-invert "serveur requis" --reporter=list
   ─────────────────────────────────────────────────────────────────────────── */

export interface Issue { field: string; message: string }
export type Result<T> = { ok: true; data: T } | { ok: false; errors: Issue[] }
/** Un validateur reçoit une valeur inconnue et le nom du champ (repris dans le message). */
export type Validator<T> = (value: unknown, field?: string) => Result<T>
export type Infer<V> = V extends Validator<infer T> ? T : never

const ok = <T>(data: T): Result<T> => ({ ok: true, data })
const fail = (field: string, message: string): Result<never> => ({ ok: false, errors: [{ field, message }] })

/* ── Prédicats et validateurs de champ ─────────────────────────────────────── */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

/** UUID renvoyé en minuscules : Postgres compare les uuid sans casse, mais les
    comparaisons JS des routes (user.id === user_id) y sont sensibles. */
export function uuid(): Validator<string> {
  return (value, field = 'valeur') => (isUuid(value) ? ok(value.toLowerCase()) : fail(field, 'identifiant (UUID) attendu'))
}

export interface IntOptions { min?: number; max?: number }

/** Entier JSON strict (jamais une chaîne numérique), NaN et Infinity refusés. */
export function isInt(value: unknown, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER }: IntOptions = {}): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
}

export function int(opts: IntOptions = {}): Validator<number> {
  const bounds =
    opts.min !== undefined && opts.max !== undefined ? ` entre ${opts.min} et ${opts.max}`
    : opts.min !== undefined ? ` ≥ ${opts.min}`
    : opts.max !== undefined ? ` ≤ ${opts.max}`
    : ''
  return (value, field = 'valeur') => (isInt(value, opts) ? ok(value) : fail(field, `entier${bounds} attendu`))
}

export interface StringOptions {
  max: number
  /** 0 par défaut : la chaîne vide passe. min = 1 → « texte requis ». */
  min?: number
  /** Sans drapeau g (lastIndex rendrait le test non déterministe). */
  pattern?: RegExp
  /** Au-delà de `max`, tronque au lieu de refuser (valeur d'affichage venant de la base, ex. un titre). */
  truncate?: boolean
}

const NUL = String.fromCharCode(0)

export function string({ max, min = 0, pattern, truncate = false }: StringOptions): Validator<string> {
  return (value, field = 'valeur') => {
    if (typeof value !== 'string') return fail(field, 'texte attendu')
    // NUL et substituts UTF-16 isolés : Postgres (text, jsonb) les refuse → sans ce contrôle, 500 générique.
    if (value.includes(NUL) || !value.isWellFormed()) return fail(field, 'caractères invalides')
    if (value.length < min) return fail(field, min === 1 ? 'texte requis' : `texte trop court (min ${min} caractères)`)
    // toWellFormed : une paire de substituts coupée par la troncature devient U+FFFD, jamais un substitut isolé.
    const text = truncate && value.length > max ? value.slice(0, max).toWellFormed() : value
    if (text.length > max) return fail(field, `texte trop long (max ${max} caractères)`)
    if (pattern && !pattern.test(text)) return fail(field, 'format invalide')
    return ok(text)
  }
}

export function oneOf<const T extends readonly (string | number)[]>(values: T): Validator<T[number]> {
  const allowed: readonly unknown[] = values
  return (value, field = 'valeur') =>
    (allowed.includes(value) ? ok(value as T[number]) : fail(field, `valeur attendue : ${values.join(', ')}`))
}

export function boolean(): Validator<boolean> {
  return (value, field = 'valeur') => (typeof value === 'boolean' ? ok(value) : fail(field, 'booléen attendu'))
}

/* ── Combinateurs ──────────────────────────────────────────────────────────── */

/** Champ facultatif : absent (undefined) ou null passent tels quels, sinon le validateur interne s'applique. */
export function optional<T>(inner: Validator<T>): Validator<T | null | undefined> {
  return (value, field) => (value === undefined || value === null ? ok(value) : inner(value, field))
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

type Shape = Record<string, Validator<unknown>>
export type InferShape<S extends Shape> = { [K in keyof S]: Infer<S[K]> }

/** Objet JSON : chaque clé déclarée est validée, les clés inconnues sont ignorées
    (jamais recopiées : pas d'affectation de masse). Une clé absente reste absente
    de `data` (`'champ' in data` garde son sens). Toutes les erreurs sont remontées. */
export function object<S extends Shape>(shape: S): Validator<InferShape<S>> {
  return (value, field = 'body') => {
    if (!isPlainObject(value)) return fail(field, 'objet JSON attendu')
    const data: Record<string, unknown> = {}
    const errors: Issue[] = []
    for (const key of Object.keys(shape)) {
      const present = Object.prototype.hasOwnProperty.call(value, key)
      const result = shape[key](present ? value[key] : undefined, key)
      if (!result.ok) errors.push(...(present ? result.errors : [{ field: key, message: 'champ requis' }]))
      else if (present) data[key] = result.data
    }
    return errors.length > 0 ? { ok: false, errors } : ok(data as InferShape<S>)
  }
}

/* ── Corps de requête ──────────────────────────────────────────────────────── */

/** JSON.parse sans exception. Le message du parseur n'est pas conservé : depuis
    Node 20 il cite un extrait du corps (IBAN, notes…), il ne doit ni sortir ni être journalisé. */
export function parseJson(text: string): Result<unknown> {
  try {
    return ok(JSON.parse(text) as unknown)
  } catch {
    return fail('body', 'JSON invalide')
  }
}

/** 16 Ko : le plus gros corps JSON légitime par défaut ; les routes plus gourmandes passent `maxBytes`. */
export const DEFAULT_MAX_BODY_BYTES = 16 * 1024
/** Marge multipart (en-têtes de parties, délimiteurs) tolérée au-dessus de `maxBytes` sur le Content-Length. */
export const MULTIPART_OVERHEAD_BYTES = 64 * 1024

export type RejectionCode = 'unsupported_media_type' | 'payload_too_large' | 'invalid_json' | 'invalid_form' | 'invalid_input'

export interface Rejection {
  ok: false
  status: 400 | 413 | 415
  code: RejectionCode
  error: string
  errors: Issue[]
  /** Réponse JSON prête à renvoyer : { error, code, issues? }. */
  response: Response
}

export function jsonError(status: number, error: string, extra: Record<string, unknown> = {}): Response {
  return new Response(JSON.stringify({ error, ...extra }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function reject(tag: string, status: Rejection['status'], code: RejectionCode, error: string, errors: Issue[] = []): Rejection {
  // Champ + motif seulement : jamais la valeur reçue, ni le message du parseur.
  console.warn(`[${tag}] requête refusée`, { status, code, issues: errors.map(e => `${e.field}: ${e.message}`) })
  const extra = errors.length > 0 ? { code, issues: errors } : { code }
  return { ok: false, status, code, error, errors, response: jsonError(status, error, extra) }
}

function mediaType(req: Request): string {
  return (req.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
}

/** Content-Length annoncé, ou null s'il est absent ou illisible. */
function declaredLength(req: Request): number | null {
  const header = req.headers.get('content-length')
  if (header === null) return null
  const declared = Number(header)
  return Number.isFinite(declared) ? declared : null
}

/** Lit le corps en flux et s'arrête dès que `maxBytes` est dépassé (null = trop volumineux). */
async function readBodyWithin(req: Request, maxBytes: number): Promise<Uint8Array | null> {
  const declared = declaredLength(req)
  if (declared !== null && declared > maxBytes) return null
  if (!req.body) return new Uint8Array(0)
  const reader = req.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined)
      return null
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

function describe(errors: Issue[]): string {
  const [first] = errors
  const more = errors.length > 1 ? ` (+${errors.length - 1})` : ''
  return `Requête invalide — ${first.field} : ${first.message}${more}.`
}

export interface ReadJsonOptions {
  /** Préfixe de log, ex. 'stripe/checkout'. */
  tag: string
  maxBytes?: number
}

/** Content-Type (415) → taille (413) → JSON (400) → schéma (400) → data typé. Ne lève jamais. */
export async function readJsonBody<T>(
  req: Request,
  schema: Validator<T>,
  { tag, maxBytes = DEFAULT_MAX_BODY_BYTES }: ReadJsonOptions,
): Promise<{ ok: true; data: T } | Rejection> {
  if (mediaType(req) !== 'application/json') {
    return reject(tag, 415, 'unsupported_media_type', 'Content-Type application/json requis')
  }
  let bytes: Uint8Array | null
  try {
    bytes = await readBodyWithin(req, maxBytes)
  } catch {
    return reject(tag, 400, 'invalid_json', 'Corps de requête illisible')
  }
  if (bytes === null) {
    return reject(tag, 413, 'payload_too_large', `Corps trop volumineux (max ${Math.ceil(maxBytes / 1024)} Ko)`)
  }
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return reject(tag, 400, 'invalid_json', 'JSON invalide')
  }
  const parsed = parseJson(text)
  if (!parsed.ok) return reject(tag, 400, 'invalid_json', 'JSON invalide', parsed.errors)
  const result = schema(parsed.data, 'body')
  if (!result.ok) return reject(tag, 400, 'invalid_input', describe(result.errors), result.errors)
  return { ok: true, data: result.data }
}

export interface ReadFormFileOptions {
  tag: string
  maxBytes: number
  /** Nom du champ multipart ('file' par défaut). */
  field?: string
  /** Message client du 413 (sinon « Fichier trop lourd (max N Mo) »). */
  tooLargeMessage?: string
}

/* Duck typing : la classe File du runtime (undici) n'est pas forcément le File global. */
function isFileEntry(value: FormDataEntryValue | null): value is File {
  return typeof value === 'object' && value !== null
    && typeof (value as Blob).arrayBuffer === 'function' && typeof (value as Blob).size === 'number'
}

/** Content-Type multipart (415) → Content-Length (413, avant toute lecture) → formulaire
    lisible (400) → champ fichier présent et non vide (400) → taille réelle (413). */
export async function readFormFile(
  req: Request,
  { tag, maxBytes, field = 'file', tooLargeMessage }: ReadFormFileOptions,
): Promise<{ ok: true; file: File } | Rejection> {
  if (mediaType(req) !== 'multipart/form-data') {
    return reject(tag, 415, 'unsupported_media_type', 'Content-Type multipart/form-data requis')
  }
  const tooLarge = () =>
    reject(tag, 413, 'payload_too_large', tooLargeMessage ?? `Fichier trop lourd (max ${Math.round(maxBytes / 1_048_576)} Mo)`)
  const declared = declaredLength(req)
  if (declared !== null && declared > maxBytes + MULTIPART_OVERHEAD_BYTES) return tooLarge()
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return reject(tag, 400, 'invalid_form', 'Formulaire invalide')
  }
  const file = form.get(field)
  if (!isFileEntry(file)) {
    return reject(tag, 400, 'invalid_input', `Requête invalide — ${field} : fichier attendu.`, [{ field, message: 'fichier attendu' }])
  }
  if (file.size === 0) {
    return reject(tag, 400, 'invalid_input', `Requête invalide — ${field} : fichier vide.`, [{ field, message: 'fichier vide' }])
  }
  if (file.size > maxBytes) return tooLarge()
  return { ok: true, file }
}
