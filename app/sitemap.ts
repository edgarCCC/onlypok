import type { MetadataRoute } from 'next'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://onlypok.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`,                        changeFrequency: 'weekly',  priority: 1 },
    { url: `${BASE_URL}/formations`,              changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE_URL}/coaches`,                 changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE_URL}/trainer`,                 changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/trainer/ranges`,          changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/trainer/equity`,          changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/trainer/quiz`,            changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/tracker`,                 changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/register`,                changeFrequency: 'yearly',  priority: 0.5 },
    { url: `${BASE_URL}/become-coach`,            changeFrequency: 'yearly',  priority: 0.5 },
    { url: `${BASE_URL}/legal/mentions-legales`,  changeFrequency: 'yearly',  priority: 0.1 },
    { url: `${BASE_URL}/legal/cgu`,               changeFrequency: 'yearly',  priority: 0.1 },
    { url: `${BASE_URL}/legal/confidentialite`,   changeFrequency: 'yearly',  priority: 0.1 },
    { url: `${BASE_URL}/legal/cookies`,           changeFrequency: 'yearly',  priority: 0.1 },
  ]

  try {
    const admin = createAdminSupabaseClient()
    const { data: formations } = await admin
      .from('formations')
      .select('id')
      .eq('published', true)
      .limit(500)

    const formationRoutes: MetadataRoute.Sitemap = (formations ?? []).map((f: { id: string }) => ({
      url: `${BASE_URL}/formations/${f.id}`,
      changeFrequency: 'weekly',
      priority: 0.8,
    }))

    return [...staticRoutes, ...formationRoutes]
  } catch {
    return staticRoutes
  }
}
