import { test, expect } from '@playwright/test'
import { COACH_TABS, isTabActive } from '../../app/(coach)/coach-nav'
import { accountLinks } from '../../app/(coach)/CoachAccountMenu'

/* Onglets de l'espace coach. Tests unitaires, sans navigateur ni serveur :
   E2E_BASE_URL=http://127.0.0.1:9 npx playwright test coach-nav --reporter=list */

function tabNamed(label: string) {
  const tab = COACH_TABS.find((candidate) => candidate.label === label)
  if (!tab) throw new Error(`Onglet absent : ${label}`)
  return tab
}

test.describe('Navigation coach', () => {
  test('Trainer et Tracker ouvrent leurs outils', () => {
    expect(tabNamed('Trainer').href).toBe('/coach/trainer')
    expect(tabNamed('Tracker').href).toBe('/tracker')
  })

  test('Trainer reste actif sur les pages du trainer, côté coach ou non', () => {
    for (const pathname of ['/coach/trainer', '/coach/trainer/ranges', '/trainer', '/trainer/equity']) {
      expect(isTabActive(tabNamed('Trainer'), pathname), pathname).toBe(true)
    }
    expect(isTabActive(tabNamed('Trainer'), '/coach/dashboard')).toBe(false)
  })

  test('Tracker reste actif sur les pages du tracker', () => {
    for (const pathname of ['/tracker', '/tracker/stats']) {
      expect(isTabActive(tabNamed('Tracker'), pathname), pathname).toBe(true)
    }
    expect(isTabActive(tabNamed('Tracker'), '/trainer')).toBe(false)
  })

  test('un lien du menu compte ne double jamais un onglet', () => {
    const tabHrefs = new Set(COACH_TABS.map((tab) => tab.href))
    const doubles = accountLinks('coach-1').flatMap((section) => section.links).filter((link) => tabHrefs.has(link.href))
    expect(doubles).toEqual([])
  })
})
