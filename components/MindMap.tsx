'use client'
import { useEffect, useState } from 'react'

/* ─── Palette per branch index ─── */
const PALETTE = [
  { bg: 'rgba(124,58,237,0.22)', border: 'rgba(124,58,237,0.55)', text: '#d8b4fe', line: '#7c3aed' },
  { bg: 'rgba(6,182,212,0.18)',  border: 'rgba(6,182,212,0.5)',   text: '#67e8f9', line: '#06b6d4' },
  { bg: 'rgba(52,211,153,0.18)', border: 'rgba(52,211,153,0.5)', text: '#6ee7b7', line: '#34d399' },
  { bg: 'rgba(245,158,11,0.18)', border: 'rgba(245,158,11,0.5)', text: '#fcd34d', line: '#f59e0b' },
  { bg: 'rgba(225,29,72,0.18)',  border: 'rgba(225,29,72,0.5)',  text: '#fca5a5', line: '#e11d48' },
  { bg: 'rgba(96,165,250,0.18)', border: 'rgba(96,165,250,0.5)', text: '#93c5fd', line: '#60a5fa' },
]
const ROOT_P = { bg: 'rgba(255,255,255,0.07)', border: 'rgba(255,255,255,0.18)', text: '#EDEDEF', line: '#ffffff50' }

/* ─── Types ─── */
interface MNode { content: string; depth: number; children: MNode[]; colorIdx: number }
interface PNode { node: MNode; x: number; y: number; w: number; h: number; parentIdx: number | null }

/* ─── Parser ─── */
function parseMd(md: string): MNode | null {
  const lines = md.split('\n').map(l => l.trim()).filter(Boolean)
  const root: MNode = { content: '', depth: -1, children: [], colorIdx: -1 }
  const stack: MNode[] = [root]

  for (const line of lines) {
    let depth = -1, content = ''
    if (/^# [^#]/.test(line))  { depth = 0; content = line.replace(/^# /, '') }
    else if (/^## /.test(line)) { depth = 1; content = line.replace(/^## /, '') }
    else if (/^[-*+] /.test(line)) { depth = 2; content = line.replace(/^[-*+] /, '') }
    // Strip any leftover markdown symbols or emojis
    content = content.replace(/[#*_`]/g, '').trim()
    if (depth < 0 || !content) continue

    const node: MNode = { content, depth, children: [], colorIdx: -1 }
    while (stack.length > 1 && stack[stack.length - 1].depth >= depth) stack.pop()
    stack[stack.length - 1].children.push(node)
    stack.push(node)
  }

  const main = root.children[0]
  if (!main) return null
  main.children.forEach((child, i) => {
    child.colorIdx = i % PALETTE.length
    child.children.forEach(gc => { gc.colorIdx = i % PALETTE.length })
  })
  return main
}

/* ─── Layout constants ─── */
const NH = 38      // node height
const HGAP = 64    // horizontal gap between levels
const VGAP = 12    // vertical gap between siblings
const FONT_W = 7.8  // px per char at 13px — slightly generous so text never overflows
const PAD_X = 18    // horizontal padding inside node

function nodeW(content: string) {
  // No max cap — box always fits its text
  return Math.max(80, content.length * FONT_W + PAD_X * 2)
}

function subtreeH(node: MNode): number {
  if (!node.children.length) return NH
  return node.children.reduce((s, c) => s + subtreeH(c), 0) + VGAP * (node.children.length - 1)
}

function layout(node: MNode, x: number, cy: number, parentIdx: number | null, acc: PNode[]): void {
  const w = nodeW(node.content)
  const idx = acc.length
  acc.push({ node, x, y: cy - NH / 2, w, h: NH, parentIdx })

  if (!node.children.length) return

  const childX = x + w + HGAP
  const total = node.children.reduce((s, c) => s + subtreeH(c), 0) + VGAP * (node.children.length - 1)
  let curY = cy - total / 2

  for (const child of node.children) {
    const ch = subtreeH(child)
    layout(child, childX, curY + ch / 2, idx, acc)
    curY += ch + VGAP
  }
}

/* ─── Renderer ─── */
export default function MindMap({ markdown }: { markdown: string }) {
  const [placed, setPlaced] = useState<PNode[]>([])
  const [vb, setVb] = useState('0 0 800 500')

  useEffect(() => {
    const tree = parseMd(markdown)
    if (!tree) return

    const acc: PNode[] = []
    layout(tree, 0, 0, null, acc)
    if (!acc.length) return

    const pad = 24
    const minX = Math.min(...acc.map(n => n.x)) - pad
    const minY = Math.min(...acc.map(n => n.y)) - pad
    const maxX = Math.max(...acc.map(n => n.x + n.w)) + pad
    const maxY = Math.max(...acc.map(n => n.y + n.h)) + pad

    setPlaced(acc.map(n => ({ ...n, x: n.x - minX, y: n.y - minY })))
    setVb(`0 0 ${maxX - minX} ${maxY - minY}`)
  }, [markdown])

  return (
    <svg viewBox={vb} style={{ width: '100%', height: '100%' }} preserveAspectRatio="xMidYMid meet">
      <defs>
        {PALETTE.map((p, i) => (
          <filter key={i} id={`glow${i}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        ))}
      </defs>

      {/* Edges */}
      {placed.map((pn, i) => {
        if (pn.parentIdx === null) return null
        const parent = placed[pn.parentIdx]
        const px = parent.x + parent.w
        const py = parent.y + parent.h / 2
        const cx2 = pn.x
        const cy2 = pn.y + pn.h / 2
        const mx = (px + cx2) / 2
        const pal = pn.node.colorIdx >= 0 ? PALETTE[pn.node.colorIdx] : ROOT_P
        return (
          <path
            key={`e${i}`}
            d={`M ${px} ${py} C ${mx} ${py}, ${mx} ${cy2}, ${cx2} ${cy2}`}
            fill="none"
            stroke={pal.line}
            strokeWidth={1.8}
            strokeOpacity={0.55}
          />
        )
      })}

      {/* Nodes */}
      {placed.map((pn, i) => {
        const pal = pn.node.depth === 0 ? ROOT_P : (PALETTE[pn.node.colorIdx] ?? PALETTE[0])
        const rx = pn.node.depth === 0 ? 14 : pn.node.depth === 1 ? 10 : 7
        const fs = pn.node.depth === 0 ? 14 : pn.node.depth === 1 ? 12 : 11
        const fw = pn.node.depth === 0 ? 700 : pn.node.depth === 1 ? 600 : 400
        const label = pn.node.content

        return (
          <g key={`n${i}`}>
            {/* Glow behind depth-0 and depth-1 nodes */}
            {pn.node.depth <= 1 && (
              <rect
                x={pn.x - 2} y={pn.y - 2}
                width={pn.w + 4} height={pn.h + 4}
                rx={rx + 2}
                fill={pal.line}
                opacity={0.08}
                style={{ filter: 'blur(6px)' }}
              />
            )}
            <rect
              x={pn.x} y={pn.y}
              width={pn.w} height={pn.h}
              rx={rx}
              fill={pal.bg}
              stroke={pal.border}
              strokeWidth={1}
            />
            <text
              x={pn.x + pn.w / 2}
              y={pn.y + pn.h / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={pal.text}
              fontSize={fs}
              fontWeight={fw}
              fontFamily="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif"
            >
              {label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
