'use client'

/* Attente neutre : un indicateur de 16 px qui n'apparaît qu'au bout de 300 ms, jamais d'animation décorative pendant le chargement.
   Le nom est conservé pour ne pas retoucher les pages qui l'importent. */
export default function FourAcesLoader({ fullPage = true }: { fullPage?: boolean }) {
  return (
    <div className={fullPage ? 'ui-wait ui-wait-page' : 'ui-wait'} role="status" aria-label="Chargement">
      <span className="ui-spinner" aria-hidden="true" />
    </div>
  )
}
