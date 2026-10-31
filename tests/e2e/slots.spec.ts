import { test, expect } from '@playwright/test'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  validateSlot, parseIsoInstant, supabaseSlotStore,
  MIN_LEAD_MINUTES, MAX_WEEKS_AHEAD, ACTIVE_BOOKING_STATUSES, SLOT_REJECTION_HTTP,
  type SlotStore, type SlotRejection,
} from '../../lib/slots'

/* Validation serveur du créneau choisi (R3). Tests unitaires du helper, sans
   navigateur ni serveur — exécution isolée sans démarrer le dev server :
   E2E_BASE_URL=http://127.0.0.1:9 npx playwright test slots --grep-invert "serveur requis" --reporter=list
   Le store est en mémoire et reproduit les requêtes de supabaseSlotStore
   (availabilities.booked = false ; réservations actives dans ]from, to[). */

type Avail   = { day_of_week: number; slot: string; booked?: boolean }
type Booking = { id: string; coach_id: string; scheduled_at: string; status: string }

const COACH  = 'coach-1'
const ACTIVE = new Set<string>(ACTIVE_BOOKING_STATUSES)

function memoryStore(availabilities: Avail[], bookings: Booking[] = []): SlotStore {
  return {
    async openAvailabilities(coachId) {
      if (coachId !== COACH) return []
      return availabilities.filter(a => !a.booked).map(({ day_of_week, slot }) => ({ day_of_week, slot }))
    },
    async hasActiveBooking(coachId, from, to, excludeBookingId) {
      // Chaînes ISO canoniques : la comparaison lexicographique vaut comparaison d'instants.
      return bookings.some(b =>
        b.coach_id === coachId && ACTIVE.has(b.status) && b.id !== excludeBookingId &&
        b.scheduled_at > from && b.scheduled_at < to)
    },
  }
}

/* Disponibilités hebdomadaires du coach, heure murale de Paris. */
const AVAILS: Avail[] = [
  { day_of_week: 1, slot: '14:00' },                // lundi
  { day_of_week: 1, slot: '15:00' },
  { day_of_week: 3, slot: '10:00' },                // mercredi
  { day_of_week: 3, slot: '11:00' },
  { day_of_week: 7, slot: '10:00' },                // dimanche (7, convention de la table)
  { day_of_week: 4, slot: '10:00', booked: true },  // jeudi, fermé par le coach
]

/* Réservations existantes chez ce coach (mercredis, 10:00 Paris = 09:00Z en hiver). */
const BOOKINGS: Booking[] = [
  { id: 'b-1', coach_id: COACH, scheduled_at: '2026-01-14T09:00:00.000Z', status: 'scheduled' },
  { id: 'b-2', coach_id: COACH, scheduled_at: '2026-01-21T09:00:00.000Z', status: 'pending_coach_approval' },
  { id: 'b-3', coach_id: COACH, scheduled_at: '2026-01-28T09:00:00.000Z', status: 'declined_by_coach' },
  { id: 'b-4', coach_id: COACH, scheduled_at: '2026-02-04T09:30:00.000Z', status: 'scheduled' }, // ancien, hors grille
]

/* Lundi 5 janvier 2026, 13:00 à Paris (hiver, UTC+1). */
const NOW = new Date('2026-01-05T12:00:00.000Z')

const check = (scheduledAt: unknown, opts: { now?: Date; durationMinutes?: number; excludeBookingId?: string } = {}) =>
  validateSlot({ coachId: COACH, scheduledAt, now: NOW, ...opts }, memoryStore(AVAILS, BOOKINGS))

const expectReason = async (scheduledAt: unknown, reason: SlotRejection, opts = {}) => {
  expect(await check(scheduledAt, opts)).toEqual({ ok: false, reason })
}

test.describe('validateSlot — créneau valide', () => {
  test('mercredi 10:00 Paris (hiver) → ok, ISO canonique renvoyé', async () => {
    expect(await check('2026-01-07T09:00:00.000Z')).toEqual({ ok: true, scheduledAt: '2026-01-07T09:00:00.000Z' })
  })

  test('même instant écrit avec un décalage explicite → ok, normalisé en UTC', async () => {
    expect(await check('2026-01-07T10:00:00+01:00')).toEqual({ ok: true, scheduledAt: '2026-01-07T09:00:00.000Z' })
  })

  test('exactement MIN_LEAD_MINUTES à l’avance → ok (borne incluse)', async () => {
    const at = new Date(NOW.getTime() + MIN_LEAD_MINUTES * 60_000) // lundi 15:00 Paris
    expect(await check(at.toISOString())).toEqual({ ok: true, scheduledAt: at.toISOString() })
  })

  test('dernier mercredi dans l’horizon de 8 semaines → ok', async () => {
    expect((await check('2026-02-25T09:00:00.000Z')).ok).toBe(true)
  })
})

test.describe('validateSlot — date invalide', () => {
  const INVALID: unknown[] = [
    null, undefined, '', 42, {}, 'demain', 'Wed Jan 07 2026 10:00',
    '2026-01-07',                 // date seule
    '2026-01-07T10:00:00',        // sans fuseau : serait lue dans le fuseau du serveur
    '2026-02-30T10:00:00Z',       // 30 février : V8 déborde sur le 2 mars
    '2026-01-07T25:00:00Z',
    '2026-13-07T10:00:00Z',
    '2026-01-07T10:00:00+25:00',
  ]
  for (const value of INVALID) {
    test(`refuse ${JSON.stringify(value)}`, async () => {
      await expectReason(value, 'invalid_date')
    })
  }
})

test.describe('validateSlot — délai et horizon', () => {
  test('date passée → too_soon', async () => {
    await expectReason('2025-12-31T09:00:00.000Z', 'too_soon')
  })

  test('dans 60 min sur un créneau ouvert (lundi 14:00) → too_soon', async () => {
    await expectReason('2026-01-05T13:00:00.000Z', 'too_soon')
  })

  test('au-delà de MAX_WEEKS_AHEAD semaines → too_far', async () => {
    const beyond = new Date(NOW.getTime() + (MAX_WEEKS_AHEAD * 7 + 2) * 86_400_000) // mercredi 4 mars 10:00 Paris
    expect(beyond.toISOString()).toBe('2026-03-04T12:00:00.000Z')
    await expectReason('2026-03-04T09:00:00.000Z', 'too_far')
  })
})

test.describe('validateSlot — hors grille', () => {
  test('demi-heure (10:30 Paris) → off_grid', async () => {
    await expectReason('2026-01-07T09:30:00.000Z', 'off_grid')
  })
  test('secondes non nulles → off_grid', async () => {
    await expectReason('2026-01-07T09:00:30.000Z', 'off_grid')
  })
  test('millisecondes non nulles → off_grid', async () => {
    await expectReason('2026-01-07T09:00:00.500Z', 'off_grid')
  })
})

test.describe('validateSlot — hors disponibilités (fuseau du coach)', () => {
  test('mercredi 14:00 Paris, pas de ligne → unavailable', async () => {
    await expectReason('2026-01-07T13:00:00.000Z', 'unavailable')
  })
  test('jeudi 10:00, ligne fermée par le coach (booked = true) → unavailable', async () => {
    await expectReason('2026-01-08T09:00:00.000Z', 'unavailable')
  })
  test('mercredi 10:00 UTC = 11:00 Paris → ok, mais 09:00 Paris (08:00Z) → unavailable', async () => {
    expect((await check('2026-01-07T10:00:00.000Z')).ok).toBe(true)
    await expectReason('2026-01-07T08:00:00.000Z', 'unavailable')
  })
  test('coach inconnu, aucune disponibilité → unavailable', async () => {
    const res = await validateSlot({ coachId: 'coach-2', scheduledAt: '2026-01-07T09:00:00.000Z', now: NOW }, memoryStore(AVAILS))
    expect(res).toEqual({ ok: false, reason: 'unavailable' })
  })
  test('séance de 120 min : 10:00 couvre 10:00 + 11:00 → ok ; 11:00 sans 12:00 → unavailable', async () => {
    expect((await check('2026-01-07T09:00:00.000Z', { durationMinutes: 120 })).ok).toBe(true)
    await expectReason('2026-01-07T10:00:00.000Z', 'unavailable', { durationMinutes: 120 })
  })
})

test.describe('validateSlot — changement d’heure été/hiver (Europe/Paris)', () => {
  test('dimanche 29 mars 2026 (passage à l’été) : 10:00 Paris = 08:00Z → ok, 09:00Z = 11:00 Paris → unavailable', async () => {
    const now = new Date('2026-03-23T12:00:00.000Z')
    expect(await check('2026-03-29T08:00:00.000Z', { now })).toEqual({ ok: true, scheduledAt: '2026-03-29T08:00:00.000Z' })
    await expectReason('2026-03-29T09:00:00.000Z', 'unavailable', { now })
  })

  test('mercredi 8 juillet 2026 (été, UTC+2) : 10:00 Paris = 08:00Z → ok, 07:00Z = 09:00 Paris → unavailable', async () => {
    const now = new Date('2026-07-06T12:00:00.000Z')
    expect(await check('2026-07-08T08:00:00.000Z', { now })).toEqual({ ok: true, scheduledAt: '2026-07-08T08:00:00.000Z' })
    await expectReason('2026-07-08T07:00:00.000Z', 'unavailable', { now })
  })

  test('dimanche 25 octobre 2026 (retour à l’hiver) : 10:00 Paris = 09:00Z → ok, 08:00Z = 09:00 Paris → unavailable', async () => {
    const now = new Date('2026-10-19T12:00:00.000Z')
    expect(await check('2026-10-25T09:00:00.000Z', { now })).toEqual({ ok: true, scheduledAt: '2026-10-25T09:00:00.000Z' })
    await expectReason('2026-10-25T08:00:00.000Z', 'unavailable', { now })
  })
})

test.describe('validateSlot — créneau déjà pris', () => {
  test('réservation scheduled au même instant → taken', async () => {
    await expectReason('2026-01-14T09:00:00.000Z', 'taken')
  })
  test('réservation pending_coach_approval au même instant → taken', async () => {
    await expectReason('2026-01-21T09:00:00.000Z', 'taken')
  })
  test('réservation refusée par le coach : le créneau est libre → ok', async () => {
    expect((await check('2026-01-28T09:00:00.000Z')).ok).toBe(true)
  })
  test('la réservation que l’élève planifie est exclue du conflit → ok', async () => {
    expect((await check('2026-01-14T09:00:00.000Z', { excludeBookingId: 'b-1' })).ok).toBe(true)
  })
  test('ancienne réservation à 10:30 : chevauche 10:00 et 11:00 → taken', async () => {
    await expectReason('2026-02-04T09:00:00.000Z', 'taken')
    await expectReason('2026-02-04T10:00:00.000Z', 'taken')
  })
  test('créneau adjacent (11:00 après une résa à 10:00) → ok', async () => {
    expect((await check('2026-01-14T10:00:00.000Z')).ok).toBe(true)
  })
})

test.describe('parseIsoInstant et table des réponses', () => {
  test('parseIsoInstant : canonique, décalage, fraction courte', () => {
    expect(parseIsoInstant('2026-01-07T09:00:00.000Z')?.toISOString()).toBe('2026-01-07T09:00:00.000Z')
    expect(parseIsoInstant('2026-01-07T10:00:00+01:00')?.toISOString()).toBe('2026-01-07T09:00:00.000Z')
    expect(parseIsoInstant('2026-01-07T04:00-05:00')?.toISOString()).toBe('2026-01-07T09:00:00.000Z')
    expect(parseIsoInstant('2026-01-07T09:00:00.5Z')?.toISOString()).toBe('2026-01-07T09:00:00.500Z')
    expect(parseIsoInstant('2026-02-29T09:00:00Z')).toBeNull() // 2026 n’est pas bissextile
  })

  test('chaque motif a un statut 400 (409 pour taken) et un message', () => {
    for (const [reason, { status, message }] of Object.entries(SLOT_REJECTION_HTTP)) {
      expect(status).toBe(reason === 'taken' ? 409 : 400)
      expect(message.length).toBeGreaterThan(10)
    }
  })
})

test.describe('validateSlot — durée de séance bornée', () => {
  for (const durationMinutes of [0, 30, 59, 90.5, 481, NaN, Infinity]) {
    test(`durationMinutes = ${durationMinutes} → invalid_duration`, async () => {
      await expectReason('2026-01-07T09:00:00.000Z', 'invalid_duration', { durationMinutes })
    })
  }
  test('bornes 60 et 480 acceptées (480 bute ensuite sur les disponibilités, pas sur la durée)', async () => {
    expect((await check('2026-01-07T09:00:00.000Z', { durationMinutes: 60 })).ok).toBe(true)
    await expectReason('2026-01-07T09:00:00.000Z', 'unavailable', { durationMinutes: 480 })
  })
})

test.describe('validateSlot — fail-closed quand la base échoue', () => {
  const VALID = '2026-01-07T09:00:00.000Z'
  test('store.hasActiveBooking qui lève → erreur propagée, jamais ok', async () => {
    const store: SlotStore = {
      ...memoryStore(AVAILS),
      hasActiveBooking: async () => { throw new Error('bookings: permission denied for table bookings') },
    }
    await expect(validateSlot({ coachId: COACH, scheduledAt: VALID, now: NOW }, store)).rejects.toThrow('permission denied')
  })
  test('store.openAvailabilities qui lève → erreur propagée', async () => {
    const store: SlotStore = {
      ...memoryStore(AVAILS),
      openAvailabilities: async () => { throw new Error('availabilities: timeout') },
    }
    await expect(validateSlot({ coachId: COACH, scheduledAt: VALID, now: NOW }, store)).rejects.toThrow('timeout')
  })
})

/* Client Supabase factice : toute chaîne de requête résout sur `result`. */
function fakeAdmin(result: { data: unknown; error: { message: string } | null }): SupabaseClient {
  const builder: Record<string, unknown> = {
    then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  }
  for (const method of ['select', 'eq', 'in', 'gt', 'lt', 'neq', 'limit']) builder[method] = () => builder
  return { from: () => builder } as unknown as SupabaseClient
}

test.describe('supabaseSlotStore — réponses anormales traitées comme inconnues', () => {
  const ARGS = [COACH, '2026-01-07T08:00:00.000Z', '2026-01-07T10:00:00.000Z'] as const

  test('erreur PostgREST → lève (le détail reste côté serveur)', async () => {
    const store = supabaseSlotStore(fakeAdmin({ data: null, error: { message: 'permission denied for table bookings' } }))
    await expect(store.hasActiveBooking(...ARGS)).rejects.toThrow('permission denied')
    await expect(store.openAvailabilities(COACH)).rejects.toThrow('permission denied')
  })

  test('data null sans erreur → lève, jamais « libre »', async () => {
    const store = supabaseSlotStore(fakeAdmin({ data: null, error: null }))
    await expect(store.hasActiveBooking(...ARGS)).rejects.toThrow('réponse vide')
    await expect(store.openAvailabilities(COACH)).rejects.toThrow('réponse vide')
  })

  test('tableau vide → libre ; une ligne → pris', async () => {
    expect(await supabaseSlotStore(fakeAdmin({ data: [], error: null })).hasActiveBooking(...ARGS)).toBe(false)
    expect(await supabaseSlotStore(fakeAdmin({ data: [{ id: 'b-1' }], error: null })).hasActiveBooking(...ARGS)).toBe(true)
  })
})
