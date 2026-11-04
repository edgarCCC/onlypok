// Questions fréquentes : <details> natif, accessible et immédiat. Rien qui ne soit déjà vrai dans le produit.
const QUESTIONS = [
  { q: 'Faut-il un abonnement ?', a: 'Non. Tu paies une formation ou un pack de coaching quand tu les choisis. Le trainer et le tracker sont gratuits.' },
  { q: 'Le trainer est-il utilisable sans compte ?', a: 'Oui. Ranges d’ouverture, calculateur d’équité et quiz sont accessibles sans inscription.' },
  { q: 'Peut-on regarder une formation avant de l’acheter ?', a: 'Oui, quand le coach a prévu des leçons gratuites : elles sont indiquées sur la fiche de la formation.' },
  { q: 'Comment se passe une séance de coaching ?', a: 'Tu choisis un coach et un pack, tu paies, puis tu proposes un créneau dans son agenda. Le coach valide, la séance se fait en visio, et une page te sert à préparer tes questions et tes mains.' },
  { q: 'Quelles salles le tracker prend-il en charge ?', a: 'Winamax et Betclic : tu importes tes fichiers et tes sessions, ta courbe de bankroll et tes statistiques se mettent à jour.' },
  { q: 'Comment devenir coach ?', a: 'Depuis la page « Devenir coach » : tu acceptes les conditions, tu complètes ton profil, puis tu publies tes contenus et tes offres. Tu n’apparais dans l’annuaire qu’une fois ton profil terminé.' },
]

export default function Faq() {
  return (
    <section id="faq" className="lp-faq" aria-labelledby="faq-title">
      <div className="ui-wrap lp-faq-grid">
        <h2 id="faq-title" className="lp-pillar-title">Questions fréquentes</h2>
        <div className="lp-faq-list">
          {QUESTIONS.map(({ q, a }) => (
            <details key={q} className="lp-faq-item">
              <summary>{q}<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
