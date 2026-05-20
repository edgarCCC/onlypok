import {
  Shield, MessageSquare, Send, Users, PenLine, Download, BarChart2,
  Radio, PlayCircle, Eye, User, Calendar, Phone, TrendingUp,
  CheckCircle, Database, Zap, BookOpen, MessageCircle,
  Clock, RefreshCw, Smartphone, Award, Lock, FileText,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface Highlight {
  id: string
  Icon: LucideIcon
  label: string
  desc: string
}

/* ── Commun aux trois types ── */
const ALL: Highlight[] = [
  { id: 'lifetime',    Icon: Clock,         label: 'Accès à vie',              desc: 'Regardez et re-regardez le contenu sans limite de temps' },
  { id: 'refund',      Icon: Shield,        label: 'Satisfait ou remboursé',   desc: 'Remboursement garanti sous 7 jours sans condition' },
  { id: 'updates',     Icon: RefreshCw,     label: 'Mises à jour incluses',    desc: 'Le contenu est enrichi et mis à jour régulièrement' },
  { id: 'mobile',      Icon: Smartphone,    label: 'Accès mobile',             desc: 'Disponible sur tous vos appareils, partout' },
  { id: 'discord',     Icon: MessageSquare, label: 'Support Discord',          desc: 'Accès au serveur Discord privé du coach' },
  { id: 'telegram',    Icon: Send,          label: 'Groupe Telegram',          desc: 'Accès au groupe Telegram actif du coach' },
  { id: 'community',   Icon: Users,         label: 'Communauté privée',        desc: 'Forum entre élèves et entraide de la communauté' },
  { id: 'certificate', Icon: Award,         label: 'Attestation de fin',       desc: 'Certificat de complétion de la formation' },
  { id: 'exercises',   Icon: PenLine,       label: 'Exercices pratiques',      desc: 'Quiz et exercices de révision inclus dans le contenu' },
  { id: 'files',       Icon: Download,      label: 'Fichiers téléchargeables', desc: 'Ranges, solves, PDF et supports de cours inclus' },
  { id: 'exclusive',   Icon: Lock,          label: 'Contenu exclusif',         desc: 'Non disponible sur aucune autre plateforme' },
  { id: 'solver',      Icon: BarChart2,     label: 'Études solver incluses',   desc: 'Accès aux ranges GTO et analyses PioSolver / GTO Wizard' },
  { id: 'live',        Icon: Radio,         label: 'Sessions live',            desc: 'Sessions en direct régulières avec le coach' },
  { id: 'replay',      Icon: PlayCircle,    label: 'Replay inclus',            desc: 'Chaque session enregistrée vous est remise après' },
  { id: 'handreview',  Icon: Eye,           label: 'Analyse de mains',         desc: 'Review de vos mains incluse dans le coaching' },
  { id: 'individual',  Icon: User,          label: 'Suivi individuel',         desc: 'Feedback personnalisé du coach après chaque session' },
  { id: 'cancel',      Icon: Calendar,      label: 'Annulation gratuite',      desc: "Annulation sans frais jusqu'à 24h avant la session" },
  { id: 'whatsapp',    Icon: Phone,         label: 'Hotline WhatsApp',         desc: 'Réponses rapides entre sessions par messagerie' },
  { id: 'progress',    Icon: TrendingUp,    label: 'Suivi de progression',     desc: 'Rapport de progression fourni à chaque session' },
  { id: 'guarantee',   Icon: CheckCircle,   label: 'Garantie résultats',       desc: 'Progressez ou remboursé — engagement du coach' },
  { id: 'database',    Icon: Database,      label: 'Base de mains',            desc: 'Accès à une base de données de mains analysées' },
  { id: 'priority',    Icon: Zap,           label: 'Priorité réservation',     desc: 'Créneaux prioritaires pour les élèves réguliers' },
  { id: 'structured',  Icon: BookOpen,      label: 'Programme structuré',      desc: 'Contenu organisé en chapitres et leçons progressifs' },
  { id: 'hd',          Icon: FileText,      label: 'Vidéo HD',                 desc: 'Toutes les vidéos en haute définition' },
  { id: 'chat',        Icon: MessageCircle, label: 'Chat avec le coach',       desc: 'Messagerie directe avec le coach pendant la formation' },
]

function pick(ids: string[]): Highlight[] {
  return ids.map(id => ALL.find(h => h.id === id)!).filter(Boolean)
}

/* ── Coaching : sessions individuelles, suivi, relationnel ── */
export const HIGHLIGHTS_COACHING: Highlight[] = pick([
  'individual',   // Suivi individuel — cœur du coaching
  'replay',       // Replay inclus — session enregistrée
  'handreview',   // Analyse de mains — activité centrale
  'progress',     // Suivi de progression
  'structured',   // Programme structuré
  'solver',       // Études solver incluses
  'database',     // Base de mains
  'exercises',    // Exercices pratiques (homework)
  'files',        // Fichiers téléchargeables (ranges)
  'whatsapp',     // Hotline WhatsApp
  'chat',         // Chat avec le coach
  'discord',      // Support Discord
  'telegram',     // Groupe Telegram
  'community',    // Communauté privée
  'cancel',       // Annulation gratuite
  'priority',     // Priorité réservation
  'guarantee',    // Garantie résultats
  'refund',       // Satisfait ou remboursé
])

/* ── Formation : cours structuré en chapitres ── */
export const HIGHLIGHTS_FORMATION: Highlight[] = pick([
  'lifetime',     // Accès à vie
  'updates',      // Mises à jour incluses
  'mobile',       // Accès mobile
  'structured',   // Programme structuré
  'exercises',    // Exercices pratiques
  'files',        // Fichiers téléchargeables
  'solver',       // Études solver
  'database',     // Base de mains
  'certificate',  // Attestation de fin
  'exclusive',    // Contenu exclusif
  'hd',           // Vidéo HD
  'live',         // Sessions live (Q&A, masterclass)
  'discord',      // Support Discord
  'telegram',     // Groupe Telegram
  'community',    // Communauté privée
  'chat',         // Chat avec le coach
  'refund',       // Satisfait ou remboursé
  'guarantee',    // Garantie résultats
])

/* ── Vidéo standalone ── */
export const HIGHLIGHTS_VIDEO: Highlight[] = pick([
  'lifetime',     // Accès à vie
  'updates',      // Mises à jour incluses
  'mobile',       // Accès mobile
  'hd',           // Vidéo HD
  'exclusive',    // Contenu exclusif
  'files',        // Fichiers téléchargeables
  'solver',       // Études solver
  'discord',      // Support Discord
  'telegram',     // Groupe Telegram
  'community',    // Communauté privée
  'refund',       // Satisfait ou remboursé
])

/* Rétrocompatibilité — liste complète */
export const HIGHLIGHTS: Highlight[] = ALL
