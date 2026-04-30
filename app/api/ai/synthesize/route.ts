import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { notes, title } = await req.json()

    if (!notes?.trim()) {
      return NextResponse.json({ error: 'Notes vides' }, { status: 400 })
    }

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

Notes de la vidéo "${title}" :
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
  } catch (err: any) {
    console.error('[synthesize]', err)
    return NextResponse.json({ error: err?.message ?? 'Erreur serveur' }, { status: 500 })
  }
}
