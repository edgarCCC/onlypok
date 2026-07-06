import { test, expect } from '@playwright/test'

test.describe('Authentification', () => {
  test('login affiche une erreur avec de mauvais identifiants', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('toi@exemple.com').fill('inexistant@test.com')
    await page.getByPlaceholder('••••••••').fill('mauvais-mot-de-passe')
    await page.getByRole('button', { name: /Accéder à mon espace/i }).click()
    // filter() exclut le route-announcer Next.js qui a aussi role="alert"
    await expect(page.getByRole('alert').filter({ hasText: /incorrect/i })).toBeVisible({ timeout: 15000 })
  })

  test('lien mot de passe oublié → page forgot-password', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: /Mot de passe oublié/i }).click()
    // timeout large : premier hit = compilation à la volée en dev
    await expect(page).toHaveURL(/\/forgot-password/, { timeout: 15000 })
    await expect(page.getByRole('heading', { name: /Mot de passe oublié/i })).toBeVisible()
    await expect(page.getByPlaceholder('toi@exemple.com')).toBeVisible()
  })

  test('reset-password sans lien valide affiche « lien invalide »', async ({ page }) => {
    await page.goto('/reset-password')
    await expect(page.getByRole('heading', { name: /Lien invalide ou expiré/i })).toBeVisible({ timeout: 8000 })
    await expect(page.getByRole('link', { name: /Demander un nouveau lien/i })).toBeVisible()
  })

  test('login → lien inscription élève', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: /Créer un compte élève/i }).click()
    await expect(page).toHaveURL(/\/register/)
  })
})
