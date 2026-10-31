import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { object, optional, readJsonBody, string } from '@/lib/validate'

export const maxDuration = 60

const MAX_NOTES_LEN = 8000
const MAX_TITLE_LEN = 200
/* 8 000 caractères UTF-8 (4 octets max) + titre : 64 Ko suffisent. */
const MAX_BODY_BYTES = 64 * 1024

/* Q11 — notes typées et bornées (coût API) ; le titre vient de la base (aucune
   longueur max côté formulaire) : typé puis tronqué à MAX_TITLE_LEN, jamais refusé, comme avant. */
const SynthesizeBody = object({
  notes: string({ min: 1, max: MAX_NOTES_LEN }),
  title: optional(string({ max: MAX_TITLE_LEN, truncate: true })),
})

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Anti-abus (brûlage de crédits API) : 15 synthèses / minute / utilisateur.
  const limit = rateLimit(`synthesize:${user.id}`, 15, 60_000)
  if (!limit.ok) return tooManyRequests(limit.retryAfter)

  const body = await readJsonBody(req, SynthesizeBody, { tag: 'ai/synthesize', maxBytes: MAX_BODY_BYTES })
  if (!body.ok) return body.response
  const { notes, title } = body.data

  if (!notes.trim()) {
    return NextResponse.json({ error: 'Notes vides' }, { status: 400 })
  }

  const safeTitle = title ?? ''

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Clé API manquante' }, { status: 500 })
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: `Tu synthétises des notes de cours de poker en mind map Markdown.

Notes de la vidéo "${safeTitle}" :
${notes}

RÈGLES STRICTES :
- Titre principal (# ) : 2-4 mots, pas d'emoji
- 3 à 5 catégories (## ) : 2-3 mots max, pas d'emoji, sans ponctuation
- Sous-points (- ) : 2-4 mots max, pas d'emoji, valeur concrète ou chiffre si possible
- Maximum 2 niveaux (## et -), 3 à 5 sous-points par catégorie
- AUCUN emoji, AUCUN symbole spécial, AUCUNE parenthèse
- Labels ultra-courts pour tenir dans un bloc

Exemple parfait :
# Cash 6max NL100
## 3bet Range
- AQs KQs position
- Éviter KJo OOP
- Ratio value bluff 2:1
## CBet Flop
- 1/3 boards secs
- 2/3 boards humides
- Check-raise sets tirages
## Bankroll
- Max 5% par table
- Stop loss 3 BI

Réponds UNIQUEMENT avec le Markdown, rien d'autre.`,
        },
      ],
    })

    const markdown = (message.content[0] as { type: string; text: string }).text

    return NextResponse.json({ markdown })
  } catch (err: unknown) {
    console.error('[synthesize]', err)
    return NextResponse.json({ error: 'Synthèse indisponible' }, { status: 500 })
  }
}
