import type { MetadataRoute } from 'next'
import { PUBLIC_ROUTES } from '@/lib/routes'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://onlypok.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = PUBLIC_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: `${BASE_URL}${path}`,
    changeFrequency,
    priority,
  }))

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
