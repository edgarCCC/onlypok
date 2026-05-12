import { Resend } from 'resend'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

const FROM = process.env.EMAIL_FROM ?? 'OnlyPok <noreply@onlypok.com>'

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  return new Resend(process.env.RESEND_API_KEY)
}

/* ── Get email from Supabase Auth ─────────────────────────── */
async function getUserEmail(userId: string): Promise<string | null> {
  const admin = createAdminSupabaseClient()
  const { data } = await admin.auth.admin.getUserById(userId)
  return data.user?.email ?? null
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
          <a href="https://onlypok.com" style="color:rgba(232,228,220,0.3);text-decoration:none;">onlypok.com</a>
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
  const email = await getUserEmail(coachId)
  if (!email) return

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://onlypok.com'

  const html = shell(`
    <p style="font-size:12px;color:rgba(232,228,220,0.4);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:14px;">Nouvelle réservation</p>

    <h1 style="font-size:22px;font-weight:800;color:#e8e4dc;letter-spacing:-0.4px;margin-bottom:8px;line-height:1.2;">
      ${studentUsername} veut un coaching
    </h1>

    <p style="font-size:14px;color:rgba(232,228,220,0.55);margin-bottom:24px;line-height:1.55;">
      Un élève vient de réserver votre coaching. Vous avez <strong style="color:#f59e0b;">48 heures</strong> pour accepter ou refuser la demande.
    </p>

    <table cellpadding="0" cellspacing="0" width="100%" style="background:rgba(232,228,220,0.03);border:1px solid rgba(232,228,220,0.07);border-radius:12px;padding:16px 18px;margin-bottom:8px;">
      <tr>
        <td style="font-size:12px;color:rgba(232,228,220,0.4);padding-bottom:6px;">Formation</td>
        <td align="right">${pill('Coaching', '#7c3aed', 'rgba(124,58,237,0.12)')}</td>
      </tr>
      <tr>
        <td colspan="2" style="font-size:15px;font-weight:700;color:#e8e4dc;padding-bottom:12px;">${formationTitle}</td>
      </tr>
      ${packLabel ? `<tr>
        <td style="font-size:12px;color:rgba(232,228,220,0.4);">Pack</td>
        <td align="right" style="font-size:13px;color:#06b6d4;font-weight:600;">${packLabel}</td>
      </tr>` : ''}
      ${price != null ? `<tr>
        <td style="font-size:12px;color:rgba(232,228,220,0.4);padding-top:6px;">Montant retenu</td>
        <td align="right" style="font-size:16px;font-weight:800;color:#4ade80;">${price}€</td>
      </tr>` : ''}
    </table>

    <p style="font-size:12px;color:rgba(232,228,220,0.3);margin-bottom:0;margin-top:8px;">
      Le paiement est retenu sur le compte de l'élève. Il sera libéré après votre acceptation.
    </p>

    ${cta('Voir la demande →', `${appUrl}/coach/requests`, '#7c3aed')}
  `)

  const resend = getResend(); if (!resend) return
  await resend.emails.send({
    from: FROM,
    to:   email,
    subject: `🎯 ${studentUsername} a réservé votre coaching "${formationTitle}"`,
    html,
  })
}

/* ─────────────────────────────────────────────────────────── */
/* 2. Élève — coaching accepté                                 */
/* ─────────────────────────────────────────────────────────── */
export async function sendStudentBookingAcceptedEmail({
  studentId, coachUsername, formationTitle, bookingId,
}: {
  studentId: string
  coachUsername: string
  formationTitle: string
  bookingId: string
}) {
  const email = await getUserEmail(studentId)
  if (!email) return

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://onlypok.com'

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
      <strong style="color:#e8e4dc;">${coachUsername}</strong> a accepté votre demande pour<br/>
      <em style="color:#a78bfa;">${formationTitle}</em>.<br/>
      Choisissez maintenant votre créneau dans votre planning.
    </p>

    <div style="text-align:center;">
      ${cta('Choisir un créneau →', `${appUrl}/schedule`, '#10b981')}
    </div>

    <p style="font-size:11px;color:rgba(232,228,220,0.25);margin-top:20px;text-align:center;">
      Référence réservation : ${bookingId.slice(0, 8).toUpperCase()}
    </p>
  `)

  const resend = getResend(); if (!resend) return
  await resend.emails.send({
    from: FROM,
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
  const email = await getUserEmail(studentId)
  if (!email) return

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://onlypok.com'

  const html = shell(`
    <p style="font-size:12px;color:rgba(232,228,220,0.4);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:14px;">Coaching refusé</p>

    <h1 style="font-size:22px;font-weight:800;color:#e8e4dc;letter-spacing:-0.4px;margin-bottom:10px;line-height:1.2;">
      Votre demande n'a pas été acceptée
    </h1>

    <p style="font-size:14px;color:rgba(232,228,220,0.55);margin-bottom:20px;line-height:1.55;">
      <strong style="color:#e8e4dc;">${coachUsername}</strong> n'a pas pu accepter votre demande de coaching pour
      <em style="color:#a78bfa;">${formationTitle}</em>.
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

  const resend = getResend(); if (!resend) return
  await resend.emails.send({
    from: FROM,
    to:   email,
    subject: `Votre demande de coaching "${formationTitle}" — remboursement en cours`,
    html,
  })
}

/* ─────────────────────────────────────────────────────────── */
/* 4. Coach — créneau confirmé par l'élève                     */
/* ─────────────────────────────────────────────────────────── */
export async function sendCoachSlotConfirmedEmail({
  coachId, studentUsername, formationTitle, scheduledAt, meetingUrl,
}: {
  coachId: string
  studentUsername: string
  formationTitle: string
  scheduledAt: string
  meetingUrl: string
}) {
  const email = await getUserEmail(coachId)
  if (!email) return

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://onlypok.com'
  const date = new Date(scheduledAt)
  const dateStr = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  const html = shell(`
    <p style="font-size:12px;color:rgba(232,228,220,0.4);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:14px;">Session planifiée</p>

    <h1 style="font-size:22px;font-weight:800;color:#e8e4dc;letter-spacing:-0.4px;margin-bottom:8px;line-height:1.2;">
      Nouveau créneau réservé
    </h1>

    <p style="font-size:14px;color:rgba(232,228,220,0.55);margin-bottom:22px;line-height:1.55;">
      <strong style="color:#e8e4dc;">${studentUsername}</strong> a sélectionné un créneau pour votre coaching <em style="color:#a78bfa;">${formationTitle}</em>.
    </p>

    <table cellpadding="0" cellspacing="0" width="100%" style="background:rgba(6,182,212,0.06);border:1px solid rgba(6,182,212,0.2);border-radius:12px;padding:16px 18px;margin-bottom:22px;">
      <tr>
        <td style="font-size:12px;color:rgba(232,228,220,0.4);padding-bottom:4px;">Date</td>
        <td align="right" style="font-size:14px;font-weight:700;color:#e8e4dc;">${dateStr}</td>
      </tr>
      <tr>
        <td style="font-size:12px;color:rgba(232,228,220,0.4);">Heure</td>
        <td align="right" style="font-size:20px;font-weight:800;color:#06b6d4;">${timeStr}</td>
      </tr>
    </table>

    <table cellpadding="0" cellspacing="0" width="100%" style="background:rgba(6,182,212,0.06);border:1px solid rgba(6,182,212,0.25);border-radius:12px;padding:14px 18px;margin-bottom:22px;">
      <tr>
        <td style="font-size:12px;color:rgba(232,228,220,0.4);padding-bottom:6px;">Lien de la session</td>
      </tr>
      <tr>
        <td>
          <a href="${meetingUrl}" style="font-size:14px;font-weight:700;color:#06b6d4;text-decoration:none;word-break:break-all;">${meetingUrl}</a>
        </td>
      </tr>
    </table>

    ${cta('Rejoindre la session →', meetingUrl, '#06b6d4')}
    &nbsp;&nbsp;
    ${cta('Voir mes sessions →', `${appUrl}/coach/sessions`, '#7c3aed')}
  `)

  const resend = getResend(); if (!resend) return
  await resend.emails.send({
    from: FROM,
    to:   email,
    subject: `📅 ${studentUsername} a réservé le ${dateStr} à ${timeStr}`,
    html,
  })
}

/* ─────────────────────────────────────────────────────────── */
/* 5. Élève — confirmation de son créneau                      */
/* ─────────────────────────────────────────────────────────── */
export async function sendStudentSlotConfirmedEmail({
  studentId, coachUsername, formationTitle, scheduledAt, meetingUrl,
}: {
  studentId: string
  coachUsername: string
  formationTitle: string
  scheduledAt: string
  meetingUrl: string
}) {
  const email = await getUserEmail(studentId)
  if (!email) return

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://onlypok.com'
  const date = new Date(scheduledAt)
  const dateStr = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  const html = shell(`
    <div style="text-align:center;margin-bottom:22px;">
      <div style="display:inline-block;padding:10px 20px;border-radius:99px;background:rgba(6,182,212,0.12);border:1px solid rgba(6,182,212,0.3);">
        <span style="font-size:13px;font-weight:700;color:#06b6d4;letter-spacing:0.04em;">SESSION CONFIRMÉE</span>
      </div>
    </div>

    <h1 style="font-size:22px;font-weight:800;color:#e8e4dc;letter-spacing:-0.4px;margin-bottom:8px;line-height:1.2;text-align:center;">
      Votre créneau est réservé&nbsp;!
    </h1>

    <p style="font-size:14px;color:rgba(232,228,220,0.55);margin-bottom:22px;line-height:1.55;text-align:center;">
      Coaching <em style="color:#a78bfa;">${formationTitle}</em> avec <strong style="color:#e8e4dc;">${coachUsername}</strong>
    </p>

    <table cellpadding="0" cellspacing="0" width="100%" style="background:rgba(124,58,237,0.06);border:1px solid rgba(124,58,237,0.2);border-radius:12px;padding:18px 20px;margin-bottom:22px;">
      <tr>
        <td colspan="2" style="font-size:24px;font-weight:800;color:#e8e4dc;text-align:center;padding-bottom:6px;">${timeStr}</td>
      </tr>
      <tr>
        <td colspan="2" style="font-size:13px;color:rgba(232,228,220,0.5);text-align:center;">${dateStr}</td>
      </tr>
    </table>

    <table cellpadding="0" cellspacing="0" width="100%" style="background:rgba(6,182,212,0.06);border:1px solid rgba(6,182,212,0.25);border-radius:12px;padding:14px 18px;margin-bottom:20px;">
      <tr>
        <td style="font-size:12px;color:rgba(232,228,220,0.4);padding-bottom:6px;">Lien de la session</td>
      </tr>
      <tr>
        <td>
          <a href="${meetingUrl}" style="font-size:14px;font-weight:700;color:#06b6d4;text-decoration:none;word-break:break-all;">${meetingUrl}</a>
        </td>
      </tr>
    </table>

    <div style="text-align:center;">
      ${cta('Rejoindre la session →', meetingUrl, '#06b6d4')}
      &nbsp;&nbsp;
      ${cta('Mon planning →', `${appUrl}/schedule`, '#7c3aed')}
    </div>
  `)

  const resend = getResend(); if (!resend) return
  await resend.emails.send({
    from: FROM,
    to:   email,
    subject: `📅 Votre coaching confirmé — ${dateStr} à ${timeStr}`,
    html,
  })
}
