/** Thème choisi posé avant le premier rendu : pas de flash. Sombre par défaut ; « clair » reste enregistré sur l'appareil. */
const SCRIPT = `try{var t=localStorage.getItem('op-theme');if(t==='light'){document.documentElement.dataset.theme='light'}}catch(e){}`

export default function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />
}
