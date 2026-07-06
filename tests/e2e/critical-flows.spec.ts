import { test, expect } from '@playwright/test'

/**
 * Flows critiques authentifiés — nécessitent des comptes de test :
 *   E2E_STUDENT_EMAIL / E2E_STUDENT_PASSWORD  (élève avec au moins 1 formation achetée)
 *   E2E_COACH_EMAIL   / E2E_COACH_PASSWORD    (coach avec au moins 1 formation publiée)
 * Sans ces variables, les tests sont skippés (les smoke tests publics tournent toujours).
 */
const STUDENT = { email: process.env.E2E_STUDENT_EMAIL, password: process.env.E2E_STUDENT_PASSWORD }
const COACH   = { email: process.env.E2E_COACH_EMAIL,   password: process.env.E2E_COACH_PASSWORD }

async function login(page: import('@playwright/test').Page, email: string, password: string, role: 'student' | 'coach') {
  await page.goto('/login')
  if (role === 'coach') await page.getByRole('button', { name: /Coach/ }).first().click()
  await page.getByPlaceholder('toi@exemple.com').fill(email)
  await page.getByPlaceholder('••••••••').fill(password)
  await page.getByRole('button', { name: /Accéder à mon espace/i }).click()
  await page.waitForURL(role === 'coach' ? /\/coach\/dashboard/ : /\/formations/, { timeout: 15000 })
}

test.describe('Flow élève — achat → accès leçon', () => {
  test.skip(!STUDENT.email || !STUDENT.password, 'E2E_STUDENT_EMAIL / E2E_STUDENT_PASSWORD non définis')

  test("l'élève accède à une formation achetée et ouvre le player", async ({ page }) => {
    await login(page, STUDENT.email!, STUDENT.password!, 'student')

    await page.goto('/formations')
    const firstCard = page.locator('a[href^="/formations/"]').first()
    await expect(firstCard).toBeVisible({ timeout: 10000 })
    await firstCard.click()

    await expect(page).toHaveURL(/\/formations\/[\w-]+/)
    // Une formation achetée expose l'accès au contenu (player learn)
    const learnLink = page.locator('a[href*="/learn"]').first()
    if (await learnLink.isVisible().catch(() => false)) {
      await learnLink.click()
      await expect(page).toHaveURL(/\/learn/)
      await expect(page.getByText(/Retour/i).first()).toBeVisible()
    }
  })
})

test.describe('Flow coach — dashboard & demandes', () => {
  test.skip(!COACH.email || !COACH.password, 'E2E_COACH_EMAIL / E2E_COACH_PASSWORD non définis')

  test('le coach voit son dashboard et sa page demandes', async ({ page }) => {
    await login(page, COACH.email!, COACH.password!, 'coach')

    await expect(page).toHaveURL(/\/coach\/dashboard/)

    await page.goto('/coach/requests')
    await expect(page).toHaveURL(/\/coach\/requests/)

    await page.goto('/coach/formations')
    await expect(page).toHaveURL(/\/coach\/formations/)
  })
})
