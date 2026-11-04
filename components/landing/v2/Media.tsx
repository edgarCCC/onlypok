'use client'
// Avatar et vignette avec repli (initiales, mot de remplacement) quand l'image ne charge pas : l'état d'échec est client.
import Image from 'next/image'
import { useState } from 'react'
import { initials } from './format'

/* Seuls ces hôtes sont déclarés dans next.config.ts (images.remotePatterns) ; les autres URL sont servies telles quelles. */
const OPTIMIZED_SRC = /^https:\/\/([^/]+\.supabase\.co\/storage\/v1\/object\/public\/|img\.youtube\.com\/vi\/)/

export const AVATAR_SIZE = 40
export const THUMB_WIDTH = 160
export const THUMB_HEIGHT = 90

interface AvatarProps {
  src: string | null
  name: string | null
}

/** Avatar de 40 px, initiales par graphème en repli ; décoratif (le pseudo est le titre de la ligne). */
export function Avatar({ src, name }: AvatarProps) {
  const [failed, setFailed] = useState(false)
  const showImage = src !== null && src.length > 0 && !failed
  return (
    <span className="ui-avatar" aria-hidden="true">
      {showImage
        ? <Image src={src} alt="" width={AVATAR_SIZE} height={AVATAR_SIZE} unoptimized={!OPTIMIZED_SRC.test(src)} onError={() => setFailed(true)} />
        : initials(name)}
    </span>
  )
}

interface ThumbProps {
  src: string | null
  /** Mot de remplacement sans image : « Formation », « Vidéo ». */
  label: string
}

/** Vignette 16/9 d'un contenu, sous la ligne de flottaison (chargement différé), masquée sous 560 px. */
export function Thumb({ src, label }: ThumbProps) {
  const [failed, setFailed] = useState(false)
  const showImage = src !== null && src.length > 0 && !failed
  return (
    <span className="lp-thumb" aria-hidden="true">
      {showImage
        ? <Image src={src} alt="" width={THUMB_WIDTH} height={THUMB_HEIGHT} loading="lazy" unoptimized={!OPTIMIZED_SRC.test(src)} onError={() => setFailed(true)} />
        : label}
    </span>
  )
}
