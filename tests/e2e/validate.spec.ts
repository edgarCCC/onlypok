import { test, expect } from '@playwright/test'
import {
  uuid, int, string, oneOf, boolean, optional, object,
  isUuid, isInt, parseJson, readJsonBody, readFormFile, DEFAULT_MAX_BODY_BYTES, MULTIPART_OVERHEAD_BYTES,
  type Infer, type Issue,
} from '../../lib/validate'

/* Validation des entrées des routes API (Q11). Tests unitaires du helper, sans
   navigateur ni serveur — exécution isolée sans démarrer le dev server :
   E2E_BASE_URL=http://127.0.0.1:9 npx playwright test validate --grep-invert "serveur requis" --reporter=list */

const UUID = '6f1e2d3c-4b5a-4c6d-8e7f-901234567890'
const URL_ = 'http://onlypok.test/api/x'
const NUL = String.fromCharCode(0)
const LONE_SURROGATE = String.fromCharCode(0xd83d)   // moitié haute d'un emoji, sans sa moitié basse
const ACE_OF_SPADES = String.fromCodePoint(0x1f0a1)  // paire de substituts complète (2 unités UTF-16)

const jsonRequest = (body: BodyInit, headers: Record<string, string> = { 'content-type': 'application/json' }) =>
  new Request(URL_, { method: 'POST', headers, body })

const formRequest = (entries: Array<[string, string | Blob, string?]>, headers: Record<string, string> = {}) => {
  const form = new FormData()
  for (const [key, value, name] of entries) {
    if (typeof value === 'string') form.append(key, value)
    else form.append(key, value, name)
  }
  return new Request(URL_, { method: 'POST', headers, body: form })
}

/* Les refus journalisent en console.warn : capturés ici (silence + vérification du contenu). */
let warnings: unknown[][] = []
const originalWarn = console.warn
test.beforeEach(() => { warnings = []; console.warn = (...args: unknown[]) => { warnings.push(args) } })
test.afterEach(() => { console.warn = originalWarn })

const firstIssue = <T,>(result: { ok: true; data: T } | { ok: false; errors: Issue[] }): Issue | null =>
  result.ok ? null : result.errors[0]

test.describe('uuid', () => {
  test('accepte un UUID en minuscules ou en majuscules, toujours renvoyé en minuscules', () => {
    expect(uuid()(UUID, 'booking_id')).toEqual({ ok: true, data: UUID })
    expect(uuid()(UUID.toUpperCase())).toEqual({ ok: true, data: UUID })
    expect(isUuid(UUID.toUpperCase())).toBe(true)
  })

  test('refuse chaîne tronquée, caractères non hex, accolades, nombre, null', () => {
    for (const value of [UUID.slice(0, 35), UUID.replace('6f', 'zz'), `{${UUID}}`, 42, null, undefined, `${UUID} `]) {
      expect(firstIssue(uuid()(value, 'booking_id'))).toEqual({ field: 'booking_id', message: 'identifiant (UUID) attendu' })
      expect(isUuid(value)).toBe(false)
    }
  })
})

test.describe('int', () => {
  test('int({ min: 0, max: 9 }) accepte les bornes et refuse hors bornes, décimal, chaîne, NaN, Infinity, booléen', () => {
    const packIndex = int({ min: 0, max: 9 })
    expect(packIndex(0)).toEqual({ ok: true, data: 0 })
    expect(packIndex(9)).toEqual({ ok: true, data: 9 })
    for (const value of [-1, 10, 1.5, '3', NaN, Infinity, true, null, undefined, 1e9]) {
      expect(firstIssue(packIndex(value, 'pack_index'))).toEqual({ field: 'pack_index', message: 'entier entre 0 et 9 attendu' })
    }
  })

  test('isInt sans bornes et messages des bornes simples', () => {
    expect(isInt(-5)).toBe(true)
    expect(isInt('5')).toBe(false)
    expect(firstIssue(int({ min: 1 })(0))?.message).toBe('entier ≥ 1 attendu')
    expect(firstIssue(int({ max: 3 })(4))?.message).toBe('entier ≤ 3 attendu')
    expect(firstIssue(int()('x'))?.message).toBe('entier attendu')
  })
})

test.describe('string', () => {
  test('string({ max: 5 }) accepte vide et 5 caractères, refuse 6 et un nombre', () => {
    const short = string({ max: 5 })
    expect(short('')).toEqual({ ok: true, data: '' })
    expect(short('abcde').ok).toBe(true)
    expect(firstIssue(short('abcdef', 'reason'))).toEqual({ field: 'reason', message: 'texte trop long (max 5 caractères)' })
    expect(firstIssue(short(42, 'reason'))).toEqual({ field: 'reason', message: 'texte attendu' })
  })

  test('min: 1 → « texte requis » ; pattern → « format invalide »', () => {
    expect(firstIssue(string({ min: 1, max: 10 })(''))?.message).toBe('texte requis')
    expect(firstIssue(string({ min: 3, max: 10 })('ab'))?.message).toBe('texte trop court (min 3 caractères)')
    const sessionId = string({ min: 1, max: 255, pattern: /^cs_[A-Za-z0-9_]+$/ })
    expect(sessionId('cs_test_a1B2c3').ok).toBe(true)
    expect(firstIssue(sessionId('pi_123'))?.message).toBe('format invalide')
    expect(firstIssue(sessionId('cs_test_a1 OR 1=1'))?.message).toBe('format invalide')
  })

  test('refuse NUL et les substituts UTF-16 isolés (Postgres les rejetterait en 500), accepte une paire complète', () => {
    const content = string({ max: 10 })
    expect(firstIssue(content(`a${NUL}b`, 'content'))).toEqual({ field: 'content', message: 'caractères invalides' })
    expect(firstIssue(content(LONE_SURROGATE, 'content'))?.message).toBe('caractères invalides')
    expect(firstIssue(content(`ok${LONE_SURROGATE}`, 'content'))?.message).toBe('caractères invalides')
    expect(content(ACE_OF_SPADES)).toEqual({ ok: true, data: ACE_OF_SPADES })
  })

  test('truncate: true tronque au lieu de refuser, sans laisser de substitut isolé', () => {
    const title = string({ max: 5, truncate: true })
    expect(title('abcdefgh')).toEqual({ ok: true, data: 'abcde' })
    expect(title('abc')).toEqual({ ok: true, data: 'abc' })
    const cut = title(`abcd${ACE_OF_SPADES}`) // la paire commence à l'index 4 : coupée, remplacée par U+FFFD
    expect(cut.ok).toBe(true)
    if (cut.ok) {
      expect(cut.data.length).toBe(5)
      expect(cut.data.isWellFormed()).toBe(true)
    }
  })
})

test.describe('oneOf et boolean', () => {
  test('oneOf accepte une valeur de la liste et refuse casse différente, inconnue, nombre', () => {
    const status = oneOf(['approved', 'rejected'])
    expect(status('approved')).toEqual({ ok: true, data: 'approved' })
    for (const value of ['APPROVED', 'deleted', 1, null]) {
      expect(firstIssue(status(value, 'status'))).toEqual({ field: 'status', message: 'valeur attendue : approved, rejected' })
    }
  })

  test('boolean accepte true/false et refuse "true", 1', () => {
    expect(boolean()(true)).toEqual({ ok: true, data: true })
    expect(boolean()(false).ok).toBe(true)
    expect(firstIssue(boolean()('true', 'acceptTerms'))).toEqual({ field: 'acceptTerms', message: 'booléen attendu' })
    expect(firstIssue(boolean()(1))?.message).toBe('booléen attendu')
  })
})

test.describe('optional et object', () => {
  test('optional laisse passer undefined et null, applique le validateur sinon', () => {
    const maybeInt = optional(int({ min: 0, max: 9 }))
    expect(maybeInt(undefined)).toEqual({ ok: true, data: undefined })
    expect(maybeInt(null)).toEqual({ ok: true, data: null })
    expect(maybeInt(3)).toEqual({ ok: true, data: 3 })
    expect(firstIssue(maybeInt('3', 'pack_index'))?.message).toBe('entier entre 0 et 9 attendu')
  })

  test('object refuse tableau, null, chaîne', () => {
    const schema = object({ booking_id: uuid() })
    for (const value of [[], null, 'x', 42]) {
      expect(firstIssue(schema(value))).toEqual({ field: 'body', message: 'objet JSON attendu' })
    }
  })

  test('object : champ requis absent → « champ requis », toutes les erreurs remontées ensemble', () => {
    const schema = object({ formation_id: uuid(), pack_index: optional(int({ min: 0, max: 9 })), status: oneOf(['approved', 'rejected']) })
    const result = schema({ pack_index: 12, status: 'x' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toEqual([
      { field: 'formation_id', message: 'champ requis' },
      { field: 'pack_index', message: 'entier entre 0 et 9 attendu' },
      { field: 'status', message: 'valeur attendue : approved, rejected' },
    ])
  })

  test('object : clés inconnues (dont __proto__ venu du JSON) ignorées, clé facultative absente reste absente, data typé', () => {
    const Schema = object({ student_id: uuid(), content: optional(string({ max: 100 })) })
    // Via JSON.parse : la clé __proto__ est alors une propriété propre (un littéral d'objet changerait le prototype).
    const input = JSON.parse(`{"student_id":"${UUID}","role":"admin","__proto__":{"polluted":true}}`) as Record<string, unknown>
    expect(Object.prototype.hasOwnProperty.call(input, '__proto__')).toBe(true)
    const result = Schema(input)
    expect(result).toEqual({ ok: true, data: { student_id: UUID } })
    if (!result.ok) return
    const data: Infer<typeof Schema> = result.data
    expect('content' in data).toBe(false)
    expect('role' in data).toBe(false)
    expect('__proto__' in data).toBe(true)                       // hérité de Object.prototype, comme tout objet
    expect(Object.prototype.hasOwnProperty.call(data, '__proto__')).toBe(false) // mais jamais recopié
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
    expect(data.content ?? '').toBe('')
    expect(Schema({ student_id: UUID, content: null })).toEqual({ ok: true, data: { student_id: UUID, content: null } })
  })
})

test.describe('parseJson', () => {
  test('JSON valide → data ; invalide → « JSON invalide » sans message du parseur', () => {
    expect(parseJson('{"a":1}')).toEqual({ ok: true, data: { a: 1 } })
    expect(parseJson('{nope')).toEqual({ ok: false, errors: [{ field: 'body', message: 'JSON invalide' }] })
    expect(parseJson('')).toEqual({ ok: false, errors: [{ field: 'body', message: 'JSON invalide' }] })
  })

  test('une clé __proto__ ne pollue pas Object.prototype', () => {
    const result = parseJson('{"__proto__":{"polluted":true}}')
    expect(result.ok).toBe(true)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })
})

const MAX_PACK_INDEX = 99
const CheckoutBody = object({
  formation_id: uuid(),
  pack_index:   optional(int({ min: 0, max: MAX_PACK_INDEX })),
  scheduled_at: optional(string({ max: 64 })),
})

test.describe('readJsonBody', () => {
  test('415 si le Content-Type n’est pas application/json (text/plain par défaut)', async () => {
    const result = await readJsonBody(jsonRequest('{}', {}), CheckoutBody, { tag: 'test' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(415)
    expect(result.response.status).toBe(415)
    expect(await result.response.json()).toEqual({ error: 'Content-Type application/json requis', code: 'unsupported_media_type' })
    expect(result.response.headers.get('content-type')).toContain('application/json')
  })

  test('accepte application/json avec charset', async () => {
    const req = jsonRequest(JSON.stringify({ formation_id: UUID }), { 'content-type': 'Application/JSON; charset=utf-8' })
    expect(await readJsonBody(req, CheckoutBody, { tag: 'test' })).toEqual({ ok: true, data: { formation_id: UUID } })
  })

  test('400 invalid_json pour un corps mal formé ou vide, sans extrait du corps', async () => {
    for (const body of ['{"formation_id": "SECRET-VALUE', '']) {
      const result = await readJsonBody(jsonRequest(body), CheckoutBody, { tag: 'test' })
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.status).toBe(400)
      const json = await result.response.json()
      expect(json).toEqual({ error: 'JSON invalide', code: 'invalid_json', issues: [{ field: 'body', message: 'JSON invalide' }] })
      expect(JSON.stringify(json)).not.toContain('SECRET')
    }
  })

  test('400 invalid_input : message court en français + issues, jamais la valeur reçue', async () => {
    const req = jsonRequest(JSON.stringify({ formation_id: 'not-a-uuid-SECRET', pack_index: 100 }))
    const result = await readJsonBody(req, CheckoutBody, { tag: 'test' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(400)
    expect(result.code).toBe('invalid_input')
    expect(result.error).toBe('Requête invalide — formation_id : identifiant (UUID) attendu (+1).')
    const json = await result.response.json()
    expect(json.code).toBe('invalid_input')
    expect(json.issues).toEqual([
      { field: 'formation_id', message: 'identifiant (UUID) attendu' },
      { field: 'pack_index', message: 'entier entre 0 et 99 attendu' },
    ])
    expect(JSON.stringify(json)).not.toContain('SECRET')
  })

  test('413 si content-length déclaré dépasse la limite', async () => {
    const req = jsonRequest('{}', { 'content-type': 'application/json', 'content-length': String(DEFAULT_MAX_BODY_BYTES + 1) })
    const result = await readJsonBody(req, CheckoutBody, { tag: 'test' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(413)
    expect(await result.response.json()).toEqual({ error: 'Corps trop volumineux (max 16 Ko)', code: 'payload_too_large' })
  })

  test('413 si le corps réel dépasse la limite sans content-length ; maxBytes personnalisable', async () => {
    const big = JSON.stringify({ formation_id: UUID, scheduled_at: 'x'.repeat(DEFAULT_MAX_BODY_BYTES) })
    const rejected = await readJsonBody(jsonRequest(big), CheckoutBody, { tag: 'test' })
    expect(rejected.ok).toBe(false)
    if (!rejected.ok) expect(rejected.status).toBe(413)

    const widened = await readJsonBody(jsonRequest(big), CheckoutBody, { tag: 'test', maxBytes: 64 * 1024 })
    expect(widened.ok).toBe(false)
    if (!widened.ok) expect(widened.errors).toEqual([{ field: 'scheduled_at', message: 'texte trop long (max 64 caractères)' }])
  })

  test('limite exacte : 16 384 octets acceptés, 16 385 refusés (413), sans content-length', async () => {
    const Wide = object({ formation_id: uuid(), pad: optional(string({ max: 100_000 })) })
    const bodyOf = (bytes: number) => {
      const skeleton = JSON.stringify({ formation_id: UUID, pad: '' })
      return JSON.stringify({ formation_id: UUID, pad: 'x'.repeat(bytes - skeleton.length) }) // ASCII : 1 octet par caractère
    }
    expect(new TextEncoder().encode(bodyOf(DEFAULT_MAX_BODY_BYTES)).byteLength).toBe(16_384)
    const exact = await readJsonBody(jsonRequest(bodyOf(DEFAULT_MAX_BODY_BYTES)), Wide, { tag: 'test' })
    expect(exact.ok).toBe(true)
    const over = await readJsonBody(jsonRequest(bodyOf(DEFAULT_MAX_BODY_BYTES + 1)), Wide, { tag: 'test' })
    expect(over.ok).toBe(false)
    if (!over.ok) expect(over.status).toBe(413)
  })

  test('corps valide → data typé, clés inconnues retirées, null facultatif conservé', async () => {
    const req = jsonRequest(JSON.stringify({ formation_id: UUID, pack_index: 2, scheduled_at: null, admin: true }))
    const result = await readJsonBody(req, CheckoutBody, { tag: 'test' })
    expect(result).toEqual({ ok: true, data: { formation_id: UUID, pack_index: 2, scheduled_at: null } })
    if (!result.ok) return
    const packIndex: number | null | undefined = result.data.pack_index
    expect(packIndex).toBe(2)
    expect(warnings).toHaveLength(0)
  })

  test('UTF-8 invalide → 400 invalid_json', async () => {
    const result = await readJsonBody(jsonRequest(new Uint8Array([0x7b, 0xff, 0xfe, 0x7d])), CheckoutBody, { tag: 'test' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('invalid_json')
  })

  test('le log serveur porte le tag, le champ et le motif — jamais la valeur reçue', async () => {
    const req = jsonRequest(JSON.stringify({ iban: 'FR76SECRETIBAN', preferred_payment: 'cash' }))
    const schema = object({ iban: optional(string({ max: 5 })), preferred_payment: optional(oneOf(['iban', 'paypal'])) })
    await readJsonBody(req, schema, { tag: 'coach/payment-info' })
    expect(warnings).toHaveLength(1)
    const logged = JSON.stringify(warnings[0])
    expect(logged).toContain('[coach/payment-info] requête refusée')
    expect(logged).toContain('iban: texte trop long (max 5 caractères)')
    expect(logged).toContain('preferred_payment: valeur attendue : iban, paypal')
    expect(logged).not.toContain('SECRET')
    expect(logged).not.toContain('cash')
  })
})

test.describe('readFormFile', () => {
  const png = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])], { type: 'image/png' })

  test('415 si le corps n’est pas multipart', async () => {
    const result = await readFormFile(jsonRequest('{}'), { tag: 'upload-avatar', maxBytes: 1024 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(await result.response.json()).toEqual({ error: 'Content-Type multipart/form-data requis', code: 'unsupported_media_type' })
  })

  test('413 si le Content-Length annoncé dépasse maxBytes + marge multipart, avant de lire le formulaire', async () => {
    const limit = 1024 + MULTIPART_OVERHEAD_BYTES
    const tooBig = formRequest([['file', png, 'a.png']], { 'content-length': String(limit + 1) })
    expect(tooBig.headers.get('content-type')).toContain('multipart/form-data')
    const result = await readFormFile(tooBig, { tag: 'upload-avatar', maxBytes: 1024, tooLargeMessage: 'Image trop lourde (max 5 Mo)' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(413)
      expect(await result.response.json()).toEqual({ error: 'Image trop lourde (max 5 Mo)', code: 'payload_too_large' })
    }
    // Exactement à la limite : le pré-contrôle laisse passer, la taille réelle du fichier décide ensuite.
    const atLimit = await readFormFile(formRequest([['file', png, 'a.png']], { 'content-length': String(limit) }), { tag: 'upload-avatar', maxBytes: 1024 })
    expect(atLimit.ok).toBe(true)
  })

  test('400 si le champ file est absent ou n’est pas un fichier', async () => {
    for (const req of [formRequest([['other', png, 'a.png']]), formRequest([['file', 'texte']])]) {
      const result = await readFormFile(req, { tag: 'upload-avatar', maxBytes: 1024 })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(await result.response.json()).toEqual({
        error: 'Requête invalide — file : fichier attendu.', code: 'invalid_input', issues: [{ field: 'file', message: 'fichier attendu' }],
      })
    }
  })

  test('400 si le fichier est vide, 413 s’il dépasse maxBytes (message personnalisé)', async () => {
    const empty = await readFormFile(formRequest([['file', new Blob([]), 'vide.png']]), { tag: 'upload-avatar', maxBytes: 1024 })
    expect(empty.ok).toBe(false)
    if (!empty.ok) expect(empty.errors).toEqual([{ field: 'file', message: 'fichier vide' }])

    const tooBig = await readFormFile(formRequest([['file', png, 'a.png']]), { tag: 'upload-avatar', maxBytes: 10, tooLargeMessage: 'Image trop lourde (max 5 Mo)' })
    expect(tooBig.ok).toBe(false)
    if (!tooBig.ok) {
      expect(tooBig.status).toBe(413)
      expect(await tooBig.response.json()).toEqual({ error: 'Image trop lourde (max 5 Mo)', code: 'payload_too_large' })
    }
  })

  test('fichier valide → File lisible, message par défaut en Mo', async () => {
    const result = await readFormFile(formRequest([['file', png, 'a.png']]), { tag: 'upload-avatar', maxBytes: 1024 })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.file.size).toBe(11)
    expect(new Uint8Array(await result.file.arrayBuffer())[0]).toBe(0x89)
    const tooBig = await readFormFile(formRequest([['file', png, 'a.png']]), { tag: 'upload-message-attachment', maxBytes: 5 })
    if (!tooBig.ok) expect(tooBig.error).toBe('Fichier trop lourd (max 0 Mo)')
  })
})
