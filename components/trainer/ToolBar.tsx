import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

/** La barre d'un outil : retour au trainer, titre pour les lecteurs d'écran, contrôles à gauche, actions à droite. */
export default function ToolBar({ backHref, title, children, actions }: { backHref: string; title: string; children?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="tr-bar">
      <div className="tr-bar-left">
        <Link href={backHref} className="tr-back"><ArrowLeft size={14} aria-hidden="true" /> Trainer</Link>
        <h1 className="tr-bar-title">{title}</h1>
        {children}
      </div>
      {actions && <div className="tr-bar-right">{actions}</div>}
    </div>
  )
}
