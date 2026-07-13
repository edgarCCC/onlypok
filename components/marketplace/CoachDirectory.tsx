'use client'
import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import CoachCard from './CoachCard'
import CoachRow from './CoachRow'
import CoachSlidePanel from './CoachSlidePanel'
import { CREAM, MUTED, SILVER, DIM, CARD, VARIANTS_LIST } from './coachTheme'

/* Budgets du header marketplace (onglet Coachs) → bornes de tarif horaire */
const HEADER_BUDGET_RANGES: Record<string, [number, number]> = {
  '< 50€/h':   [0, 49],
  '50–100€/h': [50, 100],
  '> 100€/h':  [101, Infinity],
}

const TAB_ACCENT = '#f59e0b' // couleur de l'onglet Coachs

/* Rangée curée : { titre, sous-titre, coachs, accent } — filtrée si non vide */
type Row = { key: string; title: string; subtitle: string; coaches: any[]; accent: string }

/* ─── Annuaire coachs — rangées façon Netflix dans l'onglet Coachs ──────────── */
export default function CoachDirectory({
  coaches,
  searchQuery = '',
  headerVariant = '',
  headerBudget = '',
}: {
  coaches: any[]
  searchQuery?: string
  headerVariant?: string
  headerBudget?: string
}) {
  const [activeCoach, setActiveCoach] = useState<any | null>(null)

  const hasHeaderFilters = Boolean(searchQuery.trim() || headerVariant || headerBudget)

  /* Jeu de coachs filtré par les critères du header (tri en haut) */
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const budgetRange = HEADER_BUDGET_RANGES[headerBudget]
    return coaches.filter(c => {
      const matchSearch = !q
        || (c.username ?? '').toLowerCase().includes(q)
        || (c.bio ?? '').toLowerCase().includes(q)
      const matchVariant = !headerVariant || (c.variants ?? []).includes(headerVariant)
      const matchBudget = !budgetRange || (
        (c.hourly_rate ?? 0) >= budgetRange[0] && (c.hourly_rate ?? 0) <= budgetRange[1]
      )
      return matchSearch && matchVariant && matchBudget
    })
  }, [coaches, searchQuery, headerVariant, headerBudget])

  /* Rangées curées, construites depuis les données disponibles */
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = []

    // 1. Les mieux notés
    const rated = coaches
      .filter(c => c.avgRating !== null && c.avgRating !== undefined)
      .sort((a, b) => (b.avgRating - a.avgRating) || ((b.reviewCount ?? 0) - (a.reviewCount ?? 0)))
    if (rated.length > 0) {
      out.push({ key: 'top', title: 'Les mieux notés', subtitle: 'Les coachs les plus recommandés par les élèves', coaches: rated, accent: TAB_ACCENT })
    }

    // 2. Rangées par variante — les plus représentées d'abord (max 3)
    const counts = VARIANTS_LIST
      .map(v => ({ v, list: coaches.filter(c => (c.variants ?? []).includes(v)) }))
      .filter(x => x.list.length >= 1)
      .sort((a, b) => b.list.length - a.list.length)
      .slice(0, 3)
    for (const { v, list } of counts) {
      out.push({ key: `var-${v}`, title: `Spécialistes ${v}`, subtitle: `Coachs experts en ${v}`, coaches: list, accent: TAB_ACCENT })
    }

    // 3. Coaching instantané
    const instant = coaches.filter(c => c.coaching_mode === 'auto')
    if (instant.length >= 2) {
      out.push({ key: 'instant', title: 'Réservation instantanée', subtitle: 'Bloque un créneau sans validation préalable', coaches: instant, accent: TAB_ACCENT })
    }

    // 4. Nouveaux coachs (les coachs arrivent déjà triés du plus récent au plus ancien)
    if (coaches.length > 0) {
      out.push({ key: 'new', title: 'Nouveaux coachs', subtitle: 'Fraîchement arrivés sur la plateforme', coaches: coaches.slice(0, 12), accent: TAB_ACCENT })
    }

    return out
  }, [coaches])

  const EmptyState = (
    <div style={{
      textAlign: 'center', padding: '100px 0',
      background: CARD, border: `1px solid ${DIM}`, borderRadius: 20,
    }}>
      <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.2, display: 'flex', justifyContent: 'center' }}>
        <Search size={40} color={CREAM} />
      </div>
      <p style={{ color: CREAM, fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Aucun coach trouvé</p>
      <p style={{ color: MUTED, fontSize: 13 }}>Essayez de modifier votre recherche en haut de page</p>
    </div>
  )

  return (
    <div>
      {hasHeaderFilters ? (
        /* Recherche active → grille de résultats */
        filtered.length === 0 ? EmptyState : (
          <div>
            <div style={{ fontSize: 11, color: SILVER, marginBottom: 14 }}>
              {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gridAutoRows: '340px', gap: 20 }}>
              {filtered.map(coach => (
                <div key={coach.id} style={{ height: '100%' }}>
                  <CoachCard coach={coach} onOpen={() => setActiveCoach(coach)} />
                </div>
              ))}
            </div>
          </div>
        )
      ) : (
        /* Vue par défaut → rangées curées façon Netflix */
        rows.length === 0 ? EmptyState : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 52 }}>
            {rows.map(row => (
              <CoachRow
                key={row.key}
                title={row.title}
                subtitle={row.subtitle}
                coaches={row.coaches}
                accentColor={row.accent}
                onOpen={setActiveCoach}
              />
            ))}
          </div>
        )
      )}

      {/* Panneau latéral au clic sur une carte */}
      {activeCoach && (
        <CoachSlidePanel coach={activeCoach} onClose={() => setActiveCoach(null)} />
      )}
    </div>
  )
}
