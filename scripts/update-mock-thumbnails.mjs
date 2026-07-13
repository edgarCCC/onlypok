import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const yt = id => `https://img.youtube.com/vi/${id}/hqdefault.jpg`
const watch = id => `https://www.youtube.com/watch?v=${id}`

/* titre exact → [videoId, updateVideoUrl] */
const MAP = {
  // Vidéos
  'Review NL500 : session complète commentée':      ['woOYUbbDKmM'],
  "J'analyse la main la plus folle des WSOP":       ['KCAyrvmihak', true],
  '3-bet ou fold ? 20 spots décortiqués':           ['AzQ76fljTak'],
  'Bulle à 50K€ : décision à tapis':                ['tAddGLL0Wog', true],
  'Range vs range : le flop A72 rainbow':           ['UdOGuS8eeUk'],
  "Comment j'ai gagné un package EPT en Expresso":  ['ylQrcN5b-i0', true],
  'Squeeze spots en MTT : replay commenté':         ['Tp9EtkyBOFY'],
  'PLO : les pièges du double suited':              ['2p2Ixgqe50g'],
  'Hero call ou fold héroïque ? Live à Vegas':      ['XyPTTgQoLHg', true],
  'Deep run WCOOP : la table finale':               ['V7USVKMvq6g'],
  'Exploiter les fish en NL10':                     ['s24hqma4RzY', true],
  'Le check-raise river parfait':                   ['8Y2g95G3u_M'],
  'SNG hyper : push/fold chart en action':          ['6Y0t8EO5bOs'],
  "Lecture d'âme : triple barrel bluff":            ['2S56Mlh2v7g'],
  // Formations
  'Domination MTT : du reg au requin':              ['PlkBymJQoL4'],
  'Les fondamentaux du cash game 6-max':            ['woOYUbbDKmM'],
  'Débuter le poker en ligne':                      ['AzQ76fljTak'],
  'Expresso Mastery : hyper-turbo sans stress':     ['tj25-ehFR3o'],
  'PLO de A à Z : maîtrise le pot-limit':           ['_tjjsKK8RBY'],
  'ICM avancé : les bulles qui rapportent':         ['OOoEwq4xmgw'],
  'Ranges préflop : la bible 2026':                 ['AwSoKGJt9cc'],
  'Mental game : jouer son A-game':                 ['1jrWCYhHR1w'],
  'Stratégie PKO : chasser les primes':             ['HqwCtfn2oAE'],
  'Live poker : lire tes adversaires':              ['iViqfGt2068'],
  'Bankroll management pro':                        ['s24hqma4RzY'],
  "Heads-Up : l'art du duel":                       ['JKux10jyAz0'],
}

let done = 0
for (const [title, [id, withUrl]] of Object.entries(MAP)) {
  const patch = { thumbnail_url: yt(id), thumbnail_crop: { zoom: 1, x: 50, y: 50 } }
  if (withUrl) patch.video_url = watch(id)
  const { error, count } = await admin.from('formations').update(patch, { count: 'exact' }).eq('title', title)
  if (error) console.warn(`✗ ${title}: ${error.message}`)
  else if (!count) console.warn(`? introuvable : ${title}`)
  else done++
}
console.log(`miniatures mises à jour : ${done}/${Object.keys(MAP).length}`)
