'use client';

import Navbar from '@/components/landing/Navbar';
import Link from 'next/link';
import { useState, useCallback, useRef, useEffect } from 'react';
import { ArrowLeft, Target, Brain, Layers, Lock, Eraser, Save, Upload, Download, Trash2, ChevronDown, Settings, X, Share2 } from 'lucide-react';

/* ── Design tokens ─────────────────────────────────────────────── */
const CREAM   = '#f0f4ff';
const SILVER  = 'rgba(240,244,255,0.45)';
const DIM     = 'rgba(240,244,255,0.25)';
const VIOLET  = '#7c3aed';
const CYAN    = '#06b6d4';
const BG      = '#07090e';
const GRAD    = 'linear-gradient(135deg, #7c3aed, #06b6d4)';
const CARD_BG = 'rgba(232,228,220,0.03)';
const BORDER  = 'rgba(255,255,255,0.08)';

/* ── Types ─────────────────────────────────────────────────────── */
type Position  = 'LJ' | 'HJ' | 'CO' | 'BTN' | 'SB';
type AppMode   = 'config' | 'training' | 'summary' | 'quiz' | 'quiz-summary' | 'playground';
type ConfigTab = 'drill' | 'quiz' | 'playground';

type DrillScenario = {
  heroCards:    [string, string];
  gridHand:     string;
  heroPosition: Position;
  stackSize:    number;
  potSize:      number;
  actionText:   string;
};

type Mistake = {
  hand: string; position: string; stack: number;
  userAction: string; correctAction: string;
};

type QuizGrade = { label: string; pts: number; color: string };

type QuizResult = {
  hand: string; position: string; stack: number;
  userAction: string; correctAction: string;
} & QuizGrade;

type SavedRange = {
  id: string;
  name: string;
  comboMap: Record<string, string>;
  description?: string;
  createdAt: string;
};

const CUSTOM_ACTIONS = [
  { id: 'Raise',   label: 'Raise',   color: '#7c3aed', fg: '#ede9fe' },
  { id: 'All-in',  label: 'All-in',  color: '#dc2626', fg: '#fecaca' },
  { id: 'Limp',    label: 'Limp',    color: '#0891b2', fg: '#bae6fd' },
  { id: '3-bet',   label: '3-bet',   color: '#d97706', fg: '#fde68a' },
  { id: 'Call',    label: 'Call',    color: '#059669', fg: '#a7f3d0' },
] as const;
type CustomAction = typeof CUSTOM_ACTIONS[number]['id'];

/* ── Constants ─────────────────────────────────────────────────── */
const POSITIONS_LIST: Position[] = ['LJ', 'HJ', 'CO', 'BTN', 'SB'];
const STACKS_LIST = [100, 50, 25, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10];
const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];
const SUITS = ['h','d','c','s'];

const getHandFromCoords = (row: number, col: number) => {
  if (row === col) return `${RANKS[row]}${RANKS[col]}`;
  if (row < col)  return `${RANKS[row]}${RANKS[col]}s`;
  return `${RANKS[col]}${RANKS[row]}o`;
};

const getGridCoords = (h: string): [number, number] => {
  const i1 = RANKS.indexOf(h[0]), i2 = RANKS.indexOf(h[1]);
  if (h.length === 2) return [i1, i1];
  return h[2] === 's' ? [i1, i2] : [i2, i1];
};

const getNeighbors = (h: string) => {
  const [r, c] = getGridCoords(h);
  return (([[-1,0],[1,0],[0,-1],[0,1]] as [number,number][])
    .map(([dr,dc]) => [r+dr, c+dc])
    .filter(([nr,nc]) => nr>=0&&nr<13&&nc>=0&&nc<13)
    .map(([nr,nc]) => getHandFromCoords(nr,nc)));
};

const ALL_169: string[] = [];
for (let i=0;i<13;i++) for (let j=0;j<13;j++) ALL_169.push(getHandFromCoords(i,j));

const parseRange = (str: string): string[] => {
  if (!str) return [];
  const hands: string[] = [];
  str.split(',').map(s=>s.trim()).forEach(part => {
    if (!part) return;
    if (part.includes('-')) {
      const [a, b] = part.split('-');
      if (a.length===2 && a[0]===a[1]) {
        const [i1,i2] = [RANKS.indexOf(a[0]), RANKS.indexOf(b[0])];
        for (let i=i1;i<=i2;i++) hands.push(RANKS[i]+RANKS[i]);
      } else {
        const high=a[0], suf=a[2]||'', i1=RANKS.indexOf(a[1]), i2=RANKS.indexOf(b[1]);
        for (let i=i1;i<=i2;i++) hands.push(high+RANKS[i]+suf);
      }
    } else hands.push(part);
  });
  return hands;
};

const countCombos = (hand: string) => {
  if (hand.length === 2) return 6;
  if (hand[2] === 's')   return 4;
  return 12;
};

const gradeAnswer = (userAction: string, correctAction: string): QuizGrade => {
  if (userAction === correctAction) return { label: 'Parfait', pts: 3, color: '#4ade80' };
  if (userAction.includes('Raise') && (correctAction === 'Tightifie' || correctAction === 'Loosifie'))
    return { label: 'Proche', pts: 1, color: '#fbbf24' };
  if (userAction === 'Fold' && correctAction === 'Tightifie')
    return { label: 'Proche', pts: 1, color: '#fbbf24' };
  if ((userAction === 'Tightifie' || userAction === 'Loosifie') && correctAction.includes('Raise'))
    return { label: 'Proche', pts: 1, color: '#fbbf24' };
  return { label: 'Raté', pts: 0, color: '#ef4444' };
};

/* ── GTO Ranges ──────────────────────────────────────────────────── */
const RAW: Record<string,Record<string,string>> = {
  "LJ_100":{ name:"Lojack","Raise":"AA, KK, QQ, JJ, TT, 99, 88, 77, 66, 55, 44, AKs, AQs, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, KQs, KJs, KTs, K9s, K8s, K7s, QJs, QTs, Q9s, JTs, J9s, T9s, T8s, 98s, 87s, AKo, AQo, AJo, ATo, KQo, KJo","Tightifie":"44, A2s, K8s, K7s, 87s, KJo","Loosifie":"33, 22, K6s, Q8s, J8s, 97s, 76s, 65s, KTo, QJo, QTo, JTo"},
  "LJ_50": { name:"Lojack","Raise":"AA, KK, QQ, JJ, TT, 99, 88, 77, 66, 55, 44, 33, AKs, AQs, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, KQs, KJs, KTs, K9s, K8s, K7s, K6s, QJs, QTs, Q9s, Q8s, JTs, J9s, J8s, T9s, T8s, 98s, 87s, AKo, AQo, AJo, ATo, KQo, KJo, KTo, QJo","Tightifie":"33, A2s, K7s, K6s, 87s, KTo, QJo","Loosifie":"22, K5s, T7s, 97s, 86s, 76s, 65s, A9o, QTo, JTo"},
  "LJ_25": { name:"Lojack","Raise":"AA, KK, QQ, JJ, TT, 99, 88, 77, 66, 55, 44, AKs, AQs, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, KQs, KJs, KTs, K9s, K8s, K7s, K6s, QJs, QTs, Q9s, Q8s, JTs, J9s, J8s, T9s, T8s, 98s, 97s, 87s, AKo, AQo, AJo, ATo, A9o, KQo, KJo, KTo, QJo","Tightifie":"44, A2s, K6s, Q8s, J8s, 97s, 87s, A9o, KTo","Loosifie":"33, K5s, Q7s, 76s, A8o, QTo, JTo"},
  "LJ_20": { name:"Lojack","Raise":"AA, KK, QQ, JJ, TT, 99, 88, 77, 66, 55, AKs, AQs, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, KQs, KJs, KTs, K9s, K8s, K7s, QJs, QTs, Q9s, Q8s, JTs, J9s, J8s, T9s, T8s, 98s, 87s, AKo, AQo, AJo, ATo, A9o, KQo, KJo, QJo","Tightifie":"55, A3s, K7s, Q8s, J8s, 87s, A9o, QJo","Loosifie":"44, A2s, K6s, 97s, 76s, KTo, QTo, JTo"},
  "LJ_19": { name:"Lojack","Raise":"AA, KK, QQ, JJ, TT, 99, 88, 77, 66, 55, AKs, AQs, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, KQs, KJs, KTs, K9s, K8s, K7s, QJs, QTs, Q9s, Q8s, JTs, J9s, J8s, T9s, T8s, 98s, AKo, AQo, AJo, ATo, A9o, KQo, KJo, QJo"},
  "LJ_18": { name:"Lojack","Raise":"AA, KK, QQ, JJ, TT, 99, 88, 77, 66, 55, AKs, AQs, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, KQs, KJs, KTs, K9s, K8s, K7s, QJs, QTs, Q9s, Q8s, JTs, J9s, T9s, AKo, AQo, AJo, ATo, A9o, KQo, KJo, QJo"},
  "LJ_17": { name:"Lojack","Raise":"AA, KK, QQ, JJ, TT, 99, 88, 77, 66, 55, AKs, AQs, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, KQs, KJs, KTs, K9s, K8s, K7s, QJs, QTs, Q9s, Q8s, JTs, J9s, T9s, AKo, AQo, AJo, ATo, A9o, KQo, KJo, QJo"},
  "LJ_16": { name:"Lojack","Raise":"AA, KK, QQ, JJ, TT, 99, 88, 77, 66, 55, AKs, AQs, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, KQs, KJs, KTs, K9s, K8s, QJs, QTs, Q9s, JTs, J9s, T9s, AKo, AQo, AJo, ATo, A9o, KQo, KJo, QJo"},
  "LJ_15": { name:"Lojack","Raise":"AA, KK, QQ, JJ, TT, 99, 88, AKs, AQs, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, KQs, KJs, K9s, Q9s, J9s, T9s, AKo, AQo, A9o, KQo, KJo, QJo","All-in":"77, 66, 55, KTs, QJs, QTs, JTs, AJo, ATo"},
  "LJ_14": { name:"Lojack","Raise":"AA, KK, QQ, JJ, TT, 99, AKs, AQs, AJs, ATs, A7s, A6s, A5s, A4s, A3s, KQs, K9s, Q9s, J9s, T9s, AKo, A9o, KJo, QJo","All-in":"88, 77, 66, 55, 44, A9s, A8s, KJs, KTs, QJs, QTs, JTs, AQo, AJo, ATo, KQo"},
  "LJ_13": { name:"Lojack","Raise":"AA, KK, QQ, JJ, TT, 99, AKs, AQs, AJs, ATs, A3s, KQs, A9o, KJo","All-in":"88, 77, 66, 55, 44, 33, A9s, A8s, A7s, A6s, A5s, A4s, KJs, KTs, K9s, QJs, QTs, Q9s, JTs, J9s, T9s, AKo, AQo, AJo, ATo, KQo"},
  "LJ_12": { name:"Lojack","Raise":"AA, KK, QQ, JJ, TT, AKs, AQs, A2s, KTo, QJo","All-in":"99, 88, 77, 66, 55, 44, 33, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, KQs, KJs, KTs, K9s, QJs, QTs, Q9s, JTs, J9s, T9s, AKo, AQo, AJo, ATo, A9o, KQo, KJo"},
  "LJ_11": { name:"Lojack","Raise":"AA, KK, QQ, JJ, AKs, KTo","All-in":"TT, 99, 88, 77, 66, 55, 44, 33, 22, AQs, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, KQs, KJs, KTs, K9s, QJs, QTs, Q9s, JTs, J9s, T9s, AKo, AQo, AJo, ATo, A9o, A8o, KQo, KJo, QJo"},
  "LJ_10": { name:"Lojack","Raise":"AA, KK, QQ, KTo","All-in":"JJ, TT, 99, 88, 77, 66, 55, 44, 33, 22, AKs, AQs, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, KQs, KJs, KTs, K9s, QJs, QTs, Q9s, JTs, J9s, T9s, 98s, AKo, AQo, AJo, ATo, A9o, A8o, A7o, KQo, KJo, QJo"},
  "HJ_100": { name:"Hijack","Raise":"AA, KK, QQ, JJ, TT, 99, 88, 77, 66, 55, 44, 33, 22, AKs, AQs, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, KQs, KJs, KTs, K9s, K8s, K7s, K6s, K5s, QJs, QTs, Q9s, Q8s, JTs, J9s, J8s, T9s, T8s, T7s, 98s, 97s, 87s, 86s, 76s, AKo, AQo, AJo, ATo, A9o, KQo, KJo, KTo, QJo, QTo, JTo","Tightifie":"22, K5s, T7s, 86s, 76s, A9o, QTo, JTo","Loosifie":"K4s, Q7s, Q6s, J7s, 96s, 65s, 54s, A8o, T9o"},
  "HJ_50":  { name:"Hijack","Raise":"AA, KK, QQ, JJ, TT, 99, 88, 77, 66, 55, 44, 33, 22, AKs, AQs, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, KQs, KJs, KTs, K9s, K8s, K7s, K6s, K5s, QJs, QTs, Q9s, Q8s, Q7s, JTs, J9s, J8s, J7s, T9s, T8s, T7s, 98s, 97s, 87s, 86s, 76s, 65s, AKo, AQo, AJo, ATo, A9o, A8o, KQo, KJo, KTo, QJo, QTo, JTo","Tightifie":"22, Q7s, J7s, T7s, 86s, 65s, A8o","Loosifie":"K4s, K3s, Q6s, 54s, K9o, T9o"},
  "HJ_25":  { name:"Hijack","Raise":"AA, KK, QQ, JJ, TT, 99, 88, 77, 66, 55, 44, AKs, AQs, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, KQs, KJs, KTs, K9s, K8s, K7s, K6s, K5s, QJs, QTs, Q9s, Q8s, Q7s, Q6s, JTs, J9s, J8s, T9s, T8s, T7s, 98s, 97s, 87s, 86s, 76s, AKo, AQo, AJo, ATo, A9o, A8o, KQo, KJo, KTo, QJo, QTo, JTo","Tightifie":"44, K5s, Q6s, T7s, 86s, 76s, A8o","Loosifie":"33, K4s, Q5s, J7s, 96s, 65s, A7o, K9o, T9o"},
  "HJ_20":  { name:"Hijack","Raise":"AA, KK, QQ, JJ, TT, 99, 88, 77, 66, 55, AKs, AQs, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, KQs, KJs, KTs, K9s, K8s, K7s, K6s, K5s, QJs, QTs, Q9s, Q8s, Q7s, JTs, J9s, J8s, T9s, T8s, 98s, 97s, 87s, 76s, AKo, AQo, AJo, ATo, A9o, A8o, KQo, KJo, KTo, QJo, QTo","Tightifie":"A2s, K6s, K5s, Q7s, 97s, 87s, 76s, A8o, KTo, QTo","Loosifie":"44, Q6s, J7s, T7s, 86s, A7o, JTo"},
  "HJ_19":  { name:"Hijack","Raise":"AA, KK, QQ, JJ, TT, 99, 88, 77, 66, 55, AKs, AQs, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, KQs, KJs, KTs, K9s, K8s, K7s, K6s, QJs, QTs, Q9s, Q8s, Q7s, JTs, J9s, J8s, T9s, T8s, 98s, AKo, AQo, AJo, ATo, A9o, A8o, KQo, KJo, KTo, QJo, QTo"},
  "HJ_18":  { name:"Hijack","Raise":"AA, KK, QQ, JJ, TT, 99, 88, 77, 66, 55, AKs, AQs, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, KQs, KJs, KTs, K9s, K8s, K7s, K6s, QJs, QTs, Q9s, Q8s, JTs, J9s, J8s, T9s, T8s, 98s, AKo, AQo, AJo, ATo, A9o, A8o, KQo, KJo, KTo, QJo"},
  "HJ_17":  { name:"Hijack","Raise":"AA, KK, QQ, JJ, TT, 99, 88, 77, 66, AKs, AQs, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, KQs, KJs, KTs, K9s, K8s, K7s, QJs, QTs, Q9s, Q8s, J9s, T9s, AKo, AQo, AJo, ATo, A9o, A8o, KQo, KJo, KTo, QJo","All-in":"55, 44, JTs"},
  "HJ_16":  { name:"Hijack","Raise":"AA, KK, QQ, JJ, TT, 99, 88, 77, AKs, AQs, AJs, ATs, A9s, A8s, A7s, A6s, A4s, A3s, A2s, KQs, KJs, KTs, K9s, K8s, K7s, QJs, Q9s, Q8s, J9s, T9s, AKo, AQo, AJo, A9o, A8o, KQo, KJo, KTo, QJo","All-in":"66, 55, 44, A5s, QTs, JTs, ATo"},
  "HJ_15":  { name:"Hijack","Raise":"AA, KK, QQ, JJ, TT, 99, 88, AKs, AQs, AJs, ATs, A9s, A8s, A7s, A6s, A3s, A2s, KQs, KJs, K9s, K8s, K7s, Q9s, Q8s, J9s, T9s, AKo, AQo, A8o, KJo, KTo, QJo","All-in":"77, 66, 55, 44, 33, A5s, A4s, KTs, QJs, QTs, JTs, AJo, ATo, A9o, KQo"},
  "HJ_14":  { name:"Hijack","Raise":"AA, KK, QQ, JJ, TT, 99, AKs, AQs, AJs, ATs, A9s, KQs, K9s, K8s, Q9s, AKo, A8o, KJo, KTo, QJo","All-in":"88, 77, 66, 55, 44, 33, A8s, A7s, A6s, A5s, A4s, A3s, A2s, KJs, KTs, QJs, QTs, JTs, J9s, T9s, AQo, AJo, ATo, A9o, KQo"},
  "HJ_13":  { name:"Hijack","Raise":"AA, KK, QQ, JJ, TT, AKs, AQs, AJs, KQs, K8s, KTo, QJo","All-in":"99, 88, 77, 66, 55, 44, 33, 22, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, KJs, KTs, K9s, QJs, QTs, Q9s, JTs, J9s, T9s, AKo, AQo, AJo, ATo, A9o, A8o, KQo, KJo"},
  "HJ_12":  { name:"Hijack","Raise":"AA, KK, QQ, JJ, AKs, AQs, K8s, KTo","All-in":"TT, 99, 88, 77, 66, 55, 44, 33, 22, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, KQs, KJs, KTs, K9s, QJs, QTs, Q9s, JTs, J9s, T9s, AKo, AQo, AJo, ATo, A9o, A8o, A7o, KQo, KJo, QJo"},
  "HJ_11":  { name:"Hijack","Raise":"AA, KK, QQ, AKs, K8s, QTo","All-in":"JJ, TT, 99, 88, 77, 66, 55, 44, 33, 22, AQs, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, KQs, KJs, KTs, K9s, QJs, QTs, Q9s, JTs, J9s, T9s, T8s, 98s, AKo, AQo, AJo, ATo, A9o, A8o, A7o, A6o, A5o, KQo, KJo, KTo, QJo"},
  "HJ_10":  { name:"Hijack","Raise":"AA, KK, QTo","All-in":"QQ, JJ, TT, 99, 88, 77, 66, 55, 44, 33, 22, AKs, AQs, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, KQs, KJs, KTs, K9s, QJs, QTs, Q9s, JTs, J9s, T9s, T8s, 98s, AKo, AQo, AJo, ATo, A9o, A8o, A7o, A6o, A5o, A4o, KQo, KJo, KTo, QJo, JTo"},
  "CO_100": { name:"Cut-Off","Raise":"AA, KK, QQ, JJ, TT, 99, 88, 77, 66, 55, 44, 33, 22, AKs, AQs, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, KQs, KJs, KTs, K9s, K8s, K7s, K6s, K5s, K4s, K3s, K2s, QJs, QTs, Q9s, Q8s, Q7s, Q6s, Q5s, Q4s, JTs, J9s, J8s, J7s, J6s, T9s, T8s, T7s, T6s, 98s, 97s, 96s, 87s, 86s, 76s, 75s, 65s, 54s, AKo, AQo, AJo, ATo, A9o, A8o, A7o, KQo, KJo, KTo, K9o, QJo, QTo, JTo, T9o","Tightifie":"K2s, Q4s, J6s, T6s, 75s, A7o, K9o, T9o","Loosifie":"Q3s, J5s, 85s, 64s, A5o, Q9o, J9o, 98o"},
  "CO_50":  { name:"Cut-Off","Raise":"AA, KK, QQ, JJ, TT, 99, 88, 77, 66, 55, 44, 33, 22, AKs, AQs, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, KQs, KJs, KTs, K9s, K8s, K7s, K6s, K5s, K4s, K3s, K2s, QJs, QTs, Q9s, Q8s, Q7s, Q6s, Q5s, Q4s, JTs, J9s, J8s, J7s, J6s, T9s, T8s, T7s, T6s, 98s, 97s, 96s, 87s, 86s, 76s, 75s, 65s, 54s, AKo, AQo, AJo, ATo, A9o, A8o, A7o, KQo, KJo, KTo, K9o, QJo, QTo, JTo, T9o","Tightifie":"22, K2s, Q4s, J6s, T6s, 96s, 75s, 54s, T9o","Loosifie":"J5s, 85s, A6o, A5o, K8o, Q9o, J9o, 98o"},
  "CO_25":  { name:"Cut-Off","Raise":"AA, KK, QQ, JJ, TT, 99, 88, 77, 66, 55, 44, AKs, AQs, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, KQs, KJs, KTs, K9s, K8s, K7s, K6s, K5s, K4s, K3s, QJs, QTs, Q9s, Q8s, Q7s, Q6s, Q5s, JTs, J9s, J8s, J7s, T9s, T8s, T7s, 98s, 97s, 87s, 86s, 76s, 65s, AKo, AQo, AJo, ATo, A9o, A8o, A7o, A5o, KQo, KJo, KTo, K9o, QJo, QTo, JTo","Tightifie":"44, K3s, Q5s, 86s, 76s, 65s, A5o, K9o","Loosifie":"33, K2s, Q4s, J6s, T6s, 96s, 75s, 54s, A6o, K8o, Q9o, J9o, T9o"},
  "CO_20":  { name:"Cut-Off","Raise":"AA, KK, QQ, JJ, TT, 99, 88, 77, 66, 55, 44, AKs, AQs, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, KQs, KJs, KTs, K9s, K8s, K7s, K6s, K5s, K4s, QJs, QTs, Q9s, Q8s, Q7s, Q6s, JTs, J9s, J8s, J7s, T9s, T8s, T7s, 98s, 97s, 87s, AKo, AQo, AJo, ATo, A9o, A8o, A7o, KQo, KJo, KTo, K9o, QJo, QTo, JTo","Tightifie":"44, K4s, Q6s, J7s, T7s, 97s, A7o, K9o","Loosifie":"Q5s, 86s, 76s, A6o, A5o, Q9o, J9o, T9o"},
  "CO_19":  { name:"Cut-Off","Raise":"AA, KK, QQ, JJ, TT, 99, 88, 77, 66, 55, AKs, AQs, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, KQs, KJs, KTs, K9s, K8s, K7s, K6s, K5s, QJs, QTs, Q9s, Q8s, Q7s, Q6s, JTs, J9s, J8s, J7s, T9s, T8s, 98s, 87s, AKo, AQo, AJo, ATo, A9o, A8o, A7o, A5o, KQo, KJo, KTo, K9o, QJo, QTo, JTo","All-in":"44"},
  "CO_18":  { name:"Cut-Off","Raise":"AA, KK, QQ, JJ, TT, 99, 88, 77, 66, AKs, AQs, AJs, ATs, A9s, A8s, A7s, A6s, A3s, A2s, KQs, KJs, KTs, K9s, K8s, K7s, K6s, K5s, QJs, QTs, Q9s, Q8s, Q7s, JTs, J9s, J8s, T9s, T8s, 98s, AKo, AQo, AJo, ATo, A9o, A8o, A7o, A5o, KQo, KJo, KTo, QJo, QTo, JTo","All-in":"55, 44, 33, A5s, A4s"},
  "CO_17":  { name:"Cut-Off","Raise":"AA, KK, QQ, JJ, TT, 99, 88, 77, 66, AKs, AQs, AJs, ATs, A9s, A8s, A7s, KQs, KJs, K9s, K8s, K7s, K6s, QJs, Q9s, Q8s, Q7s, J9s, J8s, T9s, T8s, 98s, AKo, AQo, AJo, ATo, A7o, A6o, A5o, KQo, KJo, KTo, QJo, QTo, JTo","All-in":"55, 44, 33, 22, A6s, A5s, A4s, A3s, A2s, KTs, QTs, JTs, A9o, A8o"},
  "CO_16":  { name:"Cut-Off","Raise":"AA, KK, QQ, JJ, TT, 99, 88, 77, AKs, AQs, AJs, ATs, A9s, A8s, KQs, KJs, K9s, K8s, K7s, Q9s, Q8s, J9s, J8s, T8s, 98s, AKo, AQo, AJo, A7o, A6o, A5o, KJo, KTo, QJo, QTo, JTo","All-in":"66, 55, 44, 33, 22, A7s, A6s, A5s, A4s, A3s, A2s, KTs, QJs, QTs, JTs, T9s, ATo, A9o, A8o, KQo"},
  "CO_15":  { name:"Cut-Off","Raise":"AA, KK, QQ, JJ, TT, 99, 88, AKs, AQs, AJs, ATs, A9s, A8s, KQs, KJs, K8s, K7s, Q9s, Q8s, J8s, T8s, 98s, AKo, AQo, A6o, A5o, KJo, KTo, QJo, QTo, JTo","All-in":"77, 66, 55, 44, 33, 22, A7s, A6s, A5s, A4s, A3s, A2s, KTs, K9s, QJs, QTs, JTs, J9s, T9s, AJo, ATo, A9o, A8o, A7o, KQo"},
  "CO_14":  { name:"Cut-Off","Raise":"AA, KK, QQ, JJ, TT, 99, AKs, AQs, AJs, ATs, KQs, KJs, K8s, K7s, Q8s, J8s, T8s, 98s, AKo, QTo, JTo","All-in":"88, 77, 66, 55, 44, 33, 22, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, KTs, K9s, QJs, QTs, Q9s, JTs, J9s, T9s, AQo, AJo, ATo, A9o, A8o, A7o, A6o, A5o, KQo, KJo, KTo, QJo"},
  "CO_13":  { name:"Cut-Off","Raise":"AA, KK, QQ, JJ, TT, AKs, AQs, AJs, KQs, K8s, K7s, Q8s, J8s, A3o","All-in":"99, 88, 77, 66, 55, 44, 33, 22, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, KJs, KTs, K9s, QJs, QTs, Q9s, JTs, J9s, T9s, 98s, AKo, AQo, AJo, ATo, A9o, A8o, A7o, A6o, A5o, A4o, KQo, KJo, KTo, QJo, QTo, JTo"},
  "CO_12":  { name:"Cut-Off","Raise":"AA, KK, QQ, JJ, AKs, AQs, K8s, K7s, Q8s, J8s","All-in":"TT, 99, 88, 77, 66, 55, 44, 33, 22, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, KQs, KJs, KTs, K9s, QJs, QTs, Q9s, JTs, J9s, T9s, T8s, 98s, AKo, AQo, AJo, ATo, A9o, A8o, A7o, A6o, A5o, A4o, A3o, A2o, KQo, KJo, KTo, QJo, QTo, JTo"},
  "CO_11":  { name:"Cut-Off","Raise":"AA, KK, QQ, AKs, K6s, Q8s","All-in":"JJ, TT, 99, 88, 77, 66, 55, 44, 33, 22, AQs, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, KQs, KJs, KTs, K9s, K8s, K7s, QJs, QTs, Q9s, JTs, J9s, J8s, T9s, T8s, 98s, AKo, AQo, AJo, ATo, A9o, A8o, A7o, A6o, A5o, A4o, A3o, A2o, KQo, KJo, KTo, QJo, QTo, JTo"},
  "CO_10":  { name:"Cut-Off","Raise":"AA, K5s","All-in":"KK, QQ, JJ, TT, 99, 88, 77, 66, 55, 44, 33, 22, AKs, AQs, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, KQs, KJs, KTs, K9s, K8s, K7s, K6s, QJs, QTs, Q9s, Q8s, JTs, J9s, J8s, T9s, T8s, 98s, 97s, AKo, AQo, AJo, ATo, A9o, A8o, A7o, A6o, A5o, A4o, A3o, A2o, KQo, KJo, KTo, QJo, QTo, JTo"},
  "BTN_100":{ name:"Bouton","Raise":"AA, KK, QQ, JJ, TT, 99, 88, 77, 66, 55, 44, 33, 22, AKs, AQs, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, KQs, KJs, KTs, K9s, K8s, K7s, K6s, K5s, K4s, K3s, K2s, QJs, QTs, Q9s, Q8s, Q7s, Q6s, Q5s, Q4s, Q3s, Q2s, JTs, J9s, J8s, J7s, J6s, J5s, J4s, J3s, J2s, T9s, T8s, T7s, T6s, T5s, T4s, T3s, 98s, 97s, 96s, 95s, 87s, 86s, 85s, 76s, 75s, 74s, 65s, 64s, 54s, 53s, 43s, AKo, AQo, AJo, ATo, A9o, A8o, A7o, A6o, A5o, A4o, A3o, A2o, KQo, KJo, KTo, K9o, K8o, K7o, K6o, QJo, QTo, Q9o, Q8o, JTo, J9o, J8o, T9o, T8o, 98o, 87o","Tightifie":"J2s, T3s, 43s, A2o, K6o, 87o","Loosifie":"T2s, 84s, 63s, K5o, Q7o, J7o, T7o, 97o, 76o"},
  "BTN_50": { name:"Bouton","Raise":"AA, KK, QQ, JJ, TT, 99, 88, 77, 66, 55, 44, 33, 22, AKs, AQs, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, KQs, KJs, KTs, K9s, K8s, K7s, K6s, K5s, K4s, K3s, K2s, QJs, QTs, Q9s, Q8s, Q7s, Q6s, Q5s, Q4s, Q3s, Q2s, JTs, J9s, J8s, J7s, J6s, J5s, J4s, J3s, J2s, T9s, T8s, T7s, T6s, T5s, T4s, 98s, 97s, 96s, 95s, 87s, 86s, 85s, 76s, 75s, 74s, 65s, 64s, 54s, 53s, AKo, AQo, AJo, ATo, A9o, A8o, A7o, A6o, A5o, A4o, A3o, A2o, KQo, KJo, KTo, K9o, K8o, K7o, K6o, QJo, QTo, Q9o, Q8o, JTo, J9o, J8o, T9o, T8o, 98o, 87o","Tightifie":"J2s, T4s, 74s, 53s, A2o, K6o, 87o","Loosifie":"T3s, K5o, Q7o, J7o, T7o, 97o, 76o"},
  "BTN_25": { name:"Bouton","Raise":"AA, KK, QQ, JJ, TT, 99, 88, 77, 66, 55, 44, 33, AKs, AQs, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, KQs, KJs, KTs, K9s, K8s, K7s, K6s, K5s, K4s, K3s, K2s, QJs, QTs, Q9s, Q8s, Q7s, Q6s, Q5s, Q4s, Q3s, JTs, J9s, J8s, J7s, J6s, J5s, T9s, T8s, T7s, T6s, T5s, 98s, 97s, 96s, 87s, 86s, 85s, 76s, 75s, 65s, 54s, AKo, AQo, AJo, ATo, A9o, A8o, A7o, A6o, A5o, A4o, A3o, KQo, KJo, KTo, K9o, K8o, K7o, QJo, QTo, Q9o, Q8o, JTo, J9o, T9o","Tightifie":"33, Q3s, T5s, 85s, 54s, A3o, K7o","Loosifie":"Q2s, J4s, 95s, A2o, K6o, J8o, T8o, 98o"},
  "BTN_20": { name:"Bouton","Raise":"AA, KK, QQ, JJ, TT, 99, 88, 77, 66, AKs, AQs, AJs, ATs, A9s, A8s, A7s, A6s, KQs, KJs, KTs, K9s, K8s, K7s, K6s, K5s, K4s, K3s, QJs, QTs, Q9s, Q8s, Q7s, Q6s, Q5s, JTs, J9s, J8s, J7s, J6s, T9s, T8s, T7s, T6s, 98s, 97s, 96s, 87s, 86s, 76s, AKo, AQo, AJo, ATo, A9o, A8o, A7o, A6o, A5o, A4o, A3o, KQo, KJo, KTo, K9o, K8o, QJo, QTo, Q9o, JTo, J9o, T9o","All-in":"55, 44, 33, 22, A5s, A4s, A3s, A2s","Tightifie":"K3s, Q5s, J6s, T6s, 96s, 86s, 76s, A3o, K8o","Loosifie":"K2s, Q4s, J5s, 75s, 65s, A2o, K7o, Q8o, J8o, T8o, 98o"},
  "BTN_19": { name:"Bouton","Raise":"AA, KK, QQ, JJ, TT, 99, 88, 77, 66, AKs, AQs, AJs, ATs, A9s, A8s, A7s, A6s, KQs, KJs, KTs, K9s, K8s, K7s, K6s, K5s, K4s, K3s, QJs, QTs, Q9s, Q8s, Q7s, Q6s, Q5s, JTs, J9s, J8s, J7s, J6s, T9s, T8s, T7s, 98s, 97s, 87s, 86s, 76s, AKo, AQo, AJo, ATo, A6o, A5o, A4o, A3o, A2o, KQo, KJo, KTo, K9o, K8o, QJo, QTo, Q9o, JTo, J9o, T9o","All-in":"55, 44, 33, 22, A5s, A4s, A3s, A2s, A9o, A8o, A7o"},
  "BTN_18": { name:"Bouton","Raise":"AA, KK, QQ, JJ, TT, 99, 88, 77, 66, AKs, AQs, AJs, ATs, A9s, A8s, A7s, A6s, KQs, KJs, KTs, K9s, K8s, K7s, K6s, K5s, K4s, K3s, QJs, QTs, Q9s, Q8s, Q7s, Q6s, Q5s, JTs, J9s, J8s, J7s, J6s, T8s, T7s, 98s, 97s, 87s, 86s, 76s, AKo, AQo, AJo, ATo, A4o, A3o, A2o, KQo, KJo, KTo, K9o, K8o, QJo, QTo, Q9o, JTo, J9o, T9o","All-in":"55, 44, 33, 22, A5s, A4s, A3s, A2s, T9s, A9o, A8o, A7o, A6o, A5o"},
  "BTN_17": { name:"Bouton","Raise":"AA, KK, QQ, JJ, TT, 99, 88, 77, AKs, AQs, AJs, ATs, A9s, A8s, A7s, KQs, KJs, KTs, K8s, K7s, K6s, K5s, K4s, QJs, Q8s, Q7s, Q6s, Q5s, J8s, J7s, T8s, T7s, 98s, 97s, 87s, AKo, AQo, AJo, A3o, A2o, KTo, K9o, QJo, QTo, Q9o, JTo, J9o, T9o","All-in":"66, 55, 44, 33, 22, A6s, A5s, A4s, A3s, A2s, K9s, QTs, Q9s, JTs, J9s, T9s, ATo, A9o, A8o, A7o, A6o, A5o, A4o, KQo, KJo"},
  "BTN_16": { name:"Bouton","Raise":"AA, KK, QQ, JJ, TT, 99, 88, 77, AKs, AQs, AJs, ATs, A9s, A8s, KQs, KJs, KTs, K8s, K7s, K6s, K5s, K4s, QJs, Q8s, Q7s, Q6s, Q5s, J8s, J7s, T8s, T7s, 97s, 87s, AKo, AQo, A2o, K9o, QTo, Q9o, JTo, J9o, T9o","All-in":"66, 55, 44, 33, 22, A7s, A6s, A5s, A4s, A3s, A2s, K9s, QTs, Q9s, JTs, J9s, T9s, 98s, AJo, ATo, A9o, A8o, A7o, A6o, A5o, A4o, A3o, KQo, KJo, KTo, QJo"},
  "BTN_15": { name:"Bouton","Raise":"AA, KK, QQ, JJ, TT, 99, 88, 77, AKs, AQs, AJs, ATs, KQs, KJs, KTs, K8s, K7s, K6s, K5s, K4s, QJs, Q8s, Q7s, Q6s, Q5s, J8s, J7s, T7s, 87s, AKo, AQo, K9o, Q9o, J9o","All-in":"66, 55, 44, 33, 22, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, K9s, QTs, Q9s, JTs, J9s, T9s, T8s, 98s, AJo, ATo, A9o, A8o, A7o, A6o, A5o, A4o, A3o, A2o, KQo, KJo, KTo, QJo, QTo, JTo"},
  "BTN_14": { name:"Bouton","Raise":"AA, KK, QQ, JJ, TT, 99, 88, AKs, AQs, AJs, ATs, KQs, KJs, K6s, K5s, K4s, Q7s, Q6s, Q5s, J7s, T7s, AKo, K9o, Q9o","All-in":"77, 66, 55, 44, 33, 22, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, KTs, K9s, K8s, K7s, QJs, QTs, Q9s, Q8s, JTs, J9s, J8s, T9s, T8s, 98s, AQo, AJo, ATo, A9o, A8o, A7o, A6o, A5o, A4o, A3o, A2o, KQo, KJo, KTo, QJo, QTo, JTo"},
  "BTN_13": { name:"Bouton","Raise":"AA, KK, QQ, JJ, TT, 99, AKs, AQs, AJs, KQs, K5s, K4s, Q7s, Q6s, J7s, K9o","All-in":"88, 77, 66, 55, 44, 33, 22, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, KJs, KTs, K9s, K8s, K7s, K6s, QJs, QTs, Q9s, Q8s, JTs, J9s, J8s, T9s, T8s, 98s, AKo, AQo, AJo, ATo, A9o, A8o, A7o, A6o, A5o, A4o, A3o, A2o, KQo, KJo, KTo, QJo, QTo, JTo"},
  "BTN_12": { name:"Bouton","Raise":"AA, KK, QQ, JJ, TT, AKs, AQs, K3s, Q7s, J7s","All-in":"99, 88, 77, 66, 55, 44, 33, 22, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, KQs, KJs, KTs, K9s, K8s, K7s, K6s, K5s, K4s, QJs, QTs, Q9s, Q8s, JTs, J9s, J8s, T9s, T8s, 98s, 97s, 87s, AKo, AQo, AJo, ATo, A9o, A8o, A7o, A6o, A5o, A4o, A3o, A2o, KQo, KJo, KTo, K9o, QJo, QTo, JTo"},
  "BTN_11": { name:"Bouton","Raise":"AA, KK, QQ, JJ, AKs, K3s, Q7s, J7s","All-in":"TT, 99, 88, 77, 66, 55, 44, 33, 22, AQs, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, KQs, KJs, KTs, K9s, K8s, K7s, K6s, K5s, K4s, QJs, QTs, Q9s, Q8s, JTs, J9s, J8s, T9s, T8s, T7s, 98s, 97s, 87s, 76s, AKo, AQo, AJo, ATo, A9o, A8o, A7o, A6o, A5o, A4o, A3o, A2o, KQo, KJo, KTo, K9o, QJo, QTo, JTo"},
  "BTN_10": { name:"Bouton","Raise":"AA, KK, QQ, Q5s, K8o","All-in":"JJ, TT, 99, 88, 77, 66, 55, 44, 33, 22, AKs, AQs, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, KQs, KJs, KTs, K9s, K8s, K7s, K6s, K5s, K4s, K3s, K2s, QJs, QTs, Q9s, Q8s, Q7s, Q6s, JTs, J9s, J8s, J7s, T9s, T8s, T7s, 98s, 97s, 87s, 76s, AKo, AQo, AJo, ATo, A9o, A8o, A7o, A6o, A5o, A4o, A3o, A2o, KQo, KJo, KTo, K9o, QJo, QTo, Q9o, JTo, J9o, T9o"},
  "SB_100": { name:"Small Blind","Raise":"AA, KK, QQ, JJ, TT, 99, AKs, AQs, AJs, ATs, A9s, A8s, KQs, KJs, KTs, K9s, QJs, QTs, JTs, T9s, 98s, 87s, 75s, 74s, 64s, 63s, 53s, 52s, AKo, AQo, AJo, ATo, KQo, KJo, T9o, 98o, 87o","Limp":"AA, KK, 88, 77, 66, 55, 44, 33, 22, A7s, A6s, A5s, A4s, A3s, A2s, K8s, K7s, K6s, K5s, K4s, K3s, K2s, Q9s, Q8s, Q7s, Q6s, Q5s, Q4s, Q3s, Q2s, J9s, J8s, J7s, J6s, J5s, J4s, J3s, J2s, T8s, T7s, T6s, T5s, T4s, T3s, T2s, 97s, 96s, 95s, 94s, 93s, 92s, 86s, 85s, 84s, 83s, 82s, 76s, 73s, 72s, 65s, 62s, 54s, 43s, 42s, 32s, A9o, A8o, A7o, A6o, A5o, A4o, A3o, A2o, KTo, K9o, K8o, K7o, K6o, K5o, K4o, K3o, K2o, QJo, QTo, Q9o, Q8o, Q7o, Q6o, Q5o, Q4o, Q3o, Q2o, JTo, J9o, J8o, J7o, J6o, J5o, J4o, T8o, T7o, T6o, 97o, 96o, 86o, 85o, 76o, 75o, 65o, 54o"},
  "SB_50":  { name:"Small Blind","Raise":"AA, KK, QQ, JJ, TT, 99, 88, AKs, AQs, AJs, ATs, A9s, A8s, A7s, A6s, A5s, A4s, KQs, KJs, KTs, K9s, K8s, K7s, QJs, QTs, Q9s, JTs, J9s, J3s, J2s, T9s, T8s, T3s, T2s, 98s, 65s, 54s, AKo, AQo, AJo, ATo, A9o, KQo, KJo, KTo, K6o, K5o, QJo, Q6o, Q5o","Limp":"AA, KK, QQ, JJ, 77, 66, 55, 44, 33, 22, A3s, A2s, K6s, K5s, K4s, K3s, K2s, Q8s, Q7s, Q6s, Q5s, Q4s, Q3s, Q2s, J8s, J7s, J6s, J5s, J4s, T7s, T6s, T5s, T4s, 97s, 96s, 95s, 94s, 93s, 92s, 87s, 86s, 85s, 84s, 83s, 82s, 76s, 75s, 74s, 73s, 64s, 63s, 53s, 52s, 43s, 42s, 32s, AKo, AQo, A8o, A7o, A6o, A5o, A4o, A3o, A2o, K9o, K8o, K7o, K4o, K3o, K2o, QTo, Q9o, Q8o, Q7o, Q4o, Q3o, JTo, J9o, J8o, J7o, J6o, J5o, T9o, T8o, T7o, T6o, 98o, 97o, 96o, 87o, 86o, 76o, 65o, 54o"},
  "SB_25":  { name:"Small Blind","Raise":"AA, KK, QQ, JJ, TT, 99, 88, 77, AKs, AQs, AJs, ATs, A9s, A8s, A7s, KQs, KJs, KTs, QJs, QTs, JTs, J5s, J4s, J3s, J2s, T5s, T4s, T3s, T2s, 95s, 94s, 93s, 92s, 87s, 72s, 62s, 42s, 32s, 54s, AKo, AQo, KQo, KJo, A7o, A6o, A5o, K9o, K8o, Q9o, Q8o, Q3o, Q2o, J8o, J6o, J5o, T8o, T6o, 96o, 75o, 65o","Limp":"77, 66, 55, 44, 33, 22, A6s, A5s, A4s, A3s, A2s, A8s, A7s, K9s, K8s, K7s, K6s, K5s, K4s, K3s, K2s, KTs, Q9s, Q8s, Q7s, Q6s, Q5s, Q4s, Q3s, Q2s, QJs, QTs, J9s, J8s, J7s, J6s, JTs, T9s, T8s, T7s, T6s, 98s, 97s, 96s, 86s, 85s, 84s, 83s, 82s, 76s, 75s, 74s, 73s, 72s, 65s, 64s, 63s, 62s, 53s, 52s, 43s, 42s, 32s, AKo, KQo, KJo, AQo, AJo, ATo, A9o, A8o, A4o, A3o, A2o, KTo, K7o, K6o, K5o, K4o, K3o, K2o, QJo, QTo, Q7o, Q6o, Q5o, Q4o, Q3o, Q2o, JTo, J9o, J7o, J6o, J5o, T9o, T7o, T6o, 98o, 97o, 96o, 87o, 86o, 76o, 75o, 65o"},
  "SB_20":  { name:"Small Blind","Raise":"AA, KK, QQ, JJ, TT, 99, 88, AKs, AQs, AJs, ATs, KQs, KJs, J4s, J3s, J2s, T4s, T3s, T2s, 94s, 93s, 92s, KQo, KJo, K8o, K7o, Q8o, Q7o, J8o, T8o","All-in":"77, 66, 55, 44, 33, 22, A9s, A8s, KTs, QJs, A9o, A8o, A7o, A6o, A5o, A4o, A3o, A2o, AKo, AQo, AJo, ATo, Q3o, Q2o, J5o, J4o, T6o, 96o, 86o, 65o","Limp":"77, 66, A9s, A8s, KTs, QJs, A7s, A6s, A5s, A4s, A3s, A2s, K9s, K8s, K7s, K6s, K5s, K4s, K3s, K2s, QTs, Q9s, Q8s, Q7s, Q6s, Q5s, Q4s, Q3s, Q2s, JTs, J9s, J8s, J7s, J6s, J5s, T9s, T8s, T7s, T6s, T5s, 98s, 97s, 96s, 95s, 87s, 86s, 85s, 84s, 83s, 82s, 76s, 75s, 74s, 73s, 72s, 65s, 64s, 63s, 62s, 54s, 53s, 52s, 43s, 42s, 32s, AKo, AQo, AJo, ATo, KTo, K9o, K6o, K5o, K4o, K3o, K2o, QJo, QTo, Q9o, Q6o, Q5o, Q4o, Q3o, Q2o, JTo, J9o, J7o, J6o, J5o, J4o, T9o, T7o, T6o, 98o, 97o, 96o, 87o, 86o, 76o, 65o"},
  "SB_19":  { name:"Small Blind","Raise":"AA, KK, QQ, JJ, TT, 99, 88, AKs, AQs, AJs, ATs, KQs, KJs, J4s, J3s, J2s, T4s, T3s, T2s, 94s, 93s, 92s, KQo, KJo, K8o, K7o, Q8o, Q7o, J8o, T8o","All-in":"77, 66, 55, 44, 33, 22, A9s, A8s, KTs, QJs, A9o, A8o, A7o, A6o, A5o, A4o, A3o, A2o, AKo, AQo, AJo, ATo, Q3o, Q2o, J5o, J4o, T6o, 96o, 86o, 65o","Limp":"77, 66, A9s, A8s, KTs, QJs, A7s, A6s, A5s, A4s, A3s, A2s, K9s, K8s, K7s, K6s, K5s, K4s, K3s, K2s, QTs, Q9s, Q8s, Q7s, Q6s, Q5s, Q4s, Q3s, Q2s, JTs, J9s, J8s, J7s, J6s, J5s, T9s, T8s, T7s, T6s, T5s, 98s, 97s, 96s, 95s, 87s, 86s, 85s, 84s, 83s, 82s, 76s, 75s, 74s, 73s, 72s, 65s, 64s, 63s, 62s, 54s, 53s, 52s, 43s, 42s, 32s, AKo, AQo, AJo, ATo, KTo, K9o, K6o, K5o, K4o, K3o, K2o, QJo, QTo, Q9o, Q6o, Q5o, Q4o, Q3o, Q2o, JTo, J9o, J7o, J6o, J5o, J4o, T9o, T7o, T6o, 98o, 97o, 96o, 87o, 86o, 76o, 65o"},
  "SB_18":  { name:"Small Blind","Raise":"AA, KK, QQ, JJ, TT, 99, 88, AKs, AQs, AJs, ATs, KQs, KJs, J4s, J3s, J2s, T4s, T3s, T2s, 94s, 93s, 92s, KQo, KJo, K8o, K7o, Q8o, Q7o, J8o, T8o","All-in":"77, 66, 55, 44, 33, 22, A9s, A8s, KTs, QJs, A9o, A8o, A7o, A6o, A5o, A4o, A3o, A2o, AKo, AQo, AJo, ATo, Q3o, Q2o, J5o, J4o, T6o, 96o, 86o, 65o","Limp":"77, 66, A9s, A8s, KTs, QJs, A7s, A6s, A5s, A4s, A3s, A2s, K9s, K8s, K7s, K6s, K5s, K4s, K3s, K2s, QTs, Q9s, Q8s, Q7s, Q6s, Q5s, Q4s, Q3s, Q2s, JTs, J9s, J8s, J7s, J6s, J5s, T9s, T8s, T7s, T6s, T5s, 98s, 97s, 96s, 95s, 87s, 86s, 85s, 84s, 83s, 82s, 76s, 75s, 74s, 73s, 72s, 65s, 64s, 63s, 62s, 54s, 53s, 52s, 43s, 42s, 32s, AKo, AQo, AJo, ATo, KTo, K9o, K6o, K5o, K4o, K3o, K2o, QJo, QTo, Q9o, Q6o, Q5o, Q4o, Q3o, Q2o, JTo, J9o, J7o, J6o, J5o, J4o, T9o, T7o, T6o, 98o, 97o, 96o, 87o, 86o, 76o, 65o"},
  "SB_17":  { name:"Small Blind","Raise":"AA, KK, QQ, JJ, TT, AKs, AQs, AJs, KQs, J2s, T2s, 92s, 82s, K4o, K3o, K2o, Q5o, Q4o, J6o","All-in":"99, 88, 77, 66, 55, 44, 33, 22, ATs, KJs, Q6s, Q5s, 98s, 97s, 87s, 86s, 76s, AJo, ATo, A9o, A8o, A7o, A6o, A5o, A4o, A3o, A2o, AKo, AQo, K7o, K6o, Q6o, KQo, KJo, Q3o, Q2o, J5o, J4o, T6o, 96o, 86o, 65o","Limp":"99, 88, ATs, KJs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, KTs, K9s, K8s, K7s, K6s, K5s, K4s, K3s, K2s, QJs, QTs, Q9s, Q8s, Q7s, Q4s, Q3s, Q2s, JTs, J9s, J8s, J7s, J6s, J5s, J4s, J3s, T9s, T8s, T7s, T6s, T5s, T4s, T3s, 96s, 95s, 94s, 93s, 85s, 84s, 83s, 75s, 74s, 73s, 72s, 65s, 64s, 63s, 62s, 54s, 53s, 52s, 43s, 42s, 32s, AKo, AQo, KTo, K9o, K8o, K5o, KQo, KJo, QJo, QTo, Q9o, Q8o, Q7o, Q3o, Q2o, JTo, J9o, J8o, J7o, J5o, J4o, T9o, T8o, T7o, T6o, 98o, 97o, 96o, 87o, 86o, 76o, 65o"},
  "SB_16":  { name:"Small Blind","Raise":"AA, KK, QQ, JJ, TT, AKs, AQs, AJs, KQs, J2s, T2s, 92s, 82s, K4o, K3o, K2o, Q5o, Q4o, J6o","All-in":"99, 88, 77, 66, 55, 44, 33, 22, ATs, KJs, Q6s, Q5s, 98s, 97s, 87s, 86s, 76s, AJo, ATo, A9o, A8o, A7o, A6o, A5o, A4o, A3o, A2o, AKo, AQo, K7o, K6o, Q6o, KQo, KJo, Q3o, Q2o, J5o, J4o, T6o, 96o, 86o, 65o","Limp":"99, 88, ATs, KJs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, KTs, K9s, K8s, K7s, K6s, K5s, K4s, K3s, K2s, QJs, QTs, Q9s, Q8s, Q7s, Q4s, Q3s, Q2s, JTs, J9s, J8s, J7s, J6s, J5s, J4s, J3s, T9s, T8s, T7s, T6s, T5s, T4s, T3s, 96s, 95s, 94s, 93s, 85s, 84s, 83s, 75s, 74s, 73s, 72s, 65s, 64s, 63s, 62s, 54s, 53s, 52s, 43s, 42s, 32s, AKo, AQo, KTo, K9o, K8o, K5o, KQo, KJo, QJo, QTo, Q9o, Q8o, Q7o, Q3o, Q2o, JTo, J9o, J8o, J7o, J5o, J4o, T9o, T8o, T7o, T6o, 98o, 97o, 96o, 87o, 86o, 76o, 65o"},
  "SB_15":  { name:"Small Blind","Raise":"AA, KK, QQ, JJ, TT, 99, 88, 77, AKs, AQs, AJs, KQs, T2s, 92s, K2o, Q3o, J6o","All-in":"66, 55, 44, 33, 22, ATs, KJs, K3s, A3s, A2s, K6s, K5s, K4s, Q6s, Q5s, Q4s, J6s, J5s, J4s, T7s, T6s, 98s, 97s, 96s, 87s, 86s, 76s, 65s, 83s, 82s, 72s, 62s, 42s, 32s, AKo, AQo, AJo, ATo, A9o, A8o, A7o, A6o, A5o, A4o, A3o, A2o, KTo, K9o, K8o, K7o, K6o, K5o, Q6o, KQo, KJo, Q2o, J5o, J4o, T6o, 96o, 86o, 76o, 65o","Limp":"ATs, KJs, K3s, A9s, A8s, A7s, A6s, A5s, A4s, KTs, K9s, K8s, K7s, K2s, QJs, QTs, Q9s, Q8s, Q7s, Q3s, Q2s, JTs, J9s, J8s, J7s, J3s, J2s, T9s, T8s, T5s, T4s, T3s, 95s, 94s, 93s, 85s, 84s, 83s, 82s, 75s, 74s, 73s, 72s, 64s, 63s, 62s, 54s, 53s, 52s, 43s, 42s, 32s, AKo, K4o, K3o, QJo, QTo, Q9o, Q8o, Q7o, Q5o, Q4o, Q2o, KQo, KJo, JTo, J9o, J8o, J7o, J5o, J4o, T9o, T8o, T7o, T6o, 98o, 97o, 96o, 87o, 86o, 76o, 65o"},
  "SB_14":  { name:"Small Blind","Raise":"AA, KK, QQ, JJ, TT, 99, 88, 77, AKs, AQs, AJs, KQs, T2s, 92s, K2o, Q3o, J6o","All-in":"66, 55, 44, 33, 22, ATs, KJs, K3s, A3s, A2s, K6s, K5s, K4s, Q6s, Q5s, Q4s, J6s, J5s, J4s, T7s, T6s, 98s, 97s, 96s, 87s, 86s, 76s, 65s, 83s, 82s, 72s, 62s, 52s, 42s, 32s, AKo, AQo, AJo, ATo, A9o, A8o, A7o, A6o, A5o, A4o, A3o, A2o, KTo, K9o, K8o, K7o, K6o, K5o, Q6o, KQo, KJo, Q2o, J5o, J4o, T6o, 96o, 86o, 76o, 65o","Limp":"ATs, KJs, K3s, A9s, A8s, A7s, A6s, A5s, A4s, KTs, K9s, K8s, K7s, K2s, QJs, QTs, Q9s, Q8s, Q7s, Q3s, Q2s, JTs, J9s, J8s, J7s, J3s, J2s, T9s, T8s, T5s, T4s, T3s, 95s, 94s, 93s, 85s, 84s, 83s, 82s, 75s, 74s, 73s, 72s, 64s, 63s, 62s, 54s, 53s, 52s, 43s, 42s, 32s, AKo, K4o, K3o, QJo, QTo, Q9o, Q8o, Q7o, Q5o, Q4o, Q2o, KQo, KJo, JTo, J9o, J8o, J7o, J5o, J4o, T9o, T8o, T7o, T6o, 98o, 97o, 96o, 87o, 86o, 76o, 65o"},
  "SB_13":  { name:"Small Blind","All-in":"77, 66, 55, 44, 33, 22, A9s, K9s, QTs, Q9s, JTs, J9s, T9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, K8s, K7s, K6s, K5s, K4s, K3s, K2s, Q8s, Q7s, Q6s, Q5s, Q4s, J8s, J7s, J6s, J5s, J4s, T8s, T7s, T6s, T5s, 98s, 97s, 96s, 95s, 87s, 86s, 85s, 76s, 75s, 65s, 92s, 83s, 82s, 73s, 72s, 62s, 52s, 42s, 32s, AKo, AQo, AJo, ATo, A9o, A8o, A7o, A6o, A5o, A4o, A3o, A2o, KQo, KJo, KTo, K9o, K8o, K7o, K6o, K5o, K4o, QJo, QTo, Q9o, Q8o, Q7o, Q6o, Q2o, JTo, J9o, J8o, J6o, T9o, T8o, T6o, 98o, 96o, 86o, 76o","Limp":"AA, KK, QQ, JJ, TT, 99, 88, A9s, K9s, QTs, Q9s, JTs, J9s, T9s, AKs, AQs, AJs, ATs, KQs, KJs, KTs, QJs, Q3s, Q2s, J3s, J2s, T4s, T3s, T2s, 94s, 93s, 92s, 84s, 83s, 82s, 74s, 73s, 72s, 64s, 63s, 62s, 54s, 53s, 52s, 43s, 42s, 32s, K3o, K2o, Q5o, Q4o, Q3o, Q2o, J7o, J6o, T7o, T6o, 97o, 96o, 87o, 86o, 76o"},
  "SB_12":  { name:"Small Blind","All-in":"77, 66, 55, 44, 33, 22, A9s, K9s, QTs, Q9s, JTs, J9s, T9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, K8s, K7s, K6s, K5s, K4s, K3s, K2s, Q8s, Q7s, Q6s, Q5s, Q4s, J8s, J7s, J6s, J5s, J4s, T8s, T7s, T6s, T5s, 98s, 97s, 96s, 95s, 87s, 86s, 85s, 76s, 75s, 65s, 92s, 83s, 82s, 73s, 72s, 62s, 52s, 42s, 32s, AKo, AQo, AJo, ATo, A9o, A8o, A7o, A6o, A5o, A4o, A3o, A2o, KQo, KJo, KTo, K9o, K8o, K7o, K6o, K5o, K4o, QJo, QTo, Q9o, Q8o, Q7o, Q6o, Q2o, JTo, J9o, J8o, J6o, T9o, T8o, T6o, 98o, 96o, 86o, 76o","Limp":"AA, KK, QQ, JJ, TT, 99, 88, A9s, K9s, QTs, Q9s, JTs, J9s, T9s, AKs, AQs, AJs, ATs, KQs, KJs, KTs, QJs, Q3s, Q2s, J3s, J2s, T4s, T3s, T2s, 94s, 93s, 92s, 84s, 83s, 82s, 74s, 73s, 72s, 64s, 63s, 62s, 54s, 53s, 52s, 43s, 42s, 32s, K3o, K2o, Q5o, Q4o, Q3o, Q2o, J7o, J6o, T7o, T6o, 97o, 96o, 87o, 86o, 76o"},
  "SB_11":  { name:"Small Blind","All-in":"88, 77, 66, 55, 44, 33, 22, ATs, KJs, KTs, QJs, QTs, JTs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, K9s, K8s, K7s, K6s, K5s, K4s, K3s, K2s, Q9s, Q8s, Q7s, Q6s, Q5s, Q4s, Q3s, Q2s, J9s, J8s, J7s, J6s, J5s, J4s, J3s, T9s, T8s, T7s, T6s, T5s, T4s, 98s, 97s, 96s, 95s, 94s, 87s, 86s, 85s, 84s, 76s, 75s, 74s, 65s, 64s, 54s, 92s, 83s, 82s, 73s, 72s, 63s, 62s, 52s, 42s, 32s, AKo, AQo, AJo, ATo, A9o, A8o, A7o, A6o, A5o, A4o, A3o, A2o, KQo, KJo, KTo, K9o, K8o, K7o, K6o, K5o, K4o, K3o, K2o, QJo, QTo, Q9o, Q8o, Q7o, Q6o, Q5o, Q2o, JTo, J9o, J8o, J7o, J6o, T9o, T8o, T7o, T6o, 98o, 97o, 96o, 87o, 86o, 76o","Limp":"AA, KK, QQ, JJ, TT, 99, ATs, KJs, KTs, QJs, QTs, JTs, AKs, AQs, AJs, KQs, J2s, T3s, T2s, 93s, 92s, 83s, 82s, 73s, 72s, 63s, 62s, 53s, 52s, 43s, 42s, 32s, Q4o, Q3o, Q2o, J6o, T6o, 96o, 86o, 76o"},
  "SB_10":  { name:"Small Blind","All-in":"88, 77, 66, 55, 44, 33, 22, ATs, KJs, KTs, QJs, QTs, JTs, A9s, A8s, A7s, A6s, A5s, A4s, A3s, A2s, K9s, K8s, K7s, K6s, K5s, K4s, K3s, K2s, Q9s, Q8s, Q7s, Q6s, Q5s, Q4s, Q3s, Q2s, J9s, J8s, J7s, J6s, J5s, J4s, J3s, T9s, T8s, T7s, T6s, T5s, T4s, 98s, 97s, 96s, 95s, 94s, 87s, 86s, 85s, 84s, 76s, 75s, 74s, 65s, 64s, 54s, 92s, 83s, 82s, 73s, 72s, 63s, 62s, 52s, 42s, 32s, AKo, AQo, AJo, ATo, A9o, A8o, A7o, A6o, A5o, A4o, A3o, A2o, KQo, KJo, KTo, K9o, K8o, K7o, K6o, K5o, K4o, K3o, K2o, QJo, QTo, Q9o, Q8o, Q7o, Q6o, Q5o, Q2o, JTo, J9o, J8o, J7o, J6o, T9o, T8o, T7o, T6o, 98o, 97o, 96o, 87o, 86o, 76o","Limp":"AA, KK, QQ, JJ, TT, 99, ATs, KJs, KTs, QJs, QTs, JTs, AKs, AQs, AJs, KQs, J2s, T3s, T2s, 93s, 92s, 83s, 82s, 73s, 72s, 63s, 62s, 53s, 52s, 43s, 42s, 32s, Q4o, Q3o, Q2o, J6o, T6o, 96o, 86o, 76o"},
};

const GTO: Record<string, Record<string, string[]>> = {};
Object.keys(RAW).forEach(k => {
  GTO[k] = { name: [RAW[k].name] };
  Object.keys(RAW[k]).forEach(a => { if (a !== 'name') GTO[k][a] = parseRange(RAW[k][a]); });
});

/* ── Grid colors ─────────────────────────────────────────────────── */
const gridColor = (action: string, isCurrent: boolean, show: boolean, dimmed = false) => {
  if (!show && !isCurrent) return { bg: 'linear-gradient(135deg,#0a0c14,#0d1120)', fg: 'rgba(255,255,255,0.28)' };
  if (isCurrent) return { bg: 'linear-gradient(135deg,#5b21b6,#06b6d4)', fg: '#f0f4ff' };
  if (!action)   return { bg: dimmed ? '#060810' : 'linear-gradient(135deg,#090c18,#0c1020)', fg: 'rgba(255,255,255,0.2)' };
  if (dimmed) return { bg: '#07090e', fg: 'rgba(255,255,255,0.08)' };
  if (action.startsWith('Raise')) return { bg: 'linear-gradient(135deg,#4c1d95,#7c3aed)', fg: '#ede9fe' };
  if (action === 'All-in')        return { bg: 'linear-gradient(135deg,#7f1d1d,#dc2626)', fg: '#fecaca' };
  if (action === 'Limp')          return { bg: 'linear-gradient(135deg,#0c4a6e,#0891b2)', fg: '#bae6fd' };
  if (action === 'Tightifie')     return { bg: 'linear-gradient(135deg,#78350f,#d97706)', fg: '#fde68a' };
  if (action === 'Loosifie')      return { bg: 'linear-gradient(135deg,#14532d,#059669)', fg: '#a7f3d0' };
  return { bg: '#07090e', fg: SILVER };
};

const LEGEND_COLORS: Record<string, string> = {
  'Raise': '#7c3aed',
  'All-in': '#dc2626', 'Limp': '#0891b2',
  'Tightifie': '#d97706', 'Loosifie': '#059669',
};

const TABLE_POS: Record<string, React.CSSProperties> = {
  LJ: { top: '50%', left: -20,   transform: 'translateY(-50%)' },
  HJ:  { top: 0,    left: '25%',  transform: 'translate(-50%,-50%)' },
  CO:  { top: 0,    left: '75%',  transform: 'translate(-50%,-50%)' },
  BTN: { top: '50%', right: -20,  transform: 'translateY(-50%)' },
  SB:  { bottom: 0, left: '75%',  transform: 'translate(-50%,50%)' },
  BB:  { bottom: 0, left: '25%',  transform: 'translate(-50%,50%)' },
};

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

const makeCards = (h: string): [string, string] => {
  const r1=h[0], r2=h[1], t=h[2]||'p';
  if (t==='s') { const s=pick(SUITS); return [`${r1} ${s}`,`${r2} ${s}`]; }
  if (t==='o') { const s1=pick(SUITS); let s2=pick(SUITS); while(s1===s2) s2=pick(SUITS); return [`${r1} ${s1}`,`${r2} ${s2}`]; }
  const s1=pick(SUITS); let s2=pick(SUITS); while(s1===s2) s2=pick(SUITS); return [`${r1} ${s1}`,`${r1} ${s2}`];
};

const parseCard = (card: string) => {
  const [r, s] = card.split(' ');
  const m: Record<string,{sym:string;col:string}> = {
    h:{sym:'♥',col:'#ef4444'}, d:{sym:'♦',col:'#ef4444'},
    s:{sym:'♠',col:'#1e293b'}, c:{sym:'♣',col:'#1e293b'},
  };
  return { rank: r, ...(m[s]||m['s']) };
};

/* ── RangeGrid ────────────────────────────────────────────────────── */
function RangeGrid({ rk, hand, revealed, onToggle, filter = [] }: {
  rk: string; hand: string; revealed: boolean; onToggle?: () => void; filter?: string[];
}) {
  const range = GTO[rk];
  if (!range) return null;

  const comboMap: Record<string, string> = {};
  Object.keys(range).forEach(a => {
    if (a === 'name') return;
    range[a].forEach(h => { comboMap[h] = a; });
  });
  const actions = Object.keys(range).filter(k => k !== 'name');

  return (
    <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 16, display: 'flex', flexDirection: 'column', height: '100%', gap: 10, backdropFilter: 'blur(8px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, color: DIM, textTransform: 'uppercase', letterSpacing: '0.18em', margin: 0 }}>GTO Range</p>
          <p style={{ fontSize: 13, fontWeight: 700, color: CREAM, margin: 0 }}>
            {range.name[0]} <span style={{ color: DIM, fontWeight: 400 }}>·</span> {rk.split('_')[1]}bb
          </p>
        </div>
        {onToggle && (
          <button onClick={onToggle} style={{ fontSize: 11, fontWeight: 700, padding: '5px 14px', borderRadius: 99, border: `1px solid ${revealed ? 'rgba(124,58,237,0.5)' : BORDER}`, background: revealed ? 'rgba(124,58,237,0.15)' : 'transparent', color: revealed ? '#a78bfa' : SILVER, cursor: 'pointer', transition: 'all 0.15s' }}>
            {revealed ? 'Cacher' : 'Voir'}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, flexShrink: 0 }}>
        {actions.map(a => {
          const bg = LEGEND_COLORS[a] || '#374151';
          const short = a;
          return (
            <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 4, border: `1px solid ${bg}33`, background: `${bg}15` }}>
              <div style={{ width: 5, height: 5, borderRadius: 1, background: bg, flexShrink: 0 }} />
              <span style={{ fontSize: 8, fontWeight: 700, color: bg === '#065f46' ? '#6ee7b7' : bg === '#92400e' ? '#fde68a' : bg }}>{short}</span>
            </div>
          );
        })}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 4, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.1)' }}>
          <div style={{ width: 5, height: 5, borderRadius: 1, background: '#f59e0b', flexShrink: 0 }} />
          <span style={{ fontSize: 8, fontWeight: 700, color: '#f59e0b' }}>Main</span>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(13, 1fr)', gridTemplateRows: 'repeat(13, 1fr)', gap: 2, width: '100%', height: '100%' }}>
          {Array.from({ length: 169 }, (_, idx) => {
            const i = Math.floor(idx / 13), j = idx % 13;
            const combo = getHandFromCoords(i, j);
            const action = comboMap[combo];
            const isCurrent = combo === hand;
            const dimmed = filter.length > 0 && !!action && !filter.includes(action);
            const { bg, fg } = gridColor(action, isCurrent, revealed || isCurrent, dimmed);
            return (
              <div key={idx} title={combo} style={{ background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, borderRadius: 2, position: 'relative', transform: isCurrent ? 'scale(1.15)' : 'scale(1)', zIndex: isCurrent ? 5 : 'auto', transition: 'background 0.1s', overflow: 'hidden', letterSpacing: '-0.5px' }}>
                {combo.replace(/[so]$/, '')}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── PlaygroundGrid ───────────────────────────────────────────────── */
function PlaygroundGrid({ rk, filter, hover, setHover }: {
  rk: string; filter: string[]; hover: string | null; setHover: (h: string | null) => void;
}) {
  const range = GTO[rk];
  if (!range) return null;

  const comboMap: Record<string, string> = {};
  Object.keys(range).forEach(a => {
    if (a === 'name') return;
    range[a].forEach(h => { comboMap[h] = a; });
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(13, 1fr)', gridTemplateRows: 'repeat(13, 1fr)', gap: 2, width: '100%', height: '100%' }}>
      {Array.from({ length: 169 }, (_, idx) => {
        const i = Math.floor(idx / 13), j = idx % 13;
        const combo = getHandFromCoords(i, j);
        const action = comboMap[combo];
        const isHover = combo === hover;
        const dimmed = filter.length > 0 && !!action && !filter.includes(action);
        const { bg, fg } = gridColor(action, isHover, true, dimmed);
        return (
          <div key={idx}
            onMouseEnter={() => setHover(combo)}
            onMouseLeave={() => setHover(null)}
            style={{ background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, borderRadius: 2, transform: isHover ? 'scale(1.18)' : 'scale(1)', zIndex: isHover ? 5 : 'auto', transition: 'all 0.08s', cursor: 'default', letterSpacing: '-0.5px', position: 'relative' }}>
            {combo.replace(/[so]$/, '')}
          </div>
        );
      })}
    </div>
  );
}

/* ── CustomRangeGrid ──────────────────────────────────────────────── */
function CustomRangeGrid({ comboMap, paintAction, onPaint }: {
  comboMap: Record<string, string>;
  paintAction: string | null;
  onPaint: (combo: string) => void;
}) {
  const painting = useRef(false);

  const colorFor = (action: string | undefined) => {
    if (!action) return { bg: '#080d14', fg: 'rgba(255,255,255,0.12)' };
    const ca = CUSTOM_ACTIONS.find(a => a.id === action);
    if (ca) return { bg: ca.color, fg: ca.fg };
    return { bg: '#1d4ed8', fg: '#bfdbfe' };
  };

  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: 'repeat(13, 1fr)', gridTemplateRows: 'repeat(13, 1fr)', gap: 2, width: '100%', height: '100%', userSelect: 'none' }}
      onMouseLeave={() => { painting.current = false; }}
    >
      {Array.from({ length: 169 }, (_, idx) => {
        const i = Math.floor(idx / 13), j = idx % 13;
        const combo = getHandFromCoords(i, j);
        const action = comboMap[combo];
        const { bg, fg } = colorFor(action);
        return (
          <div key={idx}
            onMouseDown={e => { e.preventDefault(); painting.current = true; onPaint(combo); }}
            onMouseEnter={() => { if (painting.current) onPaint(combo); }}
            onMouseUp={() => { painting.current = false; }}
            style={{ background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, borderRadius: 2, cursor: paintAction ? 'crosshair' : 'default', transition: 'background 0.05s', letterSpacing: '-0.5px' }}>
            {combo.replace(/[so]$/, '')}
          </div>
        );
      })}
    </div>
  );
}

/* ── Poker table component ─────────────────────────────────────────── */
function PokerTable({ scenario, heroColor }: { scenario: DrillScenario; heroColor?: { bg: string; border: string; color: string; gradient: string } }) {
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 460, aspectRatio: '2/1', margin: '0 auto' }}>
      <div style={{ position: 'absolute', inset: 0, background: '#060910', borderRadius: 999, border: '6px solid #2d1b69', boxShadow: '0 0 28px rgba(124,58,237,0.35), inset 0 0 18px rgba(124,58,237,0.08)' }}>
        <div style={{ position: 'absolute', inset: 8, borderRadius: 999, background: 'radial-gradient(ellipse at center, #0d1425 0%, #060910 100%)', border: '1px solid rgba(124,58,237,0.35)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          {/* Logo ONLYPOK sur la table */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, opacity: 0.28 }}>
            <div style={{ width: 6, height: 6, borderRadius: 2, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-syne, sans-serif)', fontWeight: 700, fontSize: 11, letterSpacing: '0.22em', color: CREAM }}>ONLYPOK</span>
          </div>
          {/* Pot label */}
          <div style={{ padding: '5px 18px', borderRadius: 99, border: '1px solid rgba(6,182,212,0.3)', background: 'rgba(6,182,212,0.07)', boxShadow: '0 0 14px rgba(6,182,212,0.25), 0 0 32px rgba(6,182,212,0.1)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: CYAN, letterSpacing: '0.12em', textTransform: 'uppercase', textShadow: '0 0 10px rgba(6,182,212,0.7)' }}>Pot : {scenario.potSize} bb</span>
          </div>
        </div>
      </div>
      {(['LJ','HJ','CO','BTN','SB','BB'] as const).map(p => {
        const isHero = p === scenario.heroPosition;
        return (
          <div key={p} style={{ position: 'absolute', ...TABLE_POS[p], display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, background: isHero ? (heroColor?.gradient ?? GRAD) : 'rgba(15,18,26,0.9)', border: isHero ? `2px solid ${heroColor?.border ?? 'transparent'}` : `1px solid ${BORDER}`, color: isHero ? (heroColor?.color ?? '#fff') : DIM, boxShadow: isHero ? `0 0 20px ${heroColor?.border ?? 'rgba(124,58,237,0.4)'}` : 'none', transform: isHero ? 'scale(1.2)' : 'scale(1)', zIndex: isHero ? 10 : 1 }}>
              {p}
            </div>
            {isHero && (
              <div style={{ display: 'flex', gap: 6, position: 'absolute', zIndex: 20,
                ...(p === 'HJ' || p === 'CO' ? { bottom: 54, left: '50%', transform: 'translateX(-50%)' } :
                    p === 'LJ'              ? { top: 54, right: 0 } :
                    p === 'BTN'              ? { top: 54, left: 0 } :
                                              { top: 54,   left: '50%', transform: 'translateX(-50%)' }) }}>
                {scenario.heroCards.map((card, ci) => {
                  const { rank, sym, col } = { ...parseCard(card), sym: parseCard(card).sym, col: parseCard(card).col };
                  return (
                    <div key={ci} style={{ width: 42, height: 60, borderRadius: 7, background: '#f5f0e8', border: '1px solid rgba(0,0,0,0.12)', boxShadow: '0 4px 20px rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 22, fontWeight: 900, lineHeight: 1, color: col }}>{rank}</span>
                      <span style={{ fontSize: 18, lineHeight: 1, color: col }}>{sym}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────────────── */
export default function RangesPage() {
  /* drill state */
  const [mode,      setMode]      = useState<AppMode>('training');
  const [count,     setCount]     = useState(20);
  const [positions, setPositions] = useState<Position[]>([...POSITIONS_LIST]);
  const [stacks,    setStacks]    = useState<number[]>([...STACKS_LIST]);
  const [scenario,  setScenario]  = useState<DrillScenario | null>(null);
  const [idx,       setIdx]       = useState(0);
  const [score,     setScore]     = useState(0);
  const [mistakes,  setMistakes]  = useState<Mistake[]>([]);
  const [feedback,  setFeedback]  = useState<string | null>(null);
  const [correct,   setCorrect]   = useState<boolean | null>(null);
  const [revealed,      setRevealed]      = useState(false);
  const [drillQuizMode, setDrillQuizMode] = useState(false);

  /* config tabs */
  const [configTab, setConfigTab] = useState<ConfigTab>('drill');

  /* quiz state */
  const [quizScenario,   setQuizScenario]   = useState<DrillScenario | null>(null);
  const [quizPhase,      setQuizPhase]      = useState<'guessing' | 'revealed'>('guessing');
  const [quizPts,        setQuizPts]        = useState(0);
  const [quizRounds,     setQuizRounds]     = useState(0);
  const [quizStreak,     setQuizStreak]     = useState(0);
  const [quizBestStreak, setQuizBestStreak] = useState(0);
  const [quizResults,    setQuizResults]    = useState<QuizResult[]>([]);
  const [quizUserAction, setQuizUserAction] = useState<string | null>(null);
  const [quizGrade,      setQuizGrade]      = useState<QuizGrade | null>(null);
  const [quizCount,      setQuizCount]      = useState(10);
  const [quizIdx,        setQuizIdx]        = useState(0);

  /* playground state */
  const [pgPos,    setPgPos]    = useState<Position>('BTN');
  const [pgStack,  setPgStack]  = useState<number>(100);
  const [pgHover,  setPgHover]  = useState<string | null>(null);
  const [pgFilter, setPgFilter] = useState<string[]>([]);
  const [pgMode,   setPgMode]   = useState<'explore' | 'custom'>('explore');

  /* custom range state */
  const [customMap,       setCustomMap]       = useState<Record<string, string>>({});
  const [paintAction,     setPaintAction]     = useState<string>('Raise');
  const [customName,      setCustomName]      = useState('');
  const [savedRanges,     setSavedRanges]     = useState<SavedRange[]>([]);
  const [showSaved,       setShowSaved]       = useState(false);
  const [importInput,     setImportInput]     = useState('');
  const [showImport,      setShowImport]      = useState(false);
  const [copyMsg,         setCopyMsg]         = useState(false);
  const [showSettings,    setShowSettings]    = useState(false);
  const [showShareModal,  setShowShareModal]  = useState(false);
  const [shareUrl,        setShareUrl]        = useState('');
  const [shareCopied,     setShareCopied]     = useState(false);
  const [importBanner,    setImportBanner]    = useState<{ name: string; map: Record<string,string> } | null>(null);

  /* load saved ranges from localStorage + detect ?share= param */
  useEffect(() => {
    try {
      const raw = localStorage.getItem('onlypok_custom_ranges');
      if (raw) setSavedRanges(JSON.parse(raw));
    } catch { /* ignore */ }
    try {
      const params = new URLSearchParams(window.location.search);
      const encoded = params.get('share');
      if (encoded) {
        const { name, comboMap } = JSON.parse(atob(encoded));
        setImportBanner({ name, map: comboMap });
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch { /* ignore */ }
  }, []);

  const persistRanges = (ranges: SavedRange[]) => {
    setSavedRanges(ranges);
    try { localStorage.setItem('onlypok_custom_ranges', JSON.stringify(ranges)); } catch { /* ignore */ }
  };

  const saveCustomRange = () => {
    const name = customName.trim();
    if (!name) return;
    const entry: SavedRange = { id: Date.now().toString(), name, comboMap: { ...customMap }, createdAt: new Date().toLocaleDateString('fr-FR') };
    persistRanges([...savedRanges, entry]);
    setCustomName('');
  };

  const deleteCustomRange = (id: string) => persistRanges(savedRanges.filter(r => r.id !== id));

  const loadCustomRange = (r: SavedRange) => { setCustomMap({ ...r.comboMap }); setShowSaved(false); };

  const exportCode = () => {
    const code = btoa(JSON.stringify(customMap));
    navigator.clipboard.writeText(code).then(() => { setCopyMsg(true); setTimeout(() => setCopyMsg(false), 2000); });
  };

  const shareRange = () => {
    const name = customName.trim() || 'Ma range';
    const encoded = btoa(JSON.stringify({ name, comboMap: customMap }));
    const url = `${window.location.origin}/trainer/ranges?share=${encoded}`;
    setShareUrl(url);
    setShowShareModal(true);
    setShareCopied(false);
  };

  const copyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl).then(() => { setShareCopied(true); setTimeout(() => setShareCopied(false), 2500); });
  };

  const importCode = () => {
    try {
      const decoded = JSON.parse(atob(importInput.trim()));
      setCustomMap(decoded); setShowImport(false); setImportInput('');
    } catch { alert('Code invalide — vérifie que tu as bien copié le code entier.'); }
  };

  const paintCombo = (combo: string) => {
    setCustomMap(prev => {
      if (paintAction === 'erase') { const n = { ...prev }; delete n[combo]; return n; }
      if (prev[combo] === paintAction) { const n = { ...prev }; delete n[combo]; return n; }
      return { ...prev, [combo]: paintAction };
    });
  };

  const clearCustomRange = () => setCustomMap({});

  /* ── Drill generate ── */
  const generate = useCallback(() => {
    const keys = Object.keys(GTO).filter(k => {
      const [p, s] = k.split('_');
      return positions.includes(p as Position) && stacks.includes(+s);
    });
    if (!keys.length) { alert('Aucune range GTO pour cette combinaison.'); setShowSettings(true); return; }

    const rk = pick(keys);
    const [pos, stackStr] = rk.split('_');
    const range = GTO[rk];

    const active = new Set<string>();
    Object.keys(range).forEach(a => { if (a !== 'name') range[a].forEach(h => active.add(h)); });
    const border = new Set<string>();
    active.forEach(h => getNeighbors(h).forEach(n => { if (!active.has(n)) border.add(n); }));

    const r = Math.random();
    const chosen = r < 0.45 ? pick([...active]) : r < 0.90 ? pick([...border]) : pick(ALL_169);

    setScenario({ heroCards: makeCards(chosen || 'AA'), gridHand: chosen || 'AA', heroPosition: pos as Position, stackSize: +stackStr, potSize: pos === 'SB' ? 1.0 : 1.5, actionText: pos === 'SB' ? 'Folds to you in SB' : 'Folds to you' });
    setFeedback(null); setCorrect(null); setRevealed(false);
  }, [positions, stacks]);

  const start = () => {
    if (!positions.length || !stacks.length) { alert('Sélectionne au moins une position et une profondeur.'); return; }
    setScore(0); setMistakes([]); setIdx(0); setDrillQuizMode(false); setRevealed(true); setMode('training'); generate();
  };

  const act = (action: string) => {
    if (!scenario || feedback) return;
    const rk = `${scenario.heroPosition}_${scenario.stackSize}`;
    const range = GTO[rk];
    let correctAction = 'Fold';
    for (const a of Object.keys(range).filter(k => k !== 'name')) {
      if (range[a].includes(scenario.gridHand)) { correctAction = a; break; }
    }

    if (drillQuizMode) {
      const grade = gradeAnswer(action, correctAction);
      const newStreak = grade.pts > 0 ? quizStreak + 1 : 0;
      setQuizUserAction(action); setQuizGrade(grade);
      setQuizPts(p => p + grade.pts); setQuizRounds(r => r + 1);
      setQuizStreak(newStreak); setQuizBestStreak(b => Math.max(b, newStreak));
      setQuizResults(prev => [...prev, { hand: scenario.gridHand, position: scenario.heroPosition, stack: scenario.stackSize, userAction: action, correctAction, ...grade }]);
      setCorrect(grade.pts === 3); setRevealed(true);
      setFeedback(`${grade.label} +${grade.pts}pts — ${scenario.gridHand} : ${correctAction.toUpperCase()}`);
      setTimeout(() => {
        if (idx + 1 >= count) { setMode('quiz-summary'); }
        else { setIdx(i => i + 1); generate(); setRevealed(false); setFeedback(null); }
      }, 1600);
    } else {
      const ok = action === correctAction ||
        (action.includes('Raise') && (correctAction === 'Tightifie' || correctAction === 'Loosifie')) ||
        (action === 'Fold' && correctAction === 'Tightifie');
      setCorrect(ok); setRevealed(true);
      if (ok) {
        setScore(s => s + 1);
        setFeedback(`Correct — ${scenario.gridHand} : ${correctAction.toUpperCase()}`);
      } else {
        setMistakes(m => [...m, { hand: scenario.gridHand, position: scenario.heroPosition, stack: scenario.stackSize, userAction: action, correctAction }]);
        setFeedback(`Faux — ${scenario.gridHand} : ${correctAction.toUpperCase()}`);
      }
      setTimeout(() => {
        if (idx + 1 >= count) setMode('summary');
        else { setIdx(i => i + 1); generate(); }
      }, 1600);
    }
  };

  /* ── Quiz generate ── */
  const generateQuizHand = useCallback(() => {
    const keys = Object.keys(GTO).filter(k => {
      const [p, s] = k.split('_');
      return positions.includes(p as Position) && stacks.includes(+s);
    });
    if (!keys.length) return;
    const rk = pick(keys);
    const [pos, stackStr] = rk.split('_');
    const range = GTO[rk];
    const active = new Set<string>();
    Object.keys(range).forEach(a => { if (a !== 'name') range[a].forEach(h => active.add(h)); });
    const border = new Set<string>();
    active.forEach(h => getNeighbors(h).forEach(n => { if (!active.has(n)) border.add(n); }));
    const r = Math.random();
    const chosen = r < 0.45 ? pick([...active]) : r < 0.90 ? pick([...border]) : pick(ALL_169);
    setQuizScenario({ heroCards: makeCards(chosen || 'AA'), gridHand: chosen || 'AA', heroPosition: pos as Position, stackSize: +stackStr, potSize: pos === 'SB' ? 1.0 : 1.5, actionText: pos === 'SB' ? 'Folds to you in SB' : 'Folds to you' });
    setQuizPhase('guessing');
    setQuizUserAction(null);
    setQuizGrade(null);
  }, [positions, stacks]);

  const startQuiz = () => {
    if (!positions.length || !stacks.length) { alert('Sélectionne au moins une position et une profondeur.'); return; }
    setQuizPts(0); setQuizRounds(0); setQuizStreak(0); setQuizBestStreak(0);
    setQuizResults([]); setQuizIdx(0);
    setMode('quiz');
    generateQuizHand();
  };

  const submitQuizAction = (action: string) => {
    if (!quizScenario || quizPhase !== 'guessing') return;
    const rk = `${quizScenario.heroPosition}_${quizScenario.stackSize}`;
    const range = GTO[rk];
    let correctAction = 'Fold';
    for (const a of Object.keys(range).filter(k => k !== 'name')) {
      if (range[a].includes(quizScenario.gridHand)) { correctAction = a; break; }
    }
    const grade = gradeAnswer(action, correctAction);
    const newStreak = grade.pts > 0 ? quizStreak + 1 : 0;
    setQuizUserAction(action);
    setQuizGrade(grade);
    setQuizPhase('revealed');
    setQuizPts(p => p + grade.pts);
    setQuizRounds(r => r + 1);
    setQuizStreak(newStreak);
    setQuizBestStreak(b => Math.max(b, newStreak));
    setQuizResults(prev => [...prev, { hand: quizScenario.gridHand, position: quizScenario.heroPosition, stack: quizScenario.stackSize, userAction: action, correctAction, ...grade }]);
  };

  const nextQuizHand = () => {
    if (quizIdx + 1 >= quizCount) { setMode('quiz-summary'); }
    else { setQuizIdx(i => i + 1); generateQuizHand(); }
  };

  /* ── Action button style ── */
  const actionBtn = (a: string, disabled = false): React.CSSProperties => {
    const base: React.CSSProperties = { flex: 1, minWidth: 88, padding: '13px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', borderRadius: 10, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1, transition: 'all 0.15s', border: '1px solid transparent' };
    if (a === 'Fold')          return { ...base, background: 'transparent', border: `1px solid ${BORDER}`, color: SILVER };
    if (a.includes('Raise'))   return { ...base, background: 'linear-gradient(135deg,rgba(76,29,149,0.4),rgba(124,58,237,0.25))', border: '1px solid rgba(124,58,237,0.5)', color: '#ede9fe' };
    if (a === 'All-in')        return { ...base, background: 'linear-gradient(135deg,rgba(127,29,29,0.4),rgba(220,38,38,0.25))', border: '1px solid rgba(220,38,38,0.5)', color: '#fecaca' };
    if (a === 'Limp')          return { ...base, background: 'linear-gradient(135deg,rgba(12,74,110,0.4),rgba(8,145,178,0.25))', border: '1px solid rgba(8,145,178,0.5)', color: '#bae6fd' };
    if (a === 'Tightifie')     return { ...base, background: 'linear-gradient(135deg,rgba(120,53,15,0.4),rgba(217,119,6,0.25))', border: '1px solid rgba(217,119,6,0.5)', color: '#fde68a' };
    if (a === 'Loosifie')      return { ...base, background: 'linear-gradient(135deg,rgba(20,83,45,0.4),rgba(5,150,105,0.25))', border: '1px solid rgba(5,150,105,0.5)', color: '#a7f3d0' };
    return { ...base, background: CARD_BG, color: CREAM };
  };

  const pct = Math.round((score / count) * 100);

  /* ── Playground computed stats ── */
  const pgRk = `${pgPos}_${pgStack}`;
  const pgRange = GTO[pgRk];
  const pgComboMap: Record<string, string> = {};
  const pgStats: { action: string; combos: number; color: string }[] = [];
  if (pgRange) {
    Object.keys(pgRange).forEach(a => {
      if (a === 'name') return;
      pgRange[a].forEach(h => { pgComboMap[h] = a; });
    });
    Object.keys(pgRange).filter(a => a !== 'name').forEach(a => {
      const combos = pgRange[a].reduce((sum, h) => sum + countCombos(h), 0);
      pgStats.push({ action: a, combos, color: LEGEND_COLORS[a] || '#374151' });
    });
  }
  const pgTotal = pgStats.reduce((s, x) => s + x.combos, 0);
  const TOTAL_COMBOS = 1326;
  const pgHoverAction = pgHover ? pgComboMap[pgHover] : null;
  const pgHoverCombos = pgHover ? countCombos(pgHover) : null;

  const activeTab: ConfigTab =
    mode === 'quiz' || mode === 'quiz-summary' ? 'quiz' :
    mode === 'playground' ? 'playground' : 'drill';

  const switchMode = (tab: ConfigTab) => {
    setConfigTab(tab);
    setShowSettings(false);
    if (tab === 'drill') { setScore(0); setMistakes([]); setIdx(0); setMode('training'); generate(); }
    else if (tab === 'quiz') { startQuiz(); }
    else { setMode('playground'); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { generate(); }, []);

  return (
    <div style={{ minHeight: '100vh', background: BG, color: CREAM, fontFamily: 'DM Sans, system-ui, sans-serif' }}>
      <Navbar />

      {/* ── Permanent mode bar ── */}
      <div style={{ position: 'sticky', top: 68, zIndex: 45, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', height: 50, background: 'rgba(7,9,14,0.92)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${BORDER}` }}>
        {/* Left: back + mode tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link href="/trainer" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: SILVER, textDecoration: 'none' }}>
            <ArrowLeft size={12} /> Trainer
          </Link>
          <div style={{ width: 1, height: 16, background: BORDER }} />
          <div style={{ display: 'flex', gap: 2 }}>
            {([
              { id: 'drill' as ConfigTab, label: 'Drill', Icon: Target, color: VIOLET },
              { id: 'playground' as ConfigTab, label: 'Playground', Icon: Layers, color: '#4ade80' },
            ]).map(({ id, label, Icon, color }) => {
              const active = activeTab === id;
              return (
                <button key={id} onClick={() => switchMode(id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 13px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all 0.15s', background: active ? `${color}18` : 'transparent', color: active ? color : SILVER }}>
                  <Icon size={12} color={active ? color : SILVER} /> {label}
                </button>
              );
            })}
          </div>
        </div>
        {/* Right: stats + settings */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          {mode === 'training' && scenario && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 99, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)', color: '#a78bfa' }}>{scenario.stackSize}bb</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: CREAM }}>{scenario.heroPosition}</span>
              <span style={{ fontSize: 11, color: DIM }}>{idx + 1}/{count}</span>
              <span style={{ fontSize: 11, color: DIM }}>·</span>
              <span style={{ fontSize: 11, color: SILVER }}>{score}/{idx > 0 ? idx : 0}</span>
            </div>
          )}
          {mode === 'quiz' && quizScenario && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 99, background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.25)', color: CYAN }}>{quizScenario.stackSize}bb</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: CREAM }}>{quizScenario.heroPosition}</span>
              <span style={{ fontSize: 11, color: DIM }}>{quizIdx + 1}/{quizCount}</span>
              <span style={{ fontSize: 11, color: DIM }}>·</span>
              <span style={{ fontSize: 11, color: SILVER }}>{quizPts} pts</span>
              {quizStreak >= 3 && <span style={{ fontSize: 11, color: '#fbbf24' }}>🔥 {quizStreak}</span>}
            </div>
          )}
          <button onClick={() => setShowSettings(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1px solid ${showSettings ? 'rgba(255,255,255,0.18)' : BORDER}`, background: showSettings ? 'rgba(255,255,255,0.06)' : 'transparent', color: showSettings ? CREAM : SILVER, transition: 'all 0.15s' }}>
            <Settings size={12} /> Paramètres
          </button>
        </div>
      </div>

      {/* ── Bannière import range partagée ── */}
      {importBanner && (
        <div style={{ position: 'fixed', top: 68 + 50 + 16, left: '50%', transform: 'translateX(-50%)', zIndex: 200, background: 'rgba(7,9,14,0.96)', border: '1px solid rgba(6,182,212,0.4)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)', maxWidth: 480, width: 'calc(100vw - 48px)' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: CYAN, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Range reçue</p>
            <p style={{ fontSize: 14, fontWeight: 800, color: CREAM, margin: 0 }}>{importBanner.name}</p>
          </div>
          <button onClick={() => { setCustomMap(importBanner.map); setMode('playground'); setPgMode('custom'); setImportBanner(null); }} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: CYAN, color: '#07090e', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Importer →
          </button>
          <button onClick={() => setImportBanner(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: DIM, padding: 4 }}><X size={14} /></button>
        </div>
      )}

      {/* ── Modal partage ── */}
      {showShareModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }} onClick={() => setShowShareModal(false)}>
          <div style={{ background: '#0d1120', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 20, padding: 32, width: 480, maxWidth: 'calc(100vw - 48px)', boxShadow: '0 24px 64px rgba(0,0,0,0.7)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: CYAN, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 4px' }}>Partager la range</p>
                <p style={{ fontSize: 18, fontWeight: 800, color: CREAM, margin: 0 }}>Envoie ce lien à tes joueurs</p>
              </div>
              <button onClick={() => setShowShareModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: DIM }}><X size={16} /></button>
            </div>
            <p style={{ fontSize: 12, color: SILVER, margin: '0 0 16px', lineHeight: 1.6 }}>
              Les joueurs inscrits pourront ouvrir ce lien et importer directement ta range dans leur Playground.
            </p>
            <div style={{ display: 'flex', gap: 8, background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
              <p style={{ flex: 1, fontSize: 11, color: SILVER, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{shareUrl}</p>
            </div>
            <button onClick={copyShareUrl} style={{ width: '100%', padding: '13px 0', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: shareCopied ? 'rgba(74,222,128,0.2)' : `linear-gradient(135deg, ${VIOLET}, ${CYAN})`, color: shareCopied ? '#4ade80' : '#fff', transition: 'all 0.2s' }}>
              {shareCopied ? '✓ Lien copié !' : 'Copier le lien'}
            </button>
          </div>
        </div>
      )}

      <main style={{ width: '100%', maxWidth: 1400, margin: '0 auto', padding: `${68 + 50 + 24}px 32px 48px` }}>

        {/* ══ SETTINGS DRAWER ══════════════════════════════════════ */}
        {showSettings && (
          <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 18, padding: '20px 24px', marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: DIM, textTransform: 'uppercase', letterSpacing: '0.18em', margin: 0 }}>Paramètres de session</p>
              <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: DIM, display: 'flex', padding: 2 }}>
                <X size={14} />
              </button>
            </div>
            <ConfigPositions positions={positions} setPositions={setPositions} />
            <ConfigStacks stacks={stacks} setStacks={setStacks} />
            {activeTab !== 'playground' && (
              <ConfigCount
                count={activeTab === 'quiz' ? quizCount : count}
                setCount={activeTab === 'quiz' ? setQuizCount : setCount}
                options={activeTab === 'quiz' ? [5, 10, 20, 30] : [10, 20, 50, 100]}
              />
            )}
            <button onClick={() => { setShowSettings(false); activeTab === 'quiz' ? startQuiz() : activeTab === 'playground' ? setMode('playground') : start(); }}
              style={{ padding: '14px 0', borderRadius: 12, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: GRAD, color: CREAM, boxShadow: '0 0 20px rgba(124,58,237,0.25)' }}>
              Relancer →
            </button>
          </div>
        )}

        {/* ══ TRAINING ════════════════════════════════════════════ */}
        {mode === 'training' && scenario && (() => {
          const rk = `${scenario.heroPosition}_${scenario.stackSize}`;
          const range = GTO[rk];
          if (!range) return null;
          const btns = ['Fold', ...Object.keys(range).filter(k => k !== 'name')];
          const posColor: Record<Position, { bg: string; border: string; color: string; gradient: string }> = {
            LJ:  { bg: 'rgba(220,38,38,0.1)',  border: 'rgba(220,38,38,0.4)',  color: '#fca5a5', gradient: 'linear-gradient(135deg,#7f1d1d,#dc2626)' },
            HJ:  { bg: 'rgba(217,119,6,0.1)',  border: 'rgba(217,119,6,0.4)',  color: '#fde68a', gradient: 'linear-gradient(135deg,#78350f,#d97706)' },
            CO:  { bg: 'rgba(5,150,105,0.1)',   border: 'rgba(5,150,105,0.4)',  color: '#6ee7b7', gradient: 'linear-gradient(135deg,#14532d,#059669)' },
            BTN: { bg: 'rgba(6,182,212,0.1)',   border: 'rgba(6,182,212,0.4)',  color: '#67e8f9', gradient: 'linear-gradient(135deg,#0c4a6e,#06b6d4)' },
            SB:  { bg: 'rgba(124,58,237,0.1)',  border: 'rgba(124,58,237,0.4)', color: '#c4b5fd', gradient: 'linear-gradient(135deg,#4c1d95,#7c3aed)' },
          };
          const pc = posColor[scenario.heroPosition];
          return (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 680px', gap: 0, height: 'calc(100vh - 200px)', alignItems: 'stretch' }}>
                <div style={{ paddingRight: 32, overflow: 'visible', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'visible' }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 128 }}>
                      <div style={{ flex: 1, padding: '13px 12px', borderRadius: 10, border: '1px solid rgba(59,130,246,0.4)', background: 'rgba(59,130,246,0.1)', textAlign: 'center', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#93c5fd' }}>
                        {scenario.stackSize}BB
                      </div>
                      <div style={{ flex: 1, padding: '13px 12px', borderRadius: 10, border: '1px solid rgba(30,64,175,0.5)', background: 'rgba(30,64,175,0.15)', textAlign: 'center', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#bfdbfe' }}>
                        {range.name[0]}
                      </div>
                      <div style={{ flex: 2, padding: '13px 12px', borderRadius: 10, border: `1px solid ${BORDER}`, background: CARD_BG, textAlign: 'center', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: SILVER }}>
                        {scenario.actionText}
                      </div>
                      <button
                        onClick={() => setShowSettings(v => !v)}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '13px 12px', borderRadius: 10, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer', border: `1px solid ${showSettings ? 'rgba(124,58,237,0.5)' : BORDER}`, background: showSettings ? 'rgba(124,58,237,0.15)' : CARD_BG, color: showSettings ? '#a78bfa' : SILVER, transition: 'all 0.15s' }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                        Paramètres
                      </button>
                    </div>
                    <div style={{ paddingBottom: 128 }}>
                      <PokerTable scenario={scenario} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {btns.map(a => <button key={a} onClick={() => act(a)} disabled={!!feedback} style={actionBtn(a, !!feedback)}>{a}</button>)}
                      </div>
                      {feedback && (
                        <div style={{ marginTop: 12, width: '100%', padding: '12px 18px', borderRadius: 12, fontWeight: 700, fontSize: 14, background: CARD_BG, borderLeft: `3px solid ${drillQuizMode ? (quizGrade?.color ?? '#4ade80') : (correct ? VIOLET : '#ef4444')}`, color: drillQuizMode ? (quizGrade?.color ?? '#4ade80') : (correct ? '#a78bfa' : '#fca5a5'), backdropFilter: 'blur(8px)' }}>
                          {feedback}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {/* Séparateur */}
                <div style={{ alignSelf: 'stretch', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 1, height: '70%', background: 'linear-gradient(to bottom, transparent, rgba(124,58,237,0.25) 30%, rgba(6,182,212,0.2) 70%, transparent)' }} />
                </div>
                <div style={{ alignSelf: 'stretch', paddingLeft: 32, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                    <button onClick={() => { setDrillQuizMode(false); setRevealed(true); }} style={{ flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer', border: `1px solid ${!drillQuizMode ? 'rgba(124,58,237,0.5)' : BORDER}`, background: !drillQuizMode ? 'rgba(124,58,237,0.15)' : 'transparent', color: !drillQuizMode ? '#a78bfa' : SILVER, transition: 'all 0.15s' }}>
                      <Target size={10} style={{ display: 'inline', marginRight: 5 }} /> Drill
                    </button>
                    <button onClick={() => { setDrillQuizMode(true); setRevealed(false); setQuizPts(0); setQuizRounds(0); setQuizStreak(0); setQuizBestStreak(0); setQuizResults([]); setQuizCount(count); setQuizUserAction(null); setQuizGrade(null); }} style={{ flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer', border: `1px solid ${drillQuizMode ? 'rgba(6,182,212,0.5)' : BORDER}`, background: drillQuizMode ? 'rgba(6,182,212,0.12)' : 'transparent', color: drillQuizMode ? CYAN : SILVER, transition: 'all 0.15s' }}>
                      <Brain size={10} style={{ display: 'inline', marginRight: 5 }} /> Quiz
                    </button>
                  </div>
                  <div style={{ flex: 1 }}>
                    <RangeGrid rk={rk} hand={scenario.gridHand} revealed={revealed} onToggle={() => setRevealed(v => !v)} />
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ══ SUMMARY ════════════════════════════════════════════ */}
        {mode === 'summary' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 720, margin: '0 auto' }}>
            <div style={{ position: 'relative', width: '100%', background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 24, padding: '48px 0', textAlign: 'center', marginBottom: 24, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.12) 0%, transparent 60%)', pointerEvents: 'none' }} />
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: DIM, marginBottom: 12 }}>Score Final</p>
              <p style={{ fontSize: 88, fontWeight: 900, letterSpacing: '-3px', lineHeight: 1, margin: '0 0 12px', background: pct >= 85 ? GRAD : pct >= 60 ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : 'linear-gradient(135deg, #ef4444, #b91c1c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {pct}%
              </p>
              <p style={{ fontSize: 15, color: SILVER, fontWeight: 500 }}>{score} corrects · {count} mains</p>
            </div>
            {mistakes.length > 0 ? (
              <div style={{ width: '100%', background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 18, overflow: 'hidden', marginBottom: 24 }}>
                <div style={{ padding: '14px 24px', borderBottom: `1px solid ${BORDER}` }}>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: DIM, margin: 0 }}>Revue des erreurs</p>
                </div>
                {mistakes.map((m, i) => (
                  <div key={i} style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: i < mistakes.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)', color: '#a78bfa' }}>{m.position}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', color: CYAN }}>{m.stack}bb</span>
                      </div>
                      <span style={{ fontSize: 18, fontWeight: 900, color: CREAM }}>{m.hand}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, fontWeight: 700 }}>
                      <span style={{ color: 'rgba(239,68,68,0.7)', textDecoration: 'line-through' }}>{m.userAction}</span>
                      <span style={{ color: DIM }}>→</span>
                      <span style={{ padding: '3px 10px', borderRadius: 6, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa' }}>{m.correctAction}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ width: '100%', padding: 28, background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 16, textAlign: 'center', marginBottom: 24 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#a78bfa', margin: 0 }}>Aucune erreur — session parfaite.</p>
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, width: '100%' }}>
              <button onClick={() => setShowSettings(v => !v)} style={{ flex: 1, padding: '15px 0', fontWeight: 600, borderRadius: 12, border: `1px solid ${BORDER}`, background: 'transparent', color: SILVER, fontSize: 13, cursor: 'pointer' }}>
                Paramètres
              </button>
              <button onClick={start} style={{ flex: 1, padding: '15px 0', fontWeight: 700, borderRadius: 12, border: 'none', background: GRAD, color: CREAM, fontSize: 14, cursor: 'pointer', boxShadow: '0 0 20px rgba(124,58,237,0.25)' }}>
                Rejouer →
              </button>
            </div>
          </div>
        )}

        {/* ══ QUIZ ════════════════════════════════════════════════ */}
        {mode === 'quiz' && quizScenario && (() => {
          const rk = `${quizScenario.heroPosition}_${quizScenario.stackSize}`;
          const range = GTO[rk];
          if (!range) return null;
          const btns = ['Fold', ...Object.keys(range).filter(k => k !== 'name')];
          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                {[
                  { label: 'Stack', val: `${quizScenario.stackSize}bb`, accent: CYAN, bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.25)' },
                  { label: 'Position', val: range.name[0] as string, accent: CREAM, bg: CARD_BG, border: BORDER },
                  { label: 'Situation', val: quizScenario.actionText, accent: SILVER, bg: CARD_BG, border: BORDER },
                ].map(({ label, val, accent, bg, border: b }) => (
                  <div key={label} style={{ background: bg, border: `1px solid ${b}`, padding: '8px 18px', borderRadius: 12, textAlign: 'center' }}>
                    <p style={{ fontSize: 8, color: DIM, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, margin: 0 }}>{label}</p>
                    <p style={{ fontSize: 16, fontWeight: 800, color: accent, margin: 0, lineHeight: 1.2 }}>{val}</p>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 720px', gap: 0, height: 'calc(100vh - 250px)' }}>
                {/* Left: table + actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
                  <div style={{ position: 'relative', flex: 1, minHeight: 0, background: 'transparent', border: 'none', borderRadius: 18, padding: '20px 32px', overflow: 'visible', display: 'flex', alignItems: 'center' }}>
                    <PokerTable scenario={quizScenario} />
                  </div>

                  {/* Grade feedback */}
                  <div style={{ height: 52, display: 'flex', alignItems: 'center' }}>
                    {quizPhase === 'revealed' && quizGrade && (
                      <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderRadius: 12, background: CARD_BG, borderLeft: `3px solid ${quizGrade.color}`, backdropFilter: 'blur(8px)' }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: quizGrade.color }}>{quizGrade.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: SILVER }}>+{quizGrade.pts} pts</span>
                        <span style={{ fontSize: 12, color: DIM }}>·</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: CREAM }}>Correct : {quizResults[quizResults.length - 1]?.correctAction}</span>
                        <span style={{ fontSize: 12, color: DIM }}>· Ta réponse : <span style={{ color: quizGrade.pts === 3 ? quizGrade.color : 'rgba(239,68,68,0.8)' }}>{quizUserAction}</span></span>
                      </div>
                    )}
                  </div>

                  {/* Action buttons or Next */}
                  {quizPhase === 'guessing' ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {btns.map(a => <button key={a} onClick={() => submitQuizAction(a)} style={actionBtn(a)}>{a}</button>)}
                    </div>
                  ) : (
                    <button onClick={nextQuizHand} style={{ width: '100%', padding: '14px 0', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', background: 'linear-gradient(135deg, #06b6d4, #4ade80)', color: BG, boxShadow: '0 0 20px rgba(6,182,212,0.25)' }}>
                      {quizIdx + 1 >= quizCount ? 'Voir les résultats →' : 'Suivant →'}
                    </button>
                  )}
                </div>

                {/* Séparateur */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 20px' }}>
                  <div style={{ width: 1, height: '70%', background: 'linear-gradient(to bottom, transparent, rgba(6,182,212,0.2) 30%, rgba(124,58,237,0.25) 70%, transparent)' }} />
                </div>
                {/* Right: range grid (locked until answered) */}
                <div style={{ height: '100%' }}>
                  {quizPhase === 'guessing' ? (
                    <div style={{ height: '100%', background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, backdropFilter: 'blur(8px)' }}>
                      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Lock size={22} color={DIM} />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: SILVER, margin: '0 0 6px' }}>Range masquée</p>
                        <p style={{ fontSize: 12, color: DIM, margin: 0 }}>Réponds d'abord, la range se révèle ensuite</p>
                      </div>
                    </div>
                  ) : (
                    <RangeGrid rk={rk} hand={quizScenario.gridHand} revealed={true} />
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ══ QUIZ SUMMARY ════════════════════════════════════════ */}
        {mode === 'quiz-summary' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 720, margin: '0 auto' }}>
            {/* Score card */}
            <div style={{ position: 'relative', width: '100%', background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 24, padding: '48px 32px', textAlign: 'center', marginBottom: 24, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, rgba(6,182,212,0.1) 0%, transparent 60%)', pointerEvents: 'none' }} />
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: DIM, marginBottom: 12 }}>Quiz terminé</p>
              <p style={{ fontSize: 88, fontWeight: 900, letterSpacing: '-3px', lineHeight: 1, margin: '0 0 8px', background: 'linear-gradient(135deg, #06b6d4, #4ade80)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {quizPts}
              </p>
              <p style={{ fontSize: 14, color: DIM, fontWeight: 600, margin: '0 0 4px' }}>points sur {quizCount * 3} possibles</p>
              <div style={{ display: 'flex', gap: 32, justifyContent: 'center', marginTop: 20 }}>
                {[
                  ['Parfait', quizResults.filter(r => r.pts === 3).length.toString()],
                  ['Proche', quizResults.filter(r => r.pts === 1).length.toString()],
                  ['Raté', quizResults.filter(r => r.pts === 0).length.toString()],
                  ['Best Streak', quizBestStreak.toString()],
                ].map(([label, val]) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 22, fontWeight: 900, color: CREAM, margin: '0 0 4px' }}>{val}</p>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: DIM, margin: 0 }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Results list */}
            <div style={{ width: '100%', background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 18, overflow: 'hidden', marginBottom: 24 }}>
              <div style={{ padding: '14px 24px', borderBottom: `1px solid ${BORDER}` }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: DIM, margin: 0 }}>Revue des mains</p>
              </div>
              {quizResults.map((r, i) => (
                <div key={i} style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: i < quizResults.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: `${r.color}18`, border: `1px solid ${r.color}40`, color: r.color }}>{r.label}</span>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', color: '#a78bfa' }}>{r.position}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', color: CYAN }}>{r.stack}bb</span>
                    </div>
                    <span style={{ fontSize: 16, fontWeight: 900, color: CREAM }}>{r.hand}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, fontWeight: 700 }}>
                    <span style={{ color: r.pts === 3 ? r.color : 'rgba(239,68,68,0.7)' }}>{r.userAction}</span>
                    {r.userAction !== r.correctAction && <><span style={{ color: DIM }}>→</span><span style={{ color: '#a78bfa' }}>{r.correctAction}</span></>}
                    <span style={{ color: r.color, minWidth: 40, textAlign: 'right' }}>+{r.pts} pts</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, width: '100%' }}>
              {drillQuizMode ? (
                <>
                  <button onClick={() => { setDrillQuizMode(false); start(); }} style={{ flex: 1, padding: '15px 0', fontWeight: 600, borderRadius: 12, border: `1px solid ${BORDER}`, background: 'transparent', color: SILVER, fontSize: 13, cursor: 'pointer' }}>
                    ← Retour au Drill
                  </button>
                  <button onClick={() => { setQuizPts(0); setQuizRounds(0); setQuizStreak(0); setQuizBestStreak(0); setQuizResults([]); setQuizUserAction(null); setQuizGrade(null); setScore(0); setMistakes([]); setIdx(0); setRevealed(false); setMode('training'); generate(); }} style={{ flex: 1, padding: '15px 0', fontWeight: 700, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #06b6d4, #4ade80)', color: BG, fontSize: 14, cursor: 'pointer', boxShadow: '0 0 20px rgba(6,182,212,0.2)' }}>
                    Rejouer en Quiz →
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setShowSettings(v => !v)} style={{ flex: 1, padding: '15px 0', fontWeight: 600, borderRadius: 12, border: `1px solid ${BORDER}`, background: 'transparent', color: SILVER, fontSize: 13, cursor: 'pointer' }}>
                    Paramètres
                  </button>
                  <button onClick={startQuiz} style={{ flex: 1, padding: '15px 0', fontWeight: 700, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #06b6d4, #4ade80)', color: BG, fontSize: 14, cursor: 'pointer', boxShadow: '0 0 20px rgba(6,182,212,0.2)' }}>
                    Rejouer le Quiz →
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ══ PLAYGROUND ══════════════════════════════════════════ */}
        {mode === 'playground' && (() => {
          /* custom range stats */
          const customStats = CUSTOM_ACTIONS
            .map(a => ({ action: a.id, label: a.label, combos: Object.entries(customMap).filter(([,v]) => v === a.id).reduce((s,[h]) => s + countCombos(h), 0), color: a.color, fg: a.fg }))
            .filter(s => s.combos > 0);
          const customTotal = customStats.reduce((s, x) => s + x.combos, 0);

          return (
            <div>
              {/* Header bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 99, border: '1px solid rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.08)' }}>
                    <Layers size={11} color="#4ade80" />
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#4ade80', letterSpacing: '0.12em' }}>RANGE EXPLORER</span>
                  </div>
                </div>

                {/* Mode tabs */}
                <div style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}` }}>
                  {([['explore', 'Explorer GTO'], ['custom', 'Range Custom']] as const).map(([id, label]) => {
                    const active = pgMode === id;
                    return (
                      <button key={id} onClick={() => setPgMode(id)}
                        style={{ padding: '7px 16px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all 0.15s', background: active ? (id === 'custom' ? 'rgba(124,58,237,0.18)' : 'rgba(74,222,128,0.12)') : 'transparent', color: active ? (id === 'custom' ? '#a78bfa' : '#4ade80') : SILVER }}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── EXPLORE MODE ── */}
              {pgMode === 'explore' && (
                <div>
                  {/* Position + stack selectors */}
                  <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {POSITIONS_LIST.map(p => {
                        const active = pgPos === p;
                        return (
                          <button key={p} onClick={() => { setPgPos(p); setPgFilter([]); setPgHover(null); }}
                            style={{ padding: '7px 16px', borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.12s', background: active ? VIOLET : 'transparent', border: `1px solid ${active ? VIOLET : 'rgba(124,58,237,0.2)'}`, color: active ? '#fff' : 'rgba(167,139,250,0.5)', boxShadow: active ? '0 0 12px rgba(124,58,237,0.28)' : 'none' }}>
                            {p}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ width: 1, height: 22, background: BORDER }} />
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {STACKS_LIST.map(s => {
                        const active = pgStack === s;
                        return (
                          <button key={s} onClick={() => { setPgStack(s); setPgFilter([]); setPgHover(null); }}
                            style={{ padding: '7px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.12s', background: active ? CYAN : 'transparent', border: `1px solid ${active ? CYAN : 'rgba(6,182,212,0.2)'}`, color: active ? BG : 'rgba(6,182,212,0.45)', boxShadow: active ? '0 0 10px rgba(6,182,212,0.22)' : 'none' }}>
                            {s}bb
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, height: 'calc(100vh - 340px)' }}>
                    {/* Stats panel */}
                    <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, backdropFilter: 'blur(8px)', overflow: 'hidden' }}>
                      <div>
                        <p style={{ fontSize: 9, fontWeight: 700, color: DIM, textTransform: 'uppercase', letterSpacing: '0.18em', margin: '0 0 3px' }}>Range sélectionnée</p>
                        <p style={{ fontSize: 14, fontWeight: 800, color: CREAM, margin: 0 }}>{pgRange?.name[0]} · {pgStack}bb</p>
                      </div>
                      <div style={{ width: '100%', height: 1, background: BORDER }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflowY: 'auto' }}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: DIM, textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>Combos par action</p>
                        {pgStats.map(({ action, combos, color }) => {
                          const pct = Math.round((combos / TOTAL_COMBOS) * 100 * 10) / 10;
                          const short = action.replace(/Raise \d\.\dbb/, 'Raise');
                          const isFiltered = pgFilter.includes(action);
                          const hasFilter = pgFilter.length > 0;
                          return (
                            <button key={action} onClick={() => setPgFilter(prev => prev.includes(action) ? prev.filter(a => a !== action) : [...prev, action])}
                              style={{ background: isFiltered ? `${color}15` : hasFilter ? 'transparent' : CARD_BG, border: `1px solid ${isFiltered ? color + '40' : BORDER}`, borderRadius: 10, padding: '8px 10px', cursor: 'pointer', transition: 'all 0.15s', opacity: hasFilter && !isFiltered ? 0.45 : 1, textAlign: 'left' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <div style={{ width: 6, height: 6, borderRadius: 1, background: color, flexShrink: 0 }} />
                                  <span style={{ fontSize: 11, fontWeight: 700, color: CREAM }}>{short}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: color }}>{combos}</span>
                                  <span style={{ fontSize: 10, color: DIM }}>{pct}%</span>
                                </div>
                              </div>
                              <div style={{ width: '100%', height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                                <div style={{ width: `${(combos / pgTotal) * 100}%`, height: '100%', background: color, borderRadius: 2 }} />
                              </div>
                            </button>
                          );
                        })}
                        {pgFilter.length > 0 && (
                          <button onClick={() => setPgFilter([])} style={{ fontSize: 10, fontWeight: 600, color: SILVER, background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 0', textAlign: 'left', opacity: 0.7 }}>Effacer les filtres ×</button>
                        )}
                      </div>
                      <div style={{ width: '100%', height: 1, background: BORDER }} />
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: SILVER }}>Total</span>
                          <span style={{ fontSize: 13, fontWeight: 800, color: CREAM }}>{pgTotal} <span style={{ fontSize: 10, color: DIM }}>/ {TOTAL_COMBOS}</span></span>
                        </div>
                        <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${(pgTotal / TOTAL_COMBOS) * 100}%`, height: '100%', background: GRAD, borderRadius: 2 }} />
                        </div>
                        <p style={{ fontSize: 10, color: DIM, margin: '4px 0 0', textAlign: 'right' }}>{Math.round((pgTotal / TOTAL_COMBOS) * 100)}% des mains</p>
                      </div>
                      <div style={{ padding: '8px 10px', borderRadius: 10, background: pgHover ? 'rgba(255,255,255,0.04)' : 'transparent', border: `1px solid ${pgHover ? BORDER : 'transparent'}`, transition: 'all 0.12s', minHeight: 50 }}>
                        {pgHover ? (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 18, fontWeight: 900, color: CREAM }}>{pgHover}</span>
                              <span style={{ fontSize: 10, fontWeight: 700, color: DIM }}>{pgHoverCombos} combos</span>
                            </div>
                            <p style={{ fontSize: 11, fontWeight: 600, margin: '2px 0 0', color: pgHoverAction ? (LEGEND_COLORS[pgHoverAction] || SILVER) : SILVER }}>{pgHoverAction || 'Fold / hors range'}</p>
                          </>
                        ) : (
                          <p style={{ fontSize: 10, color: DIM, margin: 0, fontStyle: 'italic' }}>Survole un combo pour les détails</p>
                        )}
                      </div>
                    </div>

                    {/* Grid */}
                    <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 14, backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, flexShrink: 0 }}>
                        {pgStats.map(({ action, color }) => {
                          const short = action.replace(/Raise \d\.\dbb/, 'Raise');
                          const isFiltered = pgFilter.includes(action);
                          return (
                            <button key={action} onClick={() => setPgFilter(prev => prev.includes(action) ? prev.filter(a => a !== action) : [...prev, action])}
                              style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 4, border: `1px solid ${isFiltered ? color + '80' : color + '33'}`, background: isFiltered ? `${color}25` : `${color}15`, cursor: 'pointer', transition: 'all 0.12s' }}>
                              <div style={{ width: 5, height: 5, borderRadius: 1, background: color, flexShrink: 0 }} />
                              <span style={{ fontSize: 8, fontWeight: 700, color: color === '#065f46' ? '#6ee7b7' : color === '#92400e' ? '#fde68a' : color }}>{short}</span>
                            </button>
                          );
                        })}
                      </div>
                      <div style={{ flex: 1, minHeight: 0 }}>
                        {pgRange
                          ? <PlaygroundGrid rk={pgRk} filter={pgFilter} hover={pgHover} setHover={setPgHover} />
                          : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: DIM }}>Aucune range pour cette combinaison</p></div>
                        }
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── CUSTOM MODE ── */}
              {pgMode === 'custom' && (
                <div>
                  {/* Toolbar */}
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
                    {/* Paint actions */}
                    <div style={{ display: 'flex', gap: 5, padding: '5px 8px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}` }}>
                      {CUSTOM_ACTIONS.map(a => {
                        const active = paintAction === a.id;
                        return (
                          <button key={a.id} onClick={() => setPaintAction(a.id)}
                            style={{ padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all 0.12s', background: active ? a.color : 'transparent', color: active ? a.fg : SILVER, boxShadow: active ? `0 0 10px ${a.color}55` : 'none' }}>
                            {a.label}
                          </button>
                        );
                      })}
                      <button onClick={() => setPaintAction('erase')}
                        style={{ padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all 0.12s', background: paintAction === 'erase' ? 'rgba(255,255,255,0.1)' : 'transparent', color: paintAction === 'erase' ? CREAM : SILVER, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Eraser size={12} /> Effacer
                      </button>
                    </div>

                    <div style={{ width: 1, height: 24, background: BORDER }} />

                    {/* Clear all */}
                    <button onClick={clearCustomRange} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: 'transparent', border: `1px solid ${BORDER}`, color: SILVER, transition: 'all 0.12s' }}>
                      <Trash2 size={12} /> Tout effacer
                    </button>

                    <div style={{ width: 1, height: 24, background: BORDER }} />

                    {/* Save */}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Nom de la range..." onKeyDown={e => e.key === 'Enter' && saveCustomRange()}
                        style={{ padding: '7px 12px', borderRadius: 8, fontSize: 12, background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, color: CREAM, outline: 'none', width: 200 }} />
                      <button onClick={saveCustomRange} disabled={!customName.trim()} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: customName.trim() ? 'pointer' : 'not-allowed', background: customName.trim() ? 'rgba(124,58,237,0.2)' : 'transparent', border: `1px solid ${customName.trim() ? 'rgba(124,58,237,0.4)' : BORDER}`, color: customName.trim() ? '#a78bfa' : DIM, transition: 'all 0.12s' }}>
                        <Save size={12} /> Sauvegarder
                      </button>
                    </div>

                    <div style={{ width: 1, height: 24, background: BORDER }} />

                    {/* Export / Import */}
                    <button onClick={exportCode} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: copyMsg ? 'rgba(74,222,128,0.12)' : 'transparent', border: `1px solid ${copyMsg ? 'rgba(74,222,128,0.4)' : BORDER}`, color: copyMsg ? '#4ade80' : SILVER, transition: 'all 0.15s' }}>
                      <Download size={12} /> {copyMsg ? 'Copié !' : 'Exporter'}
                    </button>
                    <button onClick={shareRange} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: 'transparent', border: `1px solid ${BORDER}`, color: SILVER, transition: 'all 0.15s' }}>
                      <Share2 size={12} /> Partager
                    </button>
                    <button onClick={() => setShowImport(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: showImport ? 'rgba(6,182,212,0.1)' : 'transparent', border: `1px solid ${showImport ? 'rgba(6,182,212,0.3)' : BORDER}`, color: showImport ? CYAN : SILVER, transition: 'all 0.15s' }}>
                      <Upload size={12} /> Importer
                    </button>
                    <button onClick={() => setShowSaved(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: showSaved ? 'rgba(124,58,237,0.1)' : 'transparent', border: `1px solid ${showSaved ? 'rgba(124,58,237,0.3)' : BORDER}`, color: showSaved ? '#a78bfa' : SILVER, transition: 'all 0.15s' }}>
                      <ChevronDown size={12} /> Mes ranges ({savedRanges.length})
                    </button>
                  </div>

                  {/* Import panel */}
                  {showImport && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, padding: '12px 16px', borderRadius: 12, background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)' }}>
                      <input value={importInput} onChange={e => setImportInput(e.target.value)} placeholder="Colle le code de range ici..." onKeyDown={e => e.key === 'Enter' && importCode()}
                        style={{ flex: 1, padding: '7px 12px', borderRadius: 8, fontSize: 12, background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, color: CREAM, outline: 'none', fontFamily: 'monospace' }} />
                      <button onClick={importCode} style={{ padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: CYAN, border: 'none', color: BG }}>Charger</button>
                      <button onClick={() => { setShowImport(false); setImportInput(''); }} style={{ padding: '7px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer', background: 'transparent', border: `1px solid ${BORDER}`, color: SILVER }}>✕</button>
                    </div>
                  )}

                  {/* Saved ranges panel */}
                  {showSaved && (
                    <div style={{ marginBottom: 12, padding: 14, borderRadius: 14, background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)' }}>
                      {savedRanges.length === 0 ? (
                        <p style={{ fontSize: 12, color: DIM, margin: 0, fontStyle: 'italic' }}>Aucune range sauvegardée</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {savedRanges.map(r => (
                            <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}>
                              <div>
                                <p style={{ fontSize: 13, fontWeight: 700, color: CREAM, margin: 0 }}>{r.name}</p>
                                <p style={{ fontSize: 10, color: DIM, margin: 0 }}>{Object.keys(r.comboMap).length} combos · {r.createdAt}</p>
                              </div>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button onClick={() => loadCustomRange(r)} style={{ padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.35)', color: '#a78bfa' }}>Charger</button>
                                <button onClick={() => deleteCustomRange(r.id)} style={{ padding: '5px 10px', borderRadius: 7, fontSize: 11, cursor: 'pointer', background: 'transparent', border: '1px solid rgba(239,68,68,0.2)', color: 'rgba(239,68,68,0.6)' }}>✕</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Editor: stats + grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16, height: 'calc(100vh - 370px)' }}>

                    {/* Left: stats + info */}
                    <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, backdropFilter: 'blur(8px)' }}>
                      <div>
                        <p style={{ fontSize: 9, fontWeight: 700, color: DIM, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 10px' }}>Combos placés</p>
                        {CUSTOM_ACTIONS.map(a => {
                          const count = Object.values(customMap).filter(v => v === a.id).length;
                          const combos = Object.entries(customMap).filter(([,v]) => v === a.id).reduce((s,[h]) => s + countCombos(h), 0);
                          if (!count) return null;
                          return (
                            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: 8, background: `${a.color}10`, border: `1px solid ${a.color}30`, marginBottom: 5 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ width: 6, height: 6, borderRadius: 1, background: a.color }} />
                                <span style={{ fontSize: 12, fontWeight: 700, color: a.fg }}>{a.label}</span>
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 700, color: a.color }}>{combos} combos</span>
                            </div>
                          );
                        })}
                        {customTotal === 0 && <p style={{ fontSize: 11, color: DIM, margin: 0, fontStyle: 'italic' }}>Aucun combo placé</p>}
                      </div>

                      {customTotal > 0 && (
                        <>
                          <div style={{ width: '100%', height: 1, background: BORDER }} />
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontSize: 11, color: SILVER }}>Total</span>
                              <span style={{ fontSize: 13, fontWeight: 800, color: CREAM }}>{customTotal} <span style={{ fontSize: 10, color: DIM }}>/ 1326</span></span>
                            </div>
                            <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ width: `${(customTotal / 1326) * 100}%`, height: '100%', background: GRAD, borderRadius: 2 }} />
                            </div>
                            <p style={{ fontSize: 10, color: DIM, margin: '4px 0 0', textAlign: 'right' }}>{Math.round((customTotal / 1326) * 100)}% des mains</p>
                          </div>
                        </>
                      )}

                      <div style={{ marginTop: 'auto', padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: DIM, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 6px' }}>Comment utiliser</p>
                        <p style={{ fontSize: 10, color: SILVER, margin: '0 0 3px', lineHeight: 1.5 }}>Sélectionne une action puis <strong style={{ color: CREAM }}>clique ou glisse</strong> sur les combos.</p>
                        <p style={{ fontSize: 10, color: SILVER, margin: 0, lineHeight: 1.5 }}>Cliquer deux fois sur un combo <strong style={{ color: CREAM }}>le retire</strong>.</p>
                        <p style={{ fontSize: 10, color: SILVER, margin: '4px 0 0', lineHeight: 1.5 }}>Exporte un <strong style={{ color: CREAM }}>code</strong> à partager avec tes élèves.</p>
                      </div>
                    </div>

                    {/* Right: editable grid */}
                    <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 14, backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {/* Legend */}
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flexShrink: 0 }}>
                        {CUSTOM_ACTIONS.filter(a => Object.values(customMap).includes(a.id)).map(a => (
                          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 4, background: `${a.color}20`, border: `1px solid ${a.color}40` }}>
                            <div style={{ width: 5, height: 5, borderRadius: 1, background: a.color }} />
                            <span style={{ fontSize: 8, fontWeight: 700, color: a.fg }}>{a.label}</span>
                          </div>
                        ))}
                        {Object.keys(customMap).length === 0 && (
                          <p style={{ fontSize: 10, color: DIM, margin: 0, fontStyle: 'italic' }}>Commence à peindre tes combos →</p>
                        )}
                      </div>
                      <div style={{ flex: 1, minHeight: 0 }}>
                        <CustomRangeGrid comboMap={customMap} paintAction={paintAction} onPaint={paintCombo} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </main>
    </div>
  );
}

/* ── Shared config components ─────────────────────────────────── */
function ConfigPositions({ positions, setPositions }: { positions: Position[]; setPositions: React.Dispatch<React.SetStateAction<Position[]>> }) {
  return (
    <div style={{ position: 'relative', background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 24, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 0% 0%, rgba(124,58,237,0.08) 0%, transparent 60%)', pointerEvents: 'none' }} />
      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(167,139,250,0.6)', marginBottom: 16 }}>Positions</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {POSITIONS_LIST.map(p => {
          const active = positions.includes(p);
          return (
            <button key={p} onClick={() => setPositions(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
              style={{ padding: '9px 20px', borderRadius: 99, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', background: active ? VIOLET : 'transparent', border: `1px solid ${active ? VIOLET : 'rgba(124,58,237,0.2)'}`, color: active ? '#fff' : 'rgba(167,139,250,0.5)', boxShadow: active ? '0 0 14px rgba(124,58,237,0.3)' : 'none' }}>
              {p}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ConfigStacks({ stacks, setStacks }: { stacks: number[]; setStacks: React.Dispatch<React.SetStateAction<number[]>> }) {
  return (
    <div style={{ position: 'relative', background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 24, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 100% 0%, rgba(6,182,212,0.07) 0%, transparent 60%)', pointerEvents: 'none' }} />
      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(6,182,212,0.6)', marginBottom: 16 }}>Profondeur de tapis</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {STACKS_LIST.map(s => {
          const active = stacks.includes(s);
          return (
            <button key={s} onClick={() => setStacks(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
              style={{ padding: '9px 18px', borderRadius: 99, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', background: active ? CYAN : 'transparent', border: `1px solid ${active ? CYAN : 'rgba(6,182,212,0.2)'}`, color: active ? BG : 'rgba(6,182,212,0.45)', boxShadow: active ? '0 0 14px rgba(6,182,212,0.25)' : 'none' }}>
              {s}bb
            </button>
          );
        })}
        <button onClick={() => setStacks([...STACKS_LIST])}
          style={{ padding: '9px 18px', borderRadius: 99, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: 'transparent', border: '1px solid rgba(6,182,212,0.2)', color: 'rgba(6,182,212,0.45)', transition: 'all 0.15s' }}>
          Tous
        </button>
      </div>
      {stacks.length > 1 && <p style={{ fontSize: 11, marginTop: 12, color: DIM }}>Randomisé entre {stacks.join(', ')} bb</p>}
    </div>
  );
}

function ConfigCount({ count, setCount, options }: { count: number; setCount: (n: number) => void; options: number[] }) {
  return (
    <div style={{ position: 'relative', background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 24, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 100%, rgba(124,58,237,0.06) 0%, transparent 60%)', pointerEvents: 'none' }} />
      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(124,58,237,0.5)', marginBottom: 16 }}>Nombre de mains</p>
      <div style={{ display: 'flex', gap: 8 }}>
        {options.map(n => {
          const active = count === n;
          return (
            <button key={n} onClick={() => setCount(n)}
              style={{ padding: '9px 20px', borderRadius: 99, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', background: active ? GRAD : 'transparent', border: `1px solid ${active ? 'transparent' : 'rgba(124,58,237,0.2)'}`, color: active ? '#fff' : 'rgba(124,58,237,0.45)', boxShadow: active ? '0 0 18px rgba(124,58,237,0.3)' : 'none' }}>
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
