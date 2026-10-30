/* ── Bankroll unifiée du tracker ───────────────────────────────────────────────
   Source unique de vérité pour /tracker/bankroll et /tracker/dashboard :
     bankroll = initiale + résultats tournois + sessions cash ± dépôts/retraits
   Les deux pages appellent les mêmes fonctions → les chiffres concordent. */
import type { createClient } from '@/lib/supabase/client'

type TrackerSupabase = ReturnType<typeof createClient>

export type BankrollTournament  = { date: string; net_profit: number }
export type BankrollCashSession = { date: string; buy_in: number; cash_out: number }
export type BankrollTransaction = { date: string; type: 'deposit' | 'withdrawal'; amount: number }
export type BankrollPoint       = { label: string; value: number }

export interface BankrollSummary {
  points: BankrollPoint[]
  current: number
  mttProfit: number
  cashProfit: number
  netDeposits: number
}

const pointLabel = (day: string) =>
  new Date(day).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })

/* Courbe journalière : un point « Départ » puis un point par jour avec activité. */
export function computeBankroll(input: {
  initialBankroll: number
  tournaments: readonly BankrollTournament[]
  cashSessions: readonly BankrollCashSession[]
  transactions: readonly BankrollTransaction[]
}): BankrollSummary {
  const { initialBankroll, tournaments, cashSessions, transactions } = input
  const deltasByDay = new Map<string, number>()
  const add = (date: string, delta: number) => {
    const d = date.slice(0, 10)
    deltasByDay.set(d, (deltasByDay.get(d) ?? 0) + delta)
  }

  let mtt = 0, cash = 0, dep = 0
  tournaments.forEach(t  => { const v = Number(t.net_profit) || 0; mtt += v; add(t.date, v) })
  cashSessions.forEach(s => { const v = cashSessionProfit(s); cash += v; add(s.date, v) })
  transactions.forEach(t => { const v = transactionDelta(t); dep += v; add(t.date, v) })

  const days = [...deltasByDay.keys()].sort()
  let running = initialBankroll
  const points: BankrollPoint[] = [{ label: 'Départ', value: initialBankroll }]
  for (const d of days) {
    running += deltasByDay.get(d)!
    points.push({ label: pointLabel(d), value: running })
  }
  return { points, current: running, mttProfit: mtt, cashProfit: cash, netDeposits: dep }
}

export const cashSessionProfit = (s: BankrollCashSession): number =>
  (Number(s.cash_out) - Number(s.buy_in)) || 0

export const transactionDelta = (t: BankrollTransaction): number =>
  t.type === 'deposit' ? Number(t.amount) : -Number(t.amount)

/* Table absente → migration tracker-v2 pas encore lancée.
   PostgREST renvoie PGRST205, le code SQL brut serait 42P01 — on couvre les deux. */
export const isMissingTableError = (e: { code?: string; message?: string } | null): boolean =>
  !!e && (e.code === '42P01' || e.code === 'PGRST205' || (e.message ?? '').includes('Could not find the table'))

/* PostgREST plafonne chaque réponse (max-rows = 1000 par défaut) : sans pagination,
   un joueur à 1 270 tournois verrait un sous-ensemble différent selon le tri
   (dashboard en desc, bankroll en asc) et les bankrolls divergeraient.
   On boucle donc sur .range() jusqu'à épuisement, avec un tri stable (date, id). */
const PAGE_SIZE = 1000

type QueryError = { code?: string; message: string }

export async function fetchAllRows<R>(
  supabase: TrackerSupabase,
  table: string,
  columns: string,
  userId: string,
  ascending = true,
): Promise<{ data: R[]; error: QueryError | null }> {
  const all: R[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .eq('user_id', userId)
      .order('date', { ascending })
      .order('id', { ascending })
      .range(from, from + PAGE_SIZE - 1)
    if (error) return { data: all, error }
    const page = ((data ?? []) as unknown) as R[]
    all.push(...page)
    if (page.length < PAGE_SIZE) return { data: all, error: null }
  }
}

/* Tous les tournois importés d'un joueur (paginé). */
export function loadAllTournaments<R>(
  supabase: TrackerSupabase,
  userId: string,
  columns: string,
  ascending = true,
): Promise<{ data: R[]; error: QueryError | null }> {
  return fetchAllRows<R>(supabase, 'tournament_results', columns, userId, ascending)
}

/* Chargement des données « hors tournois » de la bankroll (sessions cash,
   dépôts/retraits, bankroll initiale). Les tournois sont chargés par chaque page
   car elle n'a pas besoin des mêmes colonnes. */
export async function loadBankrollExtras<
  S extends BankrollCashSession = BankrollCashSession,
  X extends BankrollTransaction = BankrollTransaction,
>(
  supabase: TrackerSupabase,
  userId: string,
  cols: { sessions?: string; transactions?: string } = {},
): Promise<{ cashSessions: S[]; transactions: X[]; initialBankroll: number; needsMigration: boolean }> {
  const [sRes, txRes, setRes] = await Promise.all([
    fetchAllRows<S>(supabase, 'tracker_sessions', cols.sessions ?? 'date, buy_in, cash_out', userId),
    fetchAllRows<X>(supabase, 'tracker_transactions', cols.transactions ?? 'id, date, type, amount, notes', userId),
    supabase.from('tracker_settings').select('initial_bankroll').eq('user_id', userId).maybeSingle(),
  ])
  if (sRes.error) console.error('[bankroll] sessions load failed:', sRes.error.message)

  const cashSessions = sRes.data
  if (isMissingTableError(txRes.error) || isMissingTableError(setRes.error)) {
    return { cashSessions, transactions: [], initialBankroll: 0, needsMigration: true }
  }
  if (txRes.error)  console.error('[bankroll] transactions load failed:', txRes.error.message)
  if (setRes.error) console.error('[bankroll] settings load failed:', setRes.error.message)

  return {
    cashSessions,
    transactions: txRes.data,
    initialBankroll: Number((setRes.data as { initial_bankroll?: number } | null)?.initial_bankroll ?? 0),
    needsMigration: false,
  }
}
