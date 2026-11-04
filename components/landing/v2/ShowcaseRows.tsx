// Lignes de la vitrine (S4) : un coach, un contenu. Composants validés du socle (ListRow, Badge), données réelles seulement.
import Badge from '@/components/ui/Badge'
import ListRow from '@/components/ui/ListRow'
import { LANDING_ROUTES } from '@/lib/routes'
import type { ShowcaseCoach, ShowcaseContent } from '@/lib/showcase'
import { eur, experience, hourlyRate, plural } from './format'
import { Avatar, Thumb } from './Media'

const MAX_VARIANTS = 3

/** Avatar, pseudo, variantes (3 puces au plus), tarif horaire s'il existe, « Vérifié ✓ » si les preuves sont approuvées. Jamais « Non vérifié », jamais une note. */
export function CoachRow({ coach }: { coach: ShowcaseCoach }) {
  const name = coach.username ?? 'Coach'
  const meta = [coach.formationCount > 0 ? plural(coach.formationCount, 'formation') : null, experience(coach.yearsExperience)].filter(Boolean)
  const rate = hourlyRate(coach.hourlyRate)
  const variants = coach.variants.slice(0, MAX_VARIANTS)
  return (
    <ListRow
      href={LANDING_ROUTES.coachProfile(coach.id)}
      leading={<Avatar src={coach.avatarUrl} name={name} />}
      title={<><span className="lp-name" title={name}>{name}</span>{coach.verified ? <> <span className="lp-verif">Vérifié ✓</span></> : null}</>}
      trailing={rate ? <span className="num">{rate}</span> : undefined}
    >
      {variants.length ? <div className="lp-chips">{variants.map((variant) => <Badge key={variant}>{variant}</Badge>)}</div> : null}
      {meta.length ? <p className="ui-row-meta num">{meta.join(' · ')}</p> : null}
    </ListRow>
  )
}

/** Vignette, type et variante, badge « Nouveau » (un par liste), titre sur deux lignes, coach · niveau · modules, prix. */
export function ContentRow({ content }: { content: ShowcaseContent }) {
  const kind = content.contentType === 'video' ? 'Vidéo' : 'Formation'
  const meta = [content.coachUsername ?? 'Coach', content.level, content.modulesCount > 0 ? plural(content.modulesCount, 'module') : null].filter(Boolean)
  return (
    <ListRow
      href={LANDING_ROUTES.formation(content.id)}
      leading={<Thumb src={content.thumbnailUrl} label={kind} />}
      eyebrow={<><span className="t-caps">{content.variant ? `${kind} · ${content.variant}` : kind}</span>{content.isNew ? <Badge variant="new">Nouveau</Badge> : null}</>}
      title={content.title}
      meta={<span className="num">{meta.join(' · ')}</span>}
      trailing={<span className="num">{eur(content.price)}</span>}
    />
  )
}
