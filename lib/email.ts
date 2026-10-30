import { Resend } from 'resend'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { COACH_APPROVAL_HOURS, DEFAULT_COACH_TIMEZONE } from '@/lib/timezone'

/* Domaine définitif pas encore acheté : tout dérive de NEXT_PUBLIC_APP_URL,
   repli sur le domaine Vercel actuel. Aucune URL de domaine en dur ailleurs. */
const FALLBACK_APP_URL = 'https://onlypok.vercel.app'
/* Expéditeur de test Resend (fonctionne sans domaine vérifié, vers le compte
   propriétaire uniquement). Définir EMAIL_FROM une fois le domaine vérifié. */
const FALLBACK_FROM = 'OnlyPok <onboarding@resend.dev>'

/* Les heures des emails sont rendues côté serveur (UTC sur Vercel) :
   on force le fuseau du coach et on l'indique dans le texte. */
const EMAIL_TIMEZONE = DEFAULT_COACH_TIMEZONE
const EMAIL_TZ_LABEL = 'heure de Paris'

function getAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim() || FALLBACK_APP_URL
  return raw.replace(/\/+$/, '')
}

function getFrom(): string {
  return process.env.EMAIL_FROM?.trim() || FALLBACK_FROM
}

type EmailType =
  | 'coach_new_booking' | 'student_booking_accepted' | 'student_booking_declined'
  | 'coach_slot_proposed' | 'student_slot_proposed' | 'coach_proof_reviewed' | 'admin_alert'

let resendClient: Resend | null = null
function getResend(type: EmailType): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.warn(`[email] RESEND_API_KEY absente : email "${type}" non envoyé.`)
    return null
  }
  if (!process.env.EMAIL_FROM) {
    console.warn(`[email] EMAIL_FROM absente : expéditeur de repli ${FALLBACK_FROM} utilisé pour "${type}".`)
  }
  resendClient ??= new Resend(key)
  return resendClient
}

/* Envoi centralisé : n'interrompt jamais l'appelant (envois « fire and forget »),
   mais journalise toute erreur Resend avec le type d'email. */
async function sendEmail(type: EmailType, payload: { to: string; subject: string; html: string }): Promise<boolean> {
  const resend = getResend(type)
  if (!resend) return false
  try {
    const { error } = await resend.emails.send({ from: getFrom(), ...payload })
    if (error) {
      console.error(`[email] échec Resend pour "${type}" :`, error.name, error.message)
      return false
    }
    return true
  } catch (err: unknown) {
    console.error(`[email] exception Resend pour "${type}" :`, err instanceof Error ? err.message : err)
    return false
  }
}

/* ── Get email from Supabase Auth ─────────────────────────── */
async function getUserEmail(userId: string, type: EmailType): Promise<string | null> {
  const admin = createAdminSupabaseClient()
  const { data, error } = await admin.auth.admin.getUserById(userId)
  if (error || !data.user?.email) {
    console.warn(`[email] destinataire introuvable pour "${type}" (user ${userId}) :`, error?.message ?? 'email absent')
    return null
  }
  return data.user.email
}

/* ── Date et heure d'une séance, dans le fuseau du coach ─────── */
function formatSession(iso: string): { dateStr: string; timeStr: string } {
  const date = new Date(iso)
  return {
    dateStr: date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: EMAIL_TIMEZONE }),
    timeStr: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: EMAIL_TIMEZONE }),
  }
}

/* ── Échappe les valeurs utilisateur avant interpolation HTML (anti-injection) ── */
function esc(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/* ── Shared HTML shell ────────────────────────────────────── */
function shell(body: string) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #07090e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #e8e4dc; }
    a { color: #a78bfa; }
  </style>
</head>
<body style="background:#07090e; padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#07090e; padding: 40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;">

        <!-- Header -->
        <tr><td style="padding-bottom:28px;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:8px;height:8px;border-radius:2px;background:linear-gradient(135deg,#7c3aed,#06b6d4);"></td>
              <td style="padding-left:10px;font-size:14px;font-weight:700;letter-spacing:0.18em;color:#e8e4dc;">ONLYPOK</td>
            </tr>
          </table>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#0d1117;border:1px solid rgba(232,228,220,0.09);border-radius:16px;padding:32px 32px 28px;">
          ${body}
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding-top:24px;text-align:center;font-size:11px;color:rgba(232,228,220,0.3);line-height:1.6;">
          OnlyPok — la plateforme des coachs poker<br/>
          <a href="${getAppUrl()}" style="color:rgba(232,228,220,0.3);text-decoration:none;">${esc(getAppUrl().replace(/^https?:\/\//, ''))}</a>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

/* ── Pill badge helper ─────────────────────────────────────── */
function pill(text: string, color: string, bg: string) {
  return `<span style="display:inline-block;padding:3px 10px;border-radius:99px;background:${bg};border:1px solid ${color}40;font-size:11px;font-weight:700;color:${color};letter-spacing:0.05em;text-transform:uppercase;">${text}</span>`
}

/* ── CTA button ───────────────────────────────────────────── */
function cta(text: string, href: string, color = '#7c3aed') {
  return `<a href="${href}" style="display:inline-block;margin-top:22px;padding:12px 24px;border-radius:10px;background:${color};color:#fff;font-size:13px;font-weight:700;text-decoration:none;letter-spacing:0.02em;">${text}</a>`
}

/* ─────────────────────────────────────────────────────────── */
/* 1. Coach — nouvelle réservation reçue                       */
/* ─────────────────────────────────────────────────────────── */
export async function sendCoachNewBookingEmail({
  coachId, studentUsername, formationTitle, packLabel, price,
}: {
  coachId: string
  studentUsername: string
  formationTitle: string
  packLabel?: string | null
  price?: number | null
}) {
  const email = await getUserEmail(coachId, 'coach_new_booking')
  if (!email) return

  const appUrl = getAppUrl()

  const html = shell(`
    <p style="font-size:12px;color:rgba(232,228,220,0.4);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:14px;">Nouvelle réservation</p>

    <h1 style="font-size:22px;font-weight:800;color:#e8e4dc;letter-spacing:-0.4px;margin-bottom:8px;line-height:1.2;">
      ${esc(studentUsername)} veut un coaching
    </h1>

    <p style="font-size:14px;color:rgba(232,228,220,0.55);margin-bottom:24px;line-height:1.55;">
      Un élève vient de réserver votre coaching. Vous avez <strong style="color:#f59e0b;">${COACH_APPROVAL_HOURS} heures</strong> pour accepter ou refuser la demande.
    </p>

    <table cellpadding="0" cellspacing="0" width="100%" style="background:rgba(232,228,220,0.03);border:1px solid rgba(232,228,220,0.07);border-radius:12px;padding:16px 18px;margin-bottom:8px;">
      <tr>
        <td style="font-size:12px;color:rgba(232,228,220,0.4);padding-bottom:6px;">Formation</td>
        <td align="right">${pill('Coaching', '#7c3aed', 'rgba(124,58,237,0.12)')}</td>
      </tr>
      <tr>
        <td colspan="2" style="font-size:15px;font-weight:700;color:#e8e4dc;padding-bottom:12px;">${esc(formationTitle)}</td>
      </tr>
      ${packLabel ? `<tr>
        <td style="font-size:12px;color:rgba(232,228,220,0.4);">Pack</td>
        <td align="right" style="font-size:13px;color:#06b6d4;font-weight:600;">${esc(packLabel)}</td>
      </tr>` : ''}
      ${price != null ? `<tr>
        <td style="font-size:12px;color:rgba(232,228,220,0.4);padding-top:6px;">Montant retenu</td>
        <td align="right" style="font-size:16px;font-weight:800;color:#4ade80;">${price}€</td>
      </tr>` : ''}
    </table>

    <p style="font-size:12px;color:rgba(232,228,220,0.3);margin-bottom:0;margin-top:8px;">
      Le paiement est retenu sur le compte de l'élève. Il sera libéré après votre acceptation.
    </p>

    ${cta('Voir la demande →', `${appUrl}/coach/agenda?tab=validate`, '#7c3aed')}
  `)

  await sendEmail('coach_new_booking', {
    to:   email,
    subject: `🎯 ${studentUsername} a réservé votre coaching "${formationTitle}"`,
    html,
  })
}

/* ─────────────────────────────────────────────────────────── */
/* 2. Élève — coaching accepté                                 */
/* ─────────────────────────────────────────────────────────── */
export async function sendStudentBookingAcceptedEmail({
  studentId, coachUsername, formationTitle, bookingId, scheduledAt,
}: {
  studentId: string
  coachUsername: string
  formationTitle: string
  bookingId: string
  /* Créneau déjà choisi (cas accept après confirm-slot) : l'email l'affiche
     au lieu d'inviter à choisir un créneau. */
  scheduledAt?: string | null
}) {
  const email = await getUserEmail(studentId, 'student_booking_accepted')
  if (!email) return

  const appUrl = getAppUrl()
  const session = scheduledAt ? formatSession(scheduledAt) : null

  const html = shell(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-flex;width:56px;height:56px;border-radius:50%;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);align-items:center;justify-content:center;margin-bottom:12px;">
        <span style="font-size:24px;">✓</span>
      </div>
    </div>

    <p style="font-size:12px;color:rgba(232,228,220,0.4);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:10px;text-align:center;">Coaching confirmé</p>

    <h1 style="font-size:22px;font-weight:800;color:#e8e4dc;letter-spacing:-0.4px;margin-bottom:10px;text-align:center;line-height:1.2;">
      Votre coaching a été accepté&nbsp;!
    </h1>

    <p style="font-size:14px;color:rgba(232,228,220,0.55);margin-bottom:24px;line-height:1.55;text-align:center;">
      <strong style="color:#e8e4dc;">${esc(coachUsername)}</strong> a accepté votre demande pour<br/>
      <em style="color:#a78bfa;">${esc(formationTitle)}</em>.<br/>
      ${session
        ? `Séance confirmée le <strong style="color:#e8e4dc;">${session.dateStr} à ${session.timeStr}</strong> (${EMAIL_TZ_LABEL}). Le lien de visio est dans votre planning.`
        : 'Retrouvez votre séance dans votre planning : lien de visio, ou choix du créneau s’il reste à planifier.'}
    </p>

    <div style="text-align:center;">
      ${cta(session ? 'Voir mon planning →' : 'Ouvrir mon planning →', `${appUrl}/schedule`, '#10b981')}
    </div>

    <p style="font-size:11px;color:rgba(232,228,220,0.25);margin-top:20px;text-align:center;">
      Référence réservation : ${bookingId.slice(0, 8).toUpperCase()}
    </p>
  `)

  await sendEmail('student_booking_accepted', {
    to:   email,
    subject: `✅ ${coachUsername} a accepté votre coaching "${formationTitle}"`,
    html,
  })
}

/* ─────────────────────────────────────────────────────────── */
/* 3. Élève — coaching refusé + remboursement                  */
/* ─────────────────────────────────────────────────────────── */
export async function sendStudentBookingDeclinedEmail({
  studentId, coachUsername, formationTitle,
}: {
  studentId: string
  coachUsername: string
  formationTitle: string
}) {
  const email = await getUserEmail(studentId, 'student_booking_declined')
  if (!email) return

  const appUrl = getAppUrl()

  const html = shell(`
    <p style="font-size:12px;color:rgba(232,228,220,0.4);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:14px;">Coaching refusé</p>

    <h1 style="font-size:22px;font-weight:800;color:#e8e4dc;letter-spacing:-0.4px;margin-bottom:10px;line-height:1.2;">
      Votre demande n'a pas été acceptée
    </h1>

    <p style="font-size:14px;color:rgba(232,228,220,0.55);margin-bottom:20px;line-height:1.55;">
      <strong style="color:#e8e4dc;">${esc(coachUsername)}</strong> n'a pas pu accepter votre demande de coaching pour
      <em style="color:#a78bfa;">${esc(formationTitle)}</em>.
    </p>

    <table cellpadding="0" cellspacing="0" width="100%" style="background:rgba(16,185,129,0.04);border:1px solid rgba(16,185,129,0.15);border-radius:12px;padding:14px 18px;margin-bottom:8px;">
      <tr>
        <td style="font-size:13px;color:rgba(232,228,220,0.6);">💚 Votre remboursement</td>
        <td align="right" style="font-size:13px;color:#4ade80;font-weight:700;">Automatique</td>
      </tr>
      <tr>
        <td colspan="2" style="font-size:12px;color:rgba(232,228,220,0.3);padding-top:4px;">
          Le montant sera crédité sur votre moyen de paiement sous 5 à 10 jours ouvrés.
        </td>
      </tr>
    </table>

    ${cta('Explorer d\'autres coachs →', `${appUrl}/coaches`, '#7c3aed')}
  `)

  await sendEmail('student_booking_declined', {
    to:   email,
    subject: `Votre demande de coaching "${formationTitle}" — remboursement en cours`,
    html,
  })
}

/* ─────────────────────────────────────────────────────────── */
/* Bloc « lien de la session », affiché seulement s'il existe  */
/* ─────────────────────────────────────────────────────────── */
function meetingBlock(meetingUrl: string) {
  const href = esc(meetingUrl)
  return `
    <table cellpadding="0" cellspacing="0" width="100%" style="background:rgba(6,182,212,0.06);border:1px solid rgba(6,182,212,0.25);border-radius:12px;padding:14px 18px;margin-bottom:22px;">
      <tr>
        <td style="font-size:12px;color:rgba(232,228,220,0.4);padding-bottom:6px;">Lien de la session</td>
      </tr>
      <tr>
        <td>
          <a href="${href}" style="font-size:14px;font-weight:700;color:#06b6d4;text-decoration:none;word-break:break-all;">${href}</a>
        </td>
      </tr>
    </table>`
}

/* ─────────────────────────────────────────────────────────── */
/* 4. Coach — créneau proposé par l'élève (à accepter)         */
/*    Appelé par confirm-slot : la réservation est alors en    */
/*    pending_coach_approval, sans lien de visio (meetingUrl   */
/*    null). Avec un lien, l'email annonce une séance planifiée.*/
/* ─────────────────────────────────────────────────────────── */
export async function sendCoachSlotConfirmedEmail({
  coachId, studentUsername, formationTitle, scheduledAt, meetingUrl,
}: {
  coachId: string
  studentUsername: string
  formationTitle: string
  scheduledAt: string
  meetingUrl?: string | null
}) {
  const email = await getUserEmail(coachId, 'coach_slot_proposed')
  if (!email) return

  const appUrl = getAppUrl()
  const { dateStr, timeStr } = formatSession(scheduledAt)
  const isPending = !meetingUrl

  const html = shell(`
    <p style="font-size:12px;color:rgba(232,228,220,0.4);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:14px;">${isPending ? 'Créneau à valider' : 'Session planifiée'}</p>

    <h1 style="font-size:22px;font-weight:800;color:#e8e4dc;letter-spacing:-0.4px;margin-bottom:8px;line-height:1.2;">
      ${isPending ? 'Nouveau créneau proposé' : 'Nouveau créneau réservé'}
    </h1>

    <p style="font-size:14px;color:rgba(232,228,220,0.55);margin-bottom:22px;line-height:1.55;">
      <strong style="color:#e8e4dc;">${esc(studentUsername)}</strong> ${isPending ? 'propose un créneau' : 'a sélectionné un créneau'} pour votre coaching <em style="color:#a78bfa;">${esc(formationTitle)}</em>.
      ${isPending ? `Vous avez <strong style="color:#f59e0b;">${COACH_APPROVAL_HOURS} heures</strong> pour accepter ou refuser la demande.` : ''}
    </p>

    <table cellpadding="0" cellspacing="0" width="100%" style="background:rgba(6,182,212,0.06);border:1px solid rgba(6,182,212,0.2);border-radius:12px;padding:16px 18px;margin-bottom:22px;">
      <tr>
        <td style="font-size:12px;color:rgba(232,228,220,0.4);padding-bottom:4px;">Date</td>
        <td align="right" style="font-size:14px;font-weight:700;color:#e8e4dc;">${dateStr}</td>
      </tr>
      <tr>
        <td style="font-size:12px;color:rgba(232,228,220,0.4);">Heure (${EMAIL_TZ_LABEL})</td>
        <td align="right" style="font-size:20px;font-weight:800;color:#06b6d4;">${timeStr}</td>
      </tr>
    </table>

    ${isPending
      ? `<p style="font-size:12px;color:rgba(232,228,220,0.3);margin-bottom:0;">
           Le paiement de l'élève est retenu. Le lien de visio est créé quand vous acceptez ; en cas de refus, l'élève est remboursé.
         </p>
         ${cta('Accepter ou refuser →', `${appUrl}/coach/agenda?tab=validate`, '#f59e0b')}`
      : `${meetingBlock(meetingUrl)}
         ${cta('Rejoindre la session →', esc(meetingUrl), '#06b6d4')}
         &nbsp;&nbsp;
         ${cta('Voir mes sessions →', `${appUrl}/coach/agenda?tab=upcoming`, '#7c3aed')}`}
  `)

  await sendEmail('coach_slot_proposed', {
    to:   email,
    subject: isPending
      ? `⏳ ${studentUsername} propose le ${dateStr} à ${timeStr} — à valider sous ${COACH_APPROVAL_HOURS} h`
      : `📅 ${studentUsername} a réservé le ${dateStr} à ${timeStr}`,
    html,
  })
}

/* ─────────────────────────────────────────────────────────── */
/* 5. Élève — demande de créneau envoyée (ou séance confirmée  */
/*    si un lien de visio est fourni)                          */
/* ─────────────────────────────────────────────────────────── */
export async function sendStudentSlotConfirmedEmail({
  studentId, coachUsername, formationTitle, scheduledAt, meetingUrl,
}: {
  studentId: string
  coachUsername: string
  formationTitle: string
  scheduledAt: string
  meetingUrl?: string | null
}) {
  const email = await getUserEmail(studentId, 'student_slot_proposed')
  if (!email) return

  const appUrl = getAppUrl()
  const { dateStr, timeStr } = formatSession(scheduledAt)
  const isPending = !meetingUrl

  const html = shell(`
    <div style="text-align:center;margin-bottom:22px;">
      <div style="display:inline-block;padding:10px 20px;border-radius:99px;background:${isPending ? 'rgba(245,158,11,0.12)' : 'rgba(6,182,212,0.12)'};border:1px solid ${isPending ? 'rgba(245,158,11,0.3)' : 'rgba(6,182,212,0.3)'};">
        <span style="font-size:13px;font-weight:700;color:${isPending ? '#f59e0b' : '#06b6d4'};letter-spacing:0.04em;">${isPending ? 'DEMANDE ENVOYÉE' : 'SESSION CONFIRMÉE'}</span>
      </div>
    </div>

    <h1 style="font-size:22px;font-weight:800;color:#e8e4dc;letter-spacing:-0.4px;margin-bottom:8px;line-height:1.2;text-align:center;">
      ${isPending ? 'Votre demande de créneau est envoyée' : 'Votre créneau est réservé&nbsp;!'}
    </h1>

    <p style="font-size:14px;color:rgba(232,228,220,0.55);margin-bottom:22px;line-height:1.55;text-align:center;">
      Coaching <em style="color:#a78bfa;">${esc(formationTitle)}</em> avec <strong style="color:#e8e4dc;">${esc(coachUsername)}</strong>
      ${isPending ? `<br/>Le coach a <strong style="color:#f59e0b;">${COACH_APPROVAL_HOURS} heures</strong> pour confirmer. Vous serez prévenu dès sa réponse ; en cas de refus, vous êtes remboursé.` : ''}
    </p>

    <table cellpadding="0" cellspacing="0" width="100%" style="background:rgba(124,58,237,0.06);border:1px solid rgba(124,58,237,0.2);border-radius:12px;padding:18px 20px;margin-bottom:22px;">
      <tr>
        <td colspan="2" style="font-size:24px;font-weight:800;color:#e8e4dc;text-align:center;padding-bottom:6px;">${timeStr}</td>
      </tr>
      <tr>
        <td colspan="2" style="font-size:13px;color:rgba(232,228,220,0.5);text-align:center;">${dateStr} · ${EMAIL_TZ_LABEL}</td>
      </tr>
    </table>

    ${isPending ? '' : meetingBlock(meetingUrl)}

    <div style="text-align:center;">
      ${isPending ? '' : `${cta('Rejoindre la session →', esc(meetingUrl), '#06b6d4')}\n      &nbsp;&nbsp;`}
      ${cta('Mon planning →', `${appUrl}/schedule`, '#7c3aed')}
    </div>
  `)

  await sendEmail('student_slot_proposed', {
    to:   email,
    subject: isPending
      ? `⏳ Demande envoyée — ${dateStr} à ${timeStr} (${EMAIL_TZ_LABEL}), en attente du coach`
      : `📅 Votre coaching confirmé — ${dateStr} à ${timeStr}`,
    html,
  })
}

/* ─────────────────────────────────────────────────────────── */
/* 6. Coach — preuve validée ou refusée par l'admin            */
/* ─────────────────────────────────────────────────────────── */
export async function sendCoachProofReviewedEmail({
  coachId, status, categoryLabel, reason,
}: {
  coachId: string
  status: 'approved' | 'rejected'
  categoryLabel: string
  reason?: string | null
}) {
  const email = await getUserEmail(coachId, 'coach_proof_reviewed')
  if (!email) return

  const appUrl = getAppUrl()
  const isApproved = status === 'approved'

  const html = shell(`
    <p style="font-size:12px;color:rgba(232,228,220,0.4);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:14px;">Vérification de preuve</p>

    <h1 style="font-size:22px;font-weight:800;color:#e8e4dc;letter-spacing:-0.4px;margin-bottom:8px;line-height:1.2;">
      ${isApproved ? 'Votre preuve est validée ✓' : 'Votre preuve a été refusée'}
    </h1>

    <p style="font-size:14px;color:rgba(232,228,220,0.55);margin-bottom:24px;line-height:1.55;">
      ${isApproved
        ? 'Notre équipe a vérifié votre preuve : elle est maintenant visible sur votre profil public et renforce votre crédibilité auprès des élèves.'
        : 'Notre équipe a examiné votre preuve mais n\'a pas pu la valider. Vous pouvez en soumettre une nouvelle depuis votre profil.'}
    </p>

    <table cellpadding="0" cellspacing="0" width="100%" style="background:rgba(232,228,220,0.03);border:1px solid rgba(232,228,220,0.07);border-radius:12px;padding:16px 18px;margin-bottom:8px;">
      <tr>
        <td style="font-size:12px;color:rgba(232,228,220,0.4);padding-bottom:6px;">Catégorie</td>
        <td align="right">${isApproved
          ? pill('Validée', '#4ade80', 'rgba(74,222,128,0.12)')
          : pill('Refusée', '#ef4444', 'rgba(239,68,68,0.12)')}</td>
      </tr>
      <tr>
        <td colspan="2" style="font-size:15px;font-weight:700;color:#e8e4dc;">${esc(categoryLabel)}</td>
      </tr>
      ${!isApproved && reason ? `<tr>
        <td colspan="2" style="font-size:13px;color:#ef4444;padding-top:12px;line-height:1.5;">Motif : ${esc(reason)}</td>
      </tr>` : ''}
    </table>

    ${cta(isApproved ? 'Voir mon profil →' : 'Soumettre une nouvelle preuve →', `${appUrl}/coach/profile`, isApproved ? '#4ade80' : '#7c3aed')}
  `)

  await sendEmail('coach_proof_reviewed', {
    to:   email,
    subject: isApproved
      ? `✅ Votre preuve "${categoryLabel}" est validée`
      : `❌ Votre preuve "${categoryLabel}" a été refusée`,
    html,
  })
}

/* ─────────────────────────────────────────────────────────── */
/* 7. Admin — alerte technique (échec webhook, booking perdu)  */
/* ─────────────────────────────────────────────────────────── */
export async function sendAdminAlertEmail({ subject, details }: { subject: string; details: Record<string, unknown> }) {
  const to = process.env.ADMIN_ALERT_EMAIL
  if (!to) {
    console.warn('[email] ADMIN_ALERT_EMAIL absente : alerte non envoyée :', subject)
    return
  }

  const rows = Object.entries(details)
    .map(([k, v]) => `<tr>
      <td style="font-size:12px;color:rgba(232,228,220,0.4);padding:4px 12px 4px 0;vertical-align:top;">${esc(k)}</td>
      <td style="font-size:13px;color:#e8e4dc;font-family:monospace;word-break:break-all;">${esc(String(v ?? '—'))}</td>
    </tr>`)
    .join('')

  const html = shell(`
    <p style="font-size:12px;color:#f87171;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:14px;">Alerte technique</p>
    <h1 style="font-size:20px;font-weight:800;color:#e8e4dc;letter-spacing:-0.4px;margin-bottom:16px;line-height:1.3;">${esc(subject)}</h1>
    <table cellpadding="0" cellspacing="0" width="100%" style="background:rgba(232,228,220,0.03);border:1px solid rgba(232,228,220,0.07);border-radius:12px;padding:16px 18px;">
      ${rows}
    </table>
  `)

  await sendEmail('admin_alert', { to, subject: `🚨 [OnlyPok] ${subject}`, html })
}
