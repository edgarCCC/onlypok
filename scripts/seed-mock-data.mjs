/* ─── Seed de données de démonstration ────────────────────────────────────────
   Crée 20 comptes (12 coachs + 8 élèves), ~36 contenus (formations, vidéos,
   offres coaching), des preuves validées et ~55 avis pour remplir le site.

   Usage :   node scripts/seed-mock-data.mjs
   Nettoyage : node scripts/cleanup-mock-data.mjs (supprime tout le mock)

   Tous les comptes utilisent le domaine @mock.onlypok.fr — c'est le marqueur
   utilisé par le script de nettoyage. Mot de passe commun : MockData2026!
──────────────────────────────────────────────────────────────────────────────── */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const MOCK_DOMAIN = 'mock.onlypok.fr'
const PASSWORD    = 'MockData2026!'
const daysAgo     = d => new Date(Date.now() - d * 86400000).toISOString()
const pick        = arr => arr[Math.floor(Math.random() * arr.length)]

/* ─── 12 coachs ─────────────────────────────────────────────────────────────── */
const COACHES = [
  { slug: 'viktor',  username: 'ViktorMTT',     variants: ['MTT', 'PKO'],        years: 8,  rate: 90,  pro: true,  verified: true,  mode: 'auto',
    bio: "Plus de 3 000 tables finales en ligne et deux titres majeurs sur les séries WCOOP. Je forme des joueurs de MTT depuis 2019 avec une méthode simple : des ranges solides, une gestion ICM chirurgicale et un mental d'acier.",
    packs: [{ name: 'Découverte', sessions: 1, price: 90, desc: 'Review de session + plan de travail personnalisé' }, { name: 'Progression', sessions: 5, price: 400, desc: '5 sessions structurées avec suivi entre les cours' }] },
  { slug: 'lea',     username: 'Lea_Rivers',    variants: ['Cash', 'NLH'],       years: 6,  rate: 75,  pro: true,  verified: true,  mode: 'manual',
    bio: "Régulière NL200-NL500 en ligne, je coache les joueurs de cash game qui veulent passer un cap technique. Approche exploitante assumée : on identifie les leaks adverses et les tiens, puis on construit ton plan de jeu.",
    packs: [{ name: 'Session unique', sessions: 1, price: 75, desc: 'Analyse de ta base de données + spots clés' }, { name: 'Pack grind', sessions: 4, price: 260, desc: '4 sessions + accès à mon groupe privé' }] },
  { slug: 'nitro',   username: 'NitroFold',     variants: ['Expresso', 'SNG'],   years: 4,  rate: 55,  pro: false, verified: true,  mode: 'auto',
    bio: "Spécialiste hyper-turbo : plus d'un million d'Expressos joués. Push/fold parfait, adaptation aux pools et gestion de variance : je t'apprends à transformer le chaos des hypers en edge régulier.",
    packs: [{ name: 'Kickstart', sessions: 2, price: 100, desc: 'Bases push/fold + review de 50 mains' }] },
  { slug: 'dark',    username: 'DarkTurn',      variants: ['MTT', 'Heads-Up'],   years: 12, rate: 140, pro: true,  verified: true,  mode: 'manual',
    bio: "Ancien joueur sponsorisé, 12 ans de high stakes. Je ne prends que quelques élèves à la fois pour un travail en profondeur : construction de ranges complètes, dynamique de table et exploitation maximale en heads-up.",
    packs: [{ name: 'Elite', sessions: 3, price: 390, desc: 'Programme intensif sur 3 semaines' }, { name: 'Mentorat', sessions: 10, price: 1150, desc: 'Suivi complet sur 3 mois, accès direct 7j/7' }] },
  { slug: 'marius',  username: 'PLO_Marius',    variants: ['PLO', 'Cash'],       years: 9,  rate: 110, pro: true,  verified: true,  mode: 'manual',
    bio: "Le PLO n'est pas du NLHE avec 4 cartes. Je joue PLO500+ depuis 7 ans et je t'apprends la vraie grammaire du jeu : équités, blockers, textures et agression sélective.",
    packs: [{ name: 'Transition PLO', sessions: 3, price: 300, desc: 'Pour les joueurs NLHE qui passent au PLO' }] },
  { slug: 'snap',    username: 'SnapShove',     variants: ['Expresso', 'MTT'],   years: 3,  rate: 45,  pro: false, verified: false, mode: 'auto',
    bio: "Grinder full-time depuis 3 ans, spécialiste des formats rapides. Coaching accessible et sans blabla : des charts, des reviews et des résultats.",
    packs: [{ name: 'Starter', sessions: 1, price: 45, desc: 'Première session découverte' }] },
  { slug: 'ana',     username: 'MissClick_Ana', variants: ['Cash', 'NLH'],       years: 5,  rate: 65,  pro: false, verified: true,  mode: 'manual',
    bio: "Coach pédagogue avant tout : j'accompagne les débutants et les joueurs de micro-limites vers leur premier vrai winrate. Bankroll management, discipline et fondamentaux techniques.",
    packs: [{ name: 'Fondations', sessions: 3, price: 170, desc: 'Les bases solides pour battre les micros' }] },
  { slug: 'hector',  username: 'GrindHector',   variants: ['MTT', 'SNG'],        years: 7,  rate: 80,  pro: true,  verified: true,  mode: 'auto',
    bio: "ICM freak. J'ai fait de la bulle et des tables finales mon terrain de jeu favori. Mes élèves gagnent en moyenne 15 points de ROI après 10 sessions. Les chiffres parlent.",
    packs: [{ name: 'ICM Bootcamp', sessions: 5, price: 350, desc: 'Bulles, tables finales et deals négociés' }] },
  { slug: 'wizard',  username: 'RangeWizard',   variants: ['NLH', 'Heads-Up'],   years: 10, rate: 120, pro: true,  verified: false, mode: 'manual',
    bio: "Théoricien du jeu converti au coaching. Solver depuis 2016, mais je t'apprends surtout QUAND t'en écarter. La théorie au service de l'exploitation, jamais l'inverse.",
    packs: [{ name: 'Theory Lab', sessions: 4, price: 420, desc: 'Étude solver + application en session' }] },
  { slug: 'tilt',    username: 'TiltZero',      variants: ['Live', 'MTT'],       years: 6,  rate: 70,  pro: false, verified: true,  mode: 'manual',
    bio: "Préparateur mental spécialisé poker. Ex-joueur pro, formé en psychologie du sport. Tilt, downswings, peur du move : on répare la fuite la plus chère de ton jeu — celle qui est entre tes deux oreilles.",
    packs: [{ name: 'Anti-tilt', sessions: 4, price: 250, desc: 'Protocole mental complet sur 1 mois' }] },
  { slug: 'blind',   username: 'BlindStealer',  variants: ['MTT', 'PKO'],        years: 4,  rate: 50,  pro: false, verified: false, mode: 'auto',
    bio: "Spécialiste PKO : les primes changent tout et 90% du field ne l'a pas compris. Je t'apprends à calculer et voler ce que les autres laissent sur la table.",
    packs: [] },
  { slug: 'kev',     username: 'CoachKev',      variants: ['Cash', 'Live'],      years: 11, rate: 95,  pro: true,  verified: true,  mode: 'manual',
    bio: "15 ans de live, des cercles parisiens aux festivals EPT. Tells, dynamique de table, gestion des amateurs et des regs : le live est un autre sport, je t'en donne les codes.",
    packs: [{ name: 'Live Ready', sessions: 2, price: 180, desc: 'Préparation complète avant ton premier festival' }] },
]

/* ─── 8 élèves (pour poster les avis) ───────────────────────────────────────── */
const STUDENTS = ['FishSlayer', 'CallingMax', 'Marine_bb', 'TurboTim', 'PocketJul', 'RiverQueen', 'SteackFrites', 'GTO_Noob']
  .map((username, i) => ({ slug: `student${i + 1}`, username }))

/* ─── Contenus ──────────────────────────────────────────────────────────────── */
const FORMATIONS = [
  { coach: 'viktor', title: 'Domination MTT : du reg au requin',            short: 'La méthode complète pour transformer tes deep runs en titres.', price: 89,  level: 'Avancé',        variant: 'MTT',      dur: 480, mods: 9,  img: 'mtt1' },
  { coach: 'lea',    title: 'Les fondamentaux du cash game 6-max',          short: 'Ranges, c-bet, 3-bet : tout ce qu\'il faut pour battre les micros.', price: 49, level: 'Débutant',     variant: 'Cash',     dur: 300, mods: 7,  img: 'cash1' },
  { coach: 'lea',    title: 'Débuter le poker en ligne',                    short: 'Le point de départ idéal : règles, lobby, bankroll et premiers pas.', price: 0, level: 'Débutant',     variant: 'Cash',     dur: 110, mods: 4,  img: 'start1' },
  { coach: 'nitro',  title: 'Expresso Mastery : hyper-turbo sans stress',   short: 'Push/fold parfait et adaptation aux pools, format le plus rapide du poker.', price: 39, level: 'Intermédiaire', variant: 'Expresso', dur: 180, mods: 5, img: 'exp1' },
  { coach: 'marius', title: 'PLO de A à Z : maîtrise le pot-limit',         short: 'Équités, blockers, textures : la vraie grammaire du PLO.', price: 119, level: 'Intermédiaire', variant: 'PLO',      dur: 540, mods: 11, img: 'plo1' },
  { coach: 'hector', title: 'ICM avancé : les bulles qui rapportent',       short: 'Prendre les bonnes décisions quand chaque jeton vaut de l\'argent.', price: 69, level: 'Avancé',    variant: 'MTT',      dur: 240, mods: 6,  img: 'icm1' },
  { coach: 'wizard', title: 'Ranges préflop : la bible 2026',               short: 'Toutes les ranges, toutes les positions, et surtout : quand s\'en écarter.', price: 59, level: 'Intermédiaire', variant: 'Cash', dur: 200, mods: 8, img: 'range1' },
  { coach: 'tilt',   title: 'Mental game : jouer son A-game',               short: 'Tilt, variance, discipline — répare la fuite la plus chère de ton jeu.', price: 45, level: 'Débutant', variant: 'NLH',      dur: 150, mods: 5,  img: 'mental1' },
  { coach: 'blind',  title: 'Stratégie PKO : chasser les primes',           short: 'Le calcul des bounties expliqué simplement, avec les spots types.', price: 55, level: 'Intermédiaire', variant: 'MTT',   dur: 210, mods: 6,  img: 'pko1' },
  { coach: 'kev',    title: 'Live poker : lire tes adversaires',            short: 'Tells, dynamique de table et exploitation des amateurs en casino.', price: 79, level: 'Intermédiaire', variant: 'NLH',   dur: 320, mods: 7,  img: 'live1' },
  { coach: 'ana',    title: 'Bankroll management pro',                      short: 'La compétence qui sépare les joueurs cassés des joueurs gagnants.', price: 29, level: 'Débutant',   variant: 'Cash',     dur: 100, mods: 4,  img: 'br1' },
  { coach: 'dark',   title: 'Heads-Up : l\'art du duel',                    short: 'Psychologie, agression et adaptation : dominer le face-à-face.', price: 149, level: 'Avancé',      variant: 'MTT',      dur: 420, mods: 8,  img: 'hu1' },
]

const VIDEOS = [
  { coach: 'lea',    title: 'Review NL500 : session complète commentée',        short: 'Une heure de grind décortiquée main par main.', price: 19, level: 'Avancé',        variant: 'Cash',     dur: 42, img: 'v1' },
  { coach: 'viktor', title: 'J\'analyse la main la plus folle des WSOP',        short: 'Quinte flush contre carré : que faire à tapis ?', price: 0,  level: 'Intermédiaire', variant: 'MTT',      dur: 12, img: 'v2', free: true },
  { coach: 'lea',    title: '3-bet ou fold ? 20 spots décortiqués',             short: 'La décision préflop la plus rentable du cash game.', price: 14, level: 'Intermédiaire', variant: 'Cash',  dur: 35, img: 'v3' },
  { coach: 'hector', title: 'Bulle à 50K€ : décision à tapis',                  short: 'L\'ICM en conditions réelles, stress inclus.', price: 0,  level: 'Avancé',        variant: 'MTT',      dur: 9,  img: 'v4', free: true },
  { coach: 'wizard', title: 'Range vs range : le flop A72 rainbow',             short: 'Le board le plus joué du poker passé au solver.', price: 9,  level: 'Intermédiaire', variant: 'Cash',  dur: 18, img: 'v5' },
  { coach: 'nitro',  title: 'Comment j\'ai gagné un package EPT en Expresso',   short: 'Du spin à 5€ au package à 5 000€ : le run commenté.', price: 0, level: 'Débutant',    variant: 'Expresso', dur: 14, img: 'v6', free: true },
  { coach: 'viktor', title: 'Squeeze spots en MTT : replay commenté',           short: 'Quand et comment squeezer sans se faire punir.', price: 12, level: 'Intermédiaire', variant: 'MTT',   dur: 28, img: 'v7' },
  { coach: 'marius', title: 'PLO : les pièges du double suited',                short: 'Les mains qui brillent... et qui ruinent les débutants.', price: 15, level: 'Intermédiaire', variant: 'PLO', dur: 22, img: 'v8' },
  { coach: 'kev',    title: 'Hero call ou fold héroïque ? Live à Vegas',        short: 'Une rivière à 12 000$ : dans la tête du joueur.', price: 0, level: 'Avancé',       variant: 'NLH',      dur: 11, img: 'v9', free: true },
  { coach: 'viktor', title: 'Deep run WCOOP : la table finale',                 short: 'Toute la TF commentée carte par carte.', price: 24, level: 'Avancé',        variant: 'MTT',      dur: 55, img: 'v10' },
  { coach: 'ana',    title: 'Exploiter les fish en NL10',                       short: 'Les 5 ajustements qui doublent ton winrate aux micros.', price: 0, level: 'Débutant',  variant: 'Cash',     dur: 13, img: 'v11', free: true },
  { coach: 'lea',    title: 'Le check-raise river parfait',                     short: 'Le move le plus rentable et le moins utilisé.', price: 11, level: 'Avancé',       variant: 'Cash',     dur: 16, img: 'v12' },
  { coach: 'snap',   title: 'SNG hyper : push/fold chart en action',            short: 'Appliquer les charts en temps réel sans réfléchir.', price: 8, level: 'Débutant',   variant: 'Expresso', dur: 25, img: 'v13' },
  { coach: 'kev',    title: 'Lecture d\'âme : triple barrel bluff',             short: 'Anatomie d\'un bluff à trois barrels en cash live.', price: 17, level: 'Avancé',    variant: 'NLH',      dur: 31, img: 'v14' },
]

/* URLs de vidéos publiques stables pour tester le player (à remplacer par du vrai contenu) */
const FREE_VIDEO_URLS = [
  'https://www.youtube.com/watch?v=jNQXAC9IVRw',
  'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
  'https://www.youtube.com/watch?v=jNQXAC9IVRw',
  'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
  'https://www.youtube.com/watch?v=jNQXAC9IVRw',
]

const REVIEW_COMMENTS = [
  'Pédagogie au top, je comprends enfin mes erreurs préflop.',
  'Très structuré, on sent l\'expérience. Je recommande.',
  'Mon ROI a clairement décollé depuis nos sessions.',
  'Explications limpides, même sur les concepts avancés.',
  'Le meilleur investissement de ma carrière poker.',
  'Contenu dense mais accessible, parfait pour progresser.',
  'Coach à l\'écoute, s\'adapte vraiment à ton niveau.',
  'Des reviews de sessions ultra détaillées, rien à dire.',
  'J\'ai gagné en confiance et ça se voit dans mes résultats.',
  'Sérieux, ponctuel, précis. Exactement ce que je cherchais.',
  'Format clair et exemples concrets, top qualité.',
  'Enfin quelqu\'un qui explique l\'ICM simplement !',
]

const thumb = seed => `https://picsum.photos/seed/onlypok-${seed}/640/360`

/* ─── helpers ──────────────────────────────────────────────────────────────── */
async function createUser(slug, username, role) {
  const email = `${slug}@${MOCK_DOMAIN}`
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true })
  if (error) throw new Error(`createUser ${email}: ${error.message}`)
  const id = data.user.id
  const { error: pErr } = await admin.from('profiles').upsert({ id, email, username, role, xp: 0 })
  if (pErr) throw new Error(`profile ${username}: ${pErr.message}`)
  return id
}

async function uploadAvatar(id, n) {
  try {
    const res = await fetch(`https://i.pravatar.cc/300?img=${n}`)
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    const path = `mock/${id}.jpg`
    const { error } = await admin.storage.from('avatars').upload(path, buf, { contentType: 'image/jpeg', upsert: true })
    if (error) { console.warn(`  avatar ${n}: ${error.message}`); return null }
    return admin.storage.from('avatars').getPublicUrl(path).data.publicUrl
  } catch { return null }
}

/* ─── run ──────────────────────────────────────────────────────────────────── */
console.log('── Seed OnlyPok mock data ──')

const coachIds = {}
for (const [i, c] of COACHES.entries()) {
  const id = await createUser(c.slug, c.username, 'coach')
  coachIds[c.slug] = id
  const avatar_url = await uploadAvatar(id, i + 11)
  const { error } = await admin.from('profiles').update({
    avatar_url,
    bio: c.bio,
    variants: c.variants,
    is_pro: c.pro,
    years_experience: c.years,
    hourly_rate: c.rate,
    coaching_mode: c.mode,
    coaching_packages: c.packs.map(p => ({ name: p.name, sessions: p.sessions, price: p.price, description: p.desc })),
  }).eq('id', id)
  if (error) throw new Error(`update coach ${c.username}: ${error.message}`)
  console.log(`coach   ✓ ${c.username}${avatar_url ? '' : ' (sans avatar)'}`)
}

const studentIds = {}
for (const [i, s] of STUDENTS.entries()) {
  const id = await createUser(s.slug, s.username, 'student')
  studentIds[s.slug] = id
  const avatar_url = await uploadAvatar(id, i + 40)
  if (avatar_url) await admin.from('profiles').update({ avatar_url }).eq('id', id)
  console.log(`student ✓ ${s.username}`)
}

/* Preuves validées (stats + longterme) pour les coachs vérifiés */
for (const c of COACHES.filter(c => c.verified)) {
  const rows = ['stats', 'longterme'].map((category, i) => ({
    coach_id: coachIds[c.slug],
    url: thumb(`proof-${c.slug}-${category}`),
    caption: category === 'stats' ? 'Tracker 12 derniers mois' : 'Graph lifetime',
    category,
    order_index: i,
    validation_status: 'validated',
  }))
  const { error } = await admin.from('coach_proofs').insert(rows)
  if (error) throw new Error(`proofs ${c.username}: ${error.message}`)
}
console.log(`proofs  ✓ ${COACHES.filter(c => c.verified).length} coachs vérifiés`)

/* Formations */
let day = 5
for (const f of FORMATIONS) {
  const { error } = await admin.from('formations').insert({
    coach_id: coachIds[f.coach], title: f.title, description: f.short, short_desc: f.short,
    price: f.price, level: f.level, variant: f.variant, thumbnail_url: thumb(f.img),
    published: true, content_type: 'formation', duration_minutes: f.dur, modules_count: f.mods,
    created_at: daysAgo(day), thumbnail_crop: { zoom: 1, x: 50, y: 50 },
  })
  if (error) throw new Error(`formation "${f.title}": ${error.message}`)
  day += 4
}
console.log(`formations ✓ ${FORMATIONS.length}`)

/* Vidéos */
day = 3
let freeIdx = 0
for (const v of VIDEOS) {
  const { error } = await admin.from('formations').insert({
    coach_id: coachIds[v.coach], title: v.title, description: v.short, short_desc: v.short,
    price: v.price, level: v.level, variant: v.variant, thumbnail_url: thumb(v.img),
    published: true, content_type: 'video', duration_minutes: v.dur, modules_count: 0,
    video_url: v.free ? FREE_VIDEO_URLS[freeIdx++ % FREE_VIDEO_URLS.length] : null,
    created_at: daysAgo(day), thumbnail_crop: { zoom: 1, x: 50, y: 50 },
  })
  if (error) throw new Error(`video "${v.title}": ${error.message}`)
  day += 3
}
console.log(`vidéos     ✓ ${VIDEOS.length}`)

/* Offres coaching (une par coach avec packs) */
let nCoaching = 0
for (const c of COACHES.filter(c => c.packs.length > 0)) {
  const { error } = await admin.from('formations').insert({
    coach_id: coachIds[c.slug],
    title: `Coaching ${c.variants[0]} avec ${c.username}`,
    description: c.bio, short_desc: c.bio.slice(0, 140),
    price: c.rate, level: null, variant: c.variants.find(v => ['MTT','NLH','Cash','Expresso','PLO'].includes(v)) ?? 'MTT',
    published: true, content_type: 'coaching', duration_minutes: 60, modules_count: 0,
    coaching_packs: c.packs.map(p => ({ label: p.name, hours: p.sessions, price: p.price, desc: p.desc })),
    created_at: daysAgo(10 + nCoaching * 5),
  })
  if (error) throw new Error(`coaching ${c.username}: ${error.message}`)
  nCoaching++
}
console.log(`coaching   ✓ ${nCoaching}`)

/* Avis — notes crédibles (majorité 4-5, quelques 3) */
const studentList = Object.values(studentIds)
const types = ['formation', 'formation', 'video', 'coaching']
let nReviews = 0
for (const c of COACHES) {
  const count = c.verified ? 5 + Math.floor(Math.random() * 4) : 1 + Math.floor(Math.random() * 3)
  for (let i = 0; i < count; i++) {
    const rating = pick([3, 4, 4, 5, 5, 5])
    const cat = () => Math.max(3, Math.min(5, rating + pick([-1, 0, 0, 1])))
    const { error } = await admin.from('reviews').insert({
      coach_id: coachIds[c.slug],
      student_id: studentList[(nReviews + i) % studentList.length],
      rating,
      comment: pick(REVIEW_COMMENTS),
      category_ratings: { pedagogy: cat(), clarity: cat(), communication: cat(), progress: cat(), punctuality: cat(), value: cat() },
      content_type: pick(types),
      created_at: daysAgo(1 + Math.floor(Math.random() * 55)),
    })
    if (error) throw new Error(`review ${c.username}: ${error.message}`)
    nReviews++
  }
}
console.log(`avis       ✓ ${nReviews}`)
console.log('── Terminé. Nettoyage : node scripts/cleanup-mock-data.mjs ──')
