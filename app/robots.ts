import type { MetadataRoute } from 'next'
import { PROTECTED_ROUTES } from '@/lib/routes'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://onlypok.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Slash final : '/coach/' ne bloque pas /coaches, '/train/' ne bloque pas /trainer ;
        // '$' (fin d'URL, RFC 9309) couvre aussi l'URL nue de chaque route protégée.
        disallow: ['/api/', ...PROTECTED_ROUTES.flatMap((route) => [`${route}/`, `${route}$`])],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
