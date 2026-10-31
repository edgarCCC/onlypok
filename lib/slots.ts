/* ─── Validation serveur d'un créneau de coaching (R3) ───────────────────────
   Point de contrôle unique, appelé par /api/bookings/confirm-slot et
   /api/stripe/checkout AVANT toute écriture ou création de session Stripe.

   Il reproduit la grille proposée à l'élève (generateSlots → generateWeeklySlots) :
   heure murale du coach (Europe/Paris pour tous tant que profiles.timezone
   n'existe pas, R5) et lignes `availabilities(day_of_week 1 = lundi … 7 = dimanche,
   slot 'HH:MM', booked = false)` — seul format en base (sql/migrate-root-schema.sql).

   Module pur, importable dans les tests sans serveur : les accès base passent par
   un SlotStore injecté — supabaseSlotStore(admin) dans les routes (service-role :
   la RLS cache à l'élève les réservations des autres), un store mémoire dans
   tests/e2e/slots.spec.ts.

   Q11 (validation par schéma des entrées) se branche EN AMONT : le helper accepte
   `unknown`, renvoie une raison typée (SlotRejection) et SLOT_REJECTION_HTTP donne
   le statut + le message client à renvoyer ; le détail reste dans les logs. ──────── */

import type { SupabaseClient } from '@supabase/supabase-js'
import { DEFAULT_COACH_TIMEZONE, getZonedParts, type ZonedParts } from '@/lib/timezone'

/** Délai minimal entre la demande et le début de la séance. ❓ Valeur à valider par Edgar. */
export const MIN_LEAD_MINUTES = 120
/** Horizon de réservation : même fenêtre que la grille élève (generateSlots, weeksAhead = 8). */
export const MAX_WEEKS_AHEAD = 8
/** Pas de la grille : heures pleines (AvailabilityPanel, TIME_OPTIONS 07:00 → 23:00). */
export const SLOT_STEP_MINUTES = 60
/** Durée d'une séance : 1 h de pack = 1 séance (lib/bookings.ts, pack.hours). */
export const SESSION_MINUTES = 60
/** Borne haute de `durationMinutes` (8 h) : l'entrée est contrôlée ici, avant que Q11 ne la branche. */
export const MAX_SESSION_MINUTES = 480
/** Statuts qui occupent un créneau — même liste que l'index bookings_coach_slot_active_uniq (R4). */
export const ACTIVE_BOOKING_STATUSES = ['scheduled', 'pending_coach_approval'] as const

const MINUTE_MS = 60_000
const WEEK_MS   = 7 * 24 * 60 * MINUTE_MS

export type SlotRejection = 'invalid_date' | 'invalid_duration' | 'too_soon' | 'too_far' | 'off_grid' | 'unavailable' | 'taken'

export type SlotValidation =
  | { ok: true; scheduledAt: string }   // ISO canonique (UTC, ms) : la valeur à écrire en base / metadata
  | { ok: false; reason: SlotRejection }

export type WeeklyAvailability = { day_of_week: number; slot: string }

export interface SlotStore {
  /** Créneaux hebdomadaires ouverts par le coach (booked = false, comme la requête élève). */
  openAvailabilities(coachId: string): Promise<WeeklyAvailability[]>
  /** Une réservation active du coach vérifie-t-elle from < scheduled_at < to (bornes ISO) ? */
  hasActiveBooking(coachId: string, from: string, to: string, excludeBookingId?: string): Promise<boolean>
}

export interface ValidateSlotInput {
  coachId: string
  /** Corps JSON brut : jamais supposé être une chaîne. */
  scheduledAt: unknown
  /** Entier entre SLOT_STEP_MINUTES et MAX_SESSION_MINUTES ; SESSION_MINUTES par défaut. */
  durationMinutes?: number
  /** confirm-slot : la réservation que l'élève planifie (exclue du test de conflit). */
  excludeBookingId?: string
  /** Fuseau du coach (R5 : Paris pour tous). */
  timeZone?: string
  /** Injectable pour les tests. */
  now?: Date
}

/* ISO 8601 strict : date + heure + minutes, secondes et fraction optionnelles,
   désignateur de fuseau OBLIGATOIRE ('Z' ou ±HH:MM). Sans lui, `new Date()` lirait
   l'heure dans le fuseau du serveur (Paris en dev, UTC sur Vercel). */
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})$/

/** Instant d'une chaîne ISO 8601 stricte, ou null (format libre, débordement, fuseau absent). */
export function parseIsoInstant(value: unknown): Date | null {
  if (typeof value !== 'string') return null
  const m = ISO_RE.exec(value)
  if (!m) return null
  const [year, month, day, hour, minute] = m.slice(1, 6).map(Number)
  const second = m[6] ? Number(m[6]) : 0
  const ms     = m[7] ? Number(m[7].padEnd(3, '0')) : 0
  if (month < 1 || month > 12 || day < 1 || hour > 23 || minute > 59 || second > 59) return null

  // Date.UTC « déborde » en silence (30 février → 2 mars) : on refuse.
  const wall = Date.UTC(year, month - 1, day, hour, minute, second, ms)
  const probe = new Date(wall)
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) return null

  let offsetMinutes = 0
  if (m[8] !== 'Z') {
    const sign = m[8].startsWith('-') ? -1 : 1
    const oh = Number(m[8].slice(1, 3))
    const om = Number(m[8].slice(4, 6))
    if (oh > 23 || om > 59) return null
    offsetMinutes = sign * (oh * 60 + om)
  }
  return new Date(wall - offsetMinutes * MINUTE_MS)
}

const pad2 = (n: number) => String(n).padStart(2, '0')

/* Clé « jour-HH:MM » commune aux lignes availabilities et à l'heure murale d'un instant. */
function availabilityKey(a: WeeklyAvailability): string | null {
  const [hh, mm] = a.slot.split(':').map(Number)
  if (!Number.isInteger(hh) || !Number.isInteger(mm)) return null
  return `${a.day_of_week}-${pad2(hh)}:${pad2(mm)}`
}
function wallClockKey(p: ZonedParts): string {
  return `${p.weekday === 0 ? 7 : p.weekday}-${pad2(p.hour)}:${pad2(p.minute)}`
}

/** Vérifie dans l'ordre : durée bornée, (a) ISO strict, (b) délai minimal et horizon,
    (c) grille, (d) disponibilités du coach pour chaque heure de la séance, (e) chevauchement
    avec une réservation active. Les requêtes base n'ont lieu qu'après (a)-(c) ; si le store
    échoue, l'erreur remonte (fail-closed : la route répond 500, jamais « créneau accepté »). */
export async function validateSlot(input: ValidateSlotInput, store: SlotStore): Promise<SlotValidation> {
  const { coachId, durationMinutes = SESSION_MINUTES, excludeBookingId, timeZone = DEFAULT_COACH_TIMEZONE } = input
  const nowMs = (input.now ?? new Date()).getTime()

  if (!Number.isInteger(durationMinutes) || durationMinutes < SLOT_STEP_MINUTES || durationMinutes > MAX_SESSION_MINUTES) {
    return { ok: false, reason: 'invalid_duration' }
  }

  const date = parseIsoInstant(input.scheduledAt)
  if (!date) return { ok: false, reason: 'invalid_date' }
  const t = date.getTime()

  if (t < nowMs + MIN_LEAD_MINUTES * MINUTE_MS) return { ok: false, reason: 'too_soon' }
  if (t > nowMs + MAX_WEEKS_AHEAD * WEEK_MS)    return { ok: false, reason: 'too_far' }

  const start = getZonedParts(date, timeZone)
  if (date.getUTCSeconds() !== 0 || date.getUTCMilliseconds() !== 0 || start.minute % SLOT_STEP_MINUTES !== 0) {
    return { ok: false, reason: 'off_grid' }
  }

  const open = new Set((await store.openAvailabilities(coachId)).map(availabilityKey))
  const steps = Math.max(1, Math.ceil(durationMinutes / SLOT_STEP_MINUTES))
  for (let k = 0; k < steps; k++) {
    const hour = getZonedParts(new Date(t + k * SLOT_STEP_MINUTES * MINUTE_MS), timeZone)
    if (!open.has(wallClockKey(hour))) return { ok: false, reason: 'unavailable' }
  }

  // Durée des réservations existantes inconnue en base : SESSION_MINUTES par convention.
  const from = new Date(t - SESSION_MINUTES * MINUTE_MS).toISOString()
  const to   = new Date(t + durationMinutes * MINUTE_MS).toISOString()
  if (await store.hasActiveBooking(coachId, from, to, excludeBookingId)) return { ok: false, reason: 'taken' }

  return { ok: true, scheduledAt: date.toISOString() }
}

/** Store Supabase (client service-role) : la RLS cache à l'élève les réservations
    des autres élèves, un client user-scoped ne verrait jamais le conflit. */
export function supabaseSlotStore(admin: SupabaseClient): SlotStore {
  return {
    async openAvailabilities(coachId) {
      const { data, error } = await admin
        .from('availabilities')
        .select('day_of_week, slot')
        .eq('coach_id', coachId)
        .eq('booked', false)
      if (error) throw new Error(`availabilities: ${error.message}`)
      // Un select sans erreur renvoie toujours un tableau : null = réponse inconnue, pas « aucune ».
      if (!data) throw new Error('availabilities: réponse vide')
      return data
    },
    async hasActiveBooking(coachId, from, to, excludeBookingId) {
      let query = admin
        .from('bookings')
        .select('id')
        .eq('coach_id', coachId)
        .in('status', [...ACTIVE_BOOKING_STATUSES])
        .gt('scheduled_at', from)
        .lt('scheduled_at', to)
        .limit(1)
      if (excludeBookingId) query = query.neq('id', excludeBookingId)
      const { data, error } = await query
      if (error) throw new Error(`bookings: ${error.message}`)
      // null sans erreur = inconnu : on lève plutôt que de déclarer le créneau libre.
      if (!data) throw new Error('bookings: réponse vide')
      return data.length > 0
    },
  }
}

const leadLabel = MIN_LEAD_MINUTES % 60 === 0 ? `${MIN_LEAD_MINUTES / 60} h` : `${MIN_LEAD_MINUTES} min`

/** Réponse client par motif : message court en français, détail dans les logs serveur. */
export const SLOT_REJECTION_HTTP: Record<SlotRejection, { status: 400 | 409; message: string }> = {
  invalid_date:     { status: 400, message: 'Créneau invalide.' },
  invalid_duration: { status: 400, message: 'Durée de séance invalide.' },
  too_soon:     { status: 400, message: `Ce créneau est passé ou trop proche : choisis un horaire au moins ${leadLabel} à l’avance.` },
  too_far:      { status: 400, message: `Ce créneau est trop loin : réserve au plus ${MAX_WEEKS_AHEAD} semaines à l’avance.` },
  off_grid:     { status: 400, message: 'Ce créneau ne correspond pas à la grille horaire du coach.' },
  unavailable:  { status: 400, message: 'Le coach n’est pas disponible sur ce créneau.' },
  taken:        { status: 409, message: 'Ce créneau est déjà pris.' },
}
