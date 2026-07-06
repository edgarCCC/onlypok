import { test, expect } from '@playwright/test'

test.describe('Pages publiques', () => {
  test('landing affiche le hero et la navbar', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/OnlyPok/i)
    await expect(page.locator('h1').first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'ONLYPOK' })).toBeVisible()
  })

  test('landing mobile — pas de scroll horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    const { vw, sw } = await page.evaluate(() => ({
      vw: document.documentElement.clientWidth,
      sw: document.documentElement.scrollWidth,
    }))
    expect(sw).toBeLessThanOrEqual(vw + 2)
  })

  test('marketplace formations liste les cartes', async ({ page }) => {
    await page.goto('/formations')
    await expect(page).toHaveTitle(/Formations poker/i)
  })

  test('listing coachs se charge', async ({ page }) => {
    await page.goto('/coaches')
    await expect(page).toHaveTitle(/Coachs poker/i)
    await expect(page.getByRole('heading', { name: /coachs/i }).first()).toBeVisible()
  })

  test('trainer hub accessible', async ({ page }) => {
    await page.goto('/trainer')
    await expect(page).toHaveTitle(/Trainer poker/i)
  })

  test('pages légales accessibles depuis le footer', async ({ page }) => {
    await page.goto('/legal/cgu')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Conditions générales/i)
    await page.goto('/legal/mentions-legales')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Mentions légales/i)
    await page.goto('/legal/confidentialite')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/confidentialité/i)
  })

  test('page 404 personnalisée', async ({ page }) => {
    await page.goto('/cette-page-nexiste-pas')
    await expect(page.getByText('Erreur 404')).toBeVisible()
    await expect(page.getByRole('link', { name: /Retour à l'accueil/i })).toBeVisible()
  })

  test('robots.txt et sitemap.xml servis', async ({ request }) => {
    const robots = await request.get('/robots.txt')
    expect(robots.ok()).toBeTruthy()
    expect(await robots.text()).toContain('sitemap')
    const sitemap = await request.get('/sitemap.xml')
    expect(sitemap.ok()).toBeTruthy()
  })
})
