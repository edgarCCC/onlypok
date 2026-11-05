'use client'
// Accueil du coach : ce qui attend une réponse d'abord, les chiffres ensuite, les contenus en dessous.
// La navigation (6 onglets, cloche, menu compte) n'est pas touchée ; l'onglet Contenus pointe toujours sur #content.
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react'
import FourAcesLoader from '@/components/FourAcesLoader'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import { useCoachBadges } from '../../useCoachBadges'
import './dashboard.css'

type ContentType = 'formation' | 'video' | 'coaching'
type TypeTab = 'all' | ContentType
type StatusFilter = 'all' | 'published' | 'draft' | 'students'
type Sort = 'recent' | 'students' | 'revenue' | 'alpha'

interface CoachFormation {
  id: string; title: string; price: number | null; published: boolean; level: string | null
  thumbnail_url: string | null; content_type: ContentType | null; created_at: string
  formation_purchases?: { count: number }[]
}
interface Purchase {
  created_at: string; amount_paid: number | null
  formations: { title?: string; price?: number | null; content_type?: string } | { title?: string; price?: number | null; content_type?: string }[] | null
}
interface Todo { key: string; title: string; detail: string; cta: string; href: string }

const TYPE_TABS: { id: TypeTab; label: string }[] = [
  { id: 'all', label: 'Tout' }, { id: 'coaching', label: 'Coaching' }, { id: 'formation', label: 'Formations' }, { id: 'video', label: 'Vidéos' },
]
const TYPE_LABEL: Record<ContentType, string> = { formation: 'Formation', video: 'Vidéo', coaching: 'Coaching' }
const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Tous' }, { id: 'published', label: 'Publiés' }, { id: 'draft', label: 'Brouillons' }, { id: 'students', label: 'Avec élèves' },
]
const SORTS: { id: Sort; label: string }[] = [
  { id: 'recent', label: 'Plus récents' }, { id: 'students', label: 'Élèves' }, { id: 'revenue', label: 'Revenus' }, { id: 'alpha', label: 'A à Z' },
]

const euro = (value: number) => `${value.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`
const plural = (count: number, one: string, many: string) => (count > 1 ? many : one)
const formationOf = (purchase: Purchase) => (Array.isArray(purchase.formations) ? purchase.formations[0] : purchase.formations)
const amountOf = (purchase: Purchase) => purchase.amount_paid ?? formationOf(purchase)?.price ?? 0
const studentsOf = (formation: CoachFormation) => formation.formation_purchases?.[0]?.count ?? 0
const revenueOf = (formation: CoachFormation) => (formation.price ?? 0) * studentsOf(formation)

function RevenueBars({ data }: { data: { month: string; rev: number }[] }) {
  const max = Math.max(...data.map((item) => item.rev), 1)
  return (
    <div className="ch-bars" role="img" aria-label={`Revenus des six derniers mois : ${data.map((item) => `${item.month} ${euro(item.rev)}`).join(', ')}`}>
      {data.map((item) => (
        <div key={item.month} className="ch-bar">
          <span className="ch-bar-val">{item.rev > 0 ? euro(item.rev) : ''}</span>
          <span className="ch-bar-track"><i style={{ transform: `scaleY(${item.rev / max})` }} /></span>
          <span className="ch-bar-month">{item.month}</span>
        </div>
      ))}
    </div>
  )
}

export default function CoachDashboard() {
  const supabase = useMemo(() => createClient(), [])
  const pathname = usePathname()
  const { user, profile } = useUser()
  const { badges } = useCoachBadges(user?.id, pathname)
  const [loading, setLoading] = useState(true)
  const [formations, setFormations] = useState<CoachFormation[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [ratings, setRatings] = useState<number[]>([])
  const [typeTab, setTypeTab] = useState<TypeTab>('all')
  const [statusTab, setStatusTab] = useState<StatusFilter>('all')
  const [sort, setSort] = useState<Sort>('recent')
  const [toDelete, setToDelete] = useState<{ id: string; title: string } | null>(null)
  const [actionError, setActionError] = useState('')
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      try {
        const [{ data: rows }, { data: reviews }, purchasesRes] = await Promise.all([
          supabase.from('formations').select('*, formation_purchases(count)').eq('coach_id', user.id).order('created_at', { ascending: false }),
          supabase.from('reviews').select('rating, created_at').eq('coach_id', user.id),
          fetch('/api/coach/purchases?limit=20').catch(() => null),
        ])
        const body = purchasesRes?.ok ? await purchasesRes.json() : { purchases: [] }
        setFormations((rows ?? []) as CoachFormation[])
        setPurchases((body.purchases ?? []) as Purchase[])
        setRatings(((reviews ?? []) as { rating: number | null }[]).map((review) => review.rating ?? 0))
      } catch (error) {
        console.error('[coach dashboard]', error)
        setActionError('Une partie de ton accueil n’a pas pu se charger. Recharge la page.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [user, supabase])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (toDelete && !dialog.open) dialog.showModal()
    if (!toDelete && dialog.open) dialog.close()
  }, [toDelete])

  // L'onglet Contenus arrive avec #content : une fois la page chargée, on rejoint la section
  useEffect(() => {
    if (!loading && window.location.hash === '#content') document.getElementById('content')?.scrollIntoView()
  }, [loading])

  const togglePublish = async (formation: CoachFormation) => {
    setActionError('')
    const { error } = await supabase.from('formations').update({ published: !formation.published }).eq('id', formation.id)
    if (error) { setActionError('La publication n’a pas pu être modifiée. Réessaie.'); return }
    setFormations((previous) => previous.map((item) => (item.id === formation.id ? { ...item, published: !formation.published } : item)))
  }
  const confirmDelete = async () => {
    if (!toDelete) return
    setActionError('')
    const { error } = await supabase.from('formations').delete().eq('id', toDelete.id)
    if (error) { setActionError('Ce contenu n’a pas pu être supprimé. Réessaie.'); setToDelete(null); return }
    setFormations((previous) => previous.filter((item) => item.id !== toDelete.id))
    setToDelete(null)
  }

  if (loading) return <FourAcesLoader fullPage={false} />

  const now = new Date()
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const totalRevenue = purchases.reduce((sum, purchase) => sum + amountOf(purchase), 0)
  const studentsThisMonth = purchases.filter((purchase) => purchase.created_at?.slice(0, 7) === monthKey).length
  const published = formations.filter((formation) => formation.published).length
  const drafts = formations.length - published
  const averageRating = ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : null
  const sessionsToPlan = purchases.filter((purchase) => formationOf(purchase)?.content_type === 'coaching').length
  const monthly = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    return {
      month: date.toLocaleDateString('fr-FR', { month: 'short' }),
      rev: purchases.filter((purchase) => purchase.created_at?.slice(0, 7) === key).reduce((sum, purchase) => sum + amountOf(purchase), 0),
    }
  })

  const todos: Todo[] = []
  if (badges.agenda > 0) todos.push({ key: 'requests', title: `${badges.agenda} ${plural(badges.agenda, 'demande de créneau', 'demandes de créneau')} à valider`, detail: 'Un élève attend ta réponse.', cta: 'Répondre', href: '/coach/agenda?tab=validate' })
  if (sessionsToPlan > 0) todos.push({ key: 'sessions', title: `${sessionsToPlan} ${plural(sessionsToPlan, 'session vendue', 'sessions vendues')} à planifier`, detail: 'Vérifie qu’un créneau est prévu pour chacune.', cta: 'Ouvrir l’agenda', href: '/coach/agenda' })
  if (badges.messages > 0) todos.push({ key: 'messages', title: `${badges.messages} ${plural(badges.messages, 'message non lu', 'messages non lus')}`, detail: 'Tes élèves t’ont écrit.', cta: 'Lire', href: '/coach/messages' })
  if (profile?.onboarding_completed === false) todos.push({ key: 'profile', title: 'Finalise ton profil coach', detail: 'Il n’apparaît dans l’annuaire qu’une fois complet.', cta: 'Finaliser', href: '/coach/onboarding' })
  if (drafts > 0) todos.push({ key: 'drafts', title: `${drafts} ${plural(drafts, 'contenu', 'contenus')} en brouillon`, detail: 'Ils restent invisibles tant qu’ils ne sont pas publiés.', cta: 'Voir', href: '#content' })

  const typed = (tab: TypeTab) => (tab === 'all' ? formations : formations.filter((formation) => (formation.content_type ?? 'formation') === tab))
  const rows = typed(typeTab)
    .filter((formation) => statusTab === 'all' || (statusTab === 'published' && formation.published) || (statusTab === 'draft' && !formation.published) || (statusTab === 'students' && studentsOf(formation) > 0))
    .sort((a, b) => {
      if (sort === 'students') return studentsOf(b) - studentsOf(a)
      if (sort === 'revenue') return revenueOf(b) - revenueOf(a)
      if (sort === 'alpha') return (a.title ?? '').localeCompare(b.title ?? '', 'fr')
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  const name = profile?.username ? profile.username.charAt(0).toUpperCase() + profile.username.slice(1) : 'Coach'
  const hour = now.getHours()
  const newHref = `/coach/formations/new?type=${typeTab === 'all' ? 'formation' : typeTab}`

  return (
    <div className="ch">
      <header className="ch-head">
        <h1 className="t-title">{hour < 18 ? 'Bonjour' : 'Bonsoir'} {name}</h1>
        <p className="t-2">{todos.length ? `${todos.length} ${plural(todos.length, 'chose attend', 'choses attendent')} ton attention.` : 'Rien d’urgent pour l’instant.'}</p>
      </header>

      {actionError && <p className="ui-field-error ch-error" role="alert">{actionError}</p>}

      <section aria-labelledby="ch-todo">
        <h2 id="ch-todo" className="t-caps ch-label">À faire</h2>
        {todos.length > 0 ? (
          <ul className="ch-todos">
            {todos.map((todo, index) => (
              <li key={todo.key} className="ch-todo">
                <div className="ch-todo-text">
                  <p className="ch-todo-title">{todo.title}</p>
                  <p className="t-2 ch-todo-detail">{todo.detail}</p>
                </div>
                <Link href={todo.href} className={`ui-btn ui-btn-sm ${index === 0 ? 'ui-btn-primary' : 'ui-btn-secondary'}`}>{todo.cta}</Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ch-clear t-2">Les demandes de créneau, les messages et les brouillons s’afficheront ici.</p>
        )}
      </section>

      <div className="ch-numbers">
        <dl className="ch-kpis on-forest">
          <Link href="/coach/revenue" className="ch-kpi"><dt>Revenus</dt><dd>{euro(totalRevenue)}</dd></Link>
          <Link href="/coach/students" className="ch-kpi"><dt>Élèves ce mois</dt><dd>{studentsThisMonth}</dd></Link>
          <a href="#content" className="ch-kpi"><dt>Contenus publiés</dt><dd>{published}</dd></a>
          <Link href="/coach/reviews" className="ch-kpi"><dt>Note moyenne</dt><dd>{averageRating !== null ? averageRating.toFixed(1).replace('.', ',') : '—'}</dd></Link>
        </dl>
        <section className="ch-revenue on-ink" aria-labelledby="ch-rev">
          <div className="ch-section-head">
            <h2 id="ch-rev" className="t-caps">Revenus sur 6 mois</h2>
            <Link href="/coach/revenue" className="ch-more">Le détail</Link>
          </div>
          {totalRevenue > 0 ? <RevenueBars data={monthly} /> : <p className="t-2 ch-norev">Pas encore de vente. Tes revenus s’afficheront ici mois par mois.</p>}
        </section>
      </div>

      <section id="content" className="ch-content" aria-labelledby="ch-contents">
        <div className="ch-section-head">
          <h2 id="ch-contents" className="t-heading">Mes contenus</h2>
          <Link href={newHref} className="ui-btn ui-btn-secondary ui-btn-sm"><Plus size={14} aria-hidden="true" /> Nouveau contenu</Link>
        </div>
        <div className="ch-filters">
          <div className="ui-seg" role="group" aria-label="Type de contenu">
            {TYPE_TABS.map(({ id, label }) => <button key={id} type="button" className="ui-seg-item" aria-pressed={typeTab === id} onClick={() => { setTypeTab(id); setStatusTab('all') }}>{label} <span className="ch-count">{typed(id).length}</span></button>)}
          </div>
          <div className="ui-seg" role="group" aria-label="État">
            {STATUS_TABS.map(({ id, label }) => <button key={id} type="button" className="ui-seg-item" aria-pressed={statusTab === id} onClick={() => setStatusTab(id)}>{label}</button>)}
          </div>
          <label className="ch-sort">
            <span>Trier</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as Sort)}>
              {SORTS.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>
        </div>

        {rows.length === 0 ? (
          <div className="ui-empty">
            <p>{formations.length === 0 ? 'Tu n’as encore rien publié. Une formation, une vidéo ou une offre de coaching suffit pour apparaître au catalogue.' : 'Aucun contenu ne correspond à ce filtre.'}</p>
            {formations.length === 0 && <Link href={newHref} className="ui-btn ui-btn-primary">Créer mon premier contenu</Link>}
          </div>
        ) : (
          <ul className="ch-rows">
            {rows.map((formation) => {
              const type = formation.content_type ?? 'formation'
              const students = studentsOf(formation)
              return (
                <li key={formation.id} className="ch-row">
                  <span className="ch-thumb" aria-hidden="true" style={formation.thumbnail_url ? { backgroundImage: `url(${formation.thumbnail_url})` } : undefined} />
                  <div className="ch-row-body">
                    <p className="ch-row-title"><Link href={`/coach/formations/${formation.id}`}>{formation.title}</Link></p>
                    <p className="ch-row-meta">
                      <span className={formation.published ? 'ch-pub' : 'ch-draft'}>{formation.published ? 'Publié' : 'Brouillon'}</span>
                      <span>{TYPE_LABEL[type] ?? 'Formation'}</span>
                      <span>{formation.price ? euro(formation.price) : 'Gratuit'}</span>
                      {formation.level && <span>{formation.level}</span>}
                    </p>
                  </div>
                  <dl className="ch-row-nums">
                    <div><dt>Élèves</dt><dd>{students}</dd></div>
                    <div><dt>Revenus</dt><dd>{euro(revenueOf(formation))}</dd></div>
                  </dl>
                  <div className="ch-row-actions">
                    <button type="button" className="ch-icon" aria-label={formation.published ? `Dépublier ${formation.title}` : `Publier ${formation.title}`} title={formation.published ? 'Dépublier' : 'Publier'} onClick={() => togglePublish(formation)}>
                      {formation.published ? <Eye size={15} aria-hidden="true" /> : <EyeOff size={15} aria-hidden="true" />}
                    </button>
                    <Link href={`/coach/formations/${formation.id}`} className="ch-icon" aria-label={`Modifier ${formation.title}`} title="Modifier"><Pencil size={15} aria-hidden="true" /></Link>
                    <button type="button" className="ch-icon ch-icon-danger" aria-label={`Supprimer ${formation.title}`} title="Supprimer" onClick={() => setToDelete({ id: formation.id, title: formation.title })}><Trash2 size={15} aria-hidden="true" /></button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <dialog ref={dialogRef} className="ch-dialog" aria-labelledby="ch-del-title" onClose={() => setToDelete(null)}>
        <h3 id="ch-del-title" className="t-heading">Supprimer ce contenu ?</h3>
        <p className="t-2">« {toDelete?.title} » disparaîtra du catalogue. Cette action est irréversible.</p>
        <div className="ch-dialog-actions">
          <button type="button" className="ui-btn ui-btn-secondary" onClick={() => setToDelete(null)}>Annuler</button>
          <button type="button" className="ui-btn ui-btn-secondary ch-danger" onClick={confirmDelete}>Supprimer</button>
        </div>
      </dialog>
    </div>
  )
}
