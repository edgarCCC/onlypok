import { test, expect } from '@playwright/test'
import { homeForRole, isAuthRoute, safeNext, withNext } from '../../lib/auth-redirect'

/* Retour à la page d'origine après connexion (N2).
   Les deux premiers blocs sont unitaires (ni navigateur ni serveur) ; exécution
   isolée sans démarrer le dev server :
   E2E_BASE_URL=http://127.0.0.1:9 npx playwright test auth-redirect --grep-invert "serveur requis" --reporter=list
   Le dernier bloc interroge le proxy et tourne avec la suite e2e habituelle. */

test.describe('safeNext — n’accepte qu’un chemin interne', () => {
  const ACCEPTED = [
    '/',
    '/formations',
    '/formations/abc',
    '/formations/abc?pack=1',
    '/formations/abc?pack=1#tarifs',
    '/coach/dashboard',
    '/schedule?tab=upcoming&x=2',
    '/formations/%2F%2Fevil.com',
  ]
  for (const value of ACCEPTED) {
    test(`accepte ${JSON.stringify(value)}`, () => {
      expect(safeNext(value)).toBe(value)
    })
  }

  const REJECTED: Array<string | null | undefined> = [
    null, undefined, '',
    'formations', 'evil.com/',
    'https://evil.com', 'http://evil.com/formations',
    '//evil.com', '///evil.com', '/\\evil.com', '/\\\\evil.com', '\\\\evil.com',
    '/..//evil.com',
    'javascript:alert(1)', 'data:text/html,hello', 'mailto:a@b.c',
    '/\n//evil.com', '/\t/evil.com', '/formations\r\nLocation: https://evil.com',
    ' /formations', '/formations abc', '/formations\\evil', '/\u0000',
    '/' + 'a'.repeat(2048),
  ]
  for (const value of REJECTED) {
    test(`refuse ${JSON.stringify(value)}`, () => {
      expect(safeNext(value)).toBeNull()
    })
  }

  test('normalise « . » et « .. » sans sortir de l’origine', () => {
    expect(safeNext('/formations/./abc')).toBe('/formations/abc')
    expect(safeNext('/a/../formations/abc?pack=1')).toBe('/formations/abc?pack=1')
  })
})

test.describe('isAuthRoute, homeForRole, withNext', () => {
  test('isAuthRoute reconnaît /login et /register, query comprise', () => {
    expect(isAuthRoute('/login')).toBe(true)
    expect(isAuthRoute('/login/')).toBe(true)
    expect(isAuthRoute('/register?next=%2Fformations')).toBe(true)
    expect(isAuthRoute('/logout')).toBe(false)
    expect(isAuthRoute('/formations')).toBe(false)
  })

  test('homeForRole : admin → /admin, coach → /coach/dashboard, sinon /formations', () => {
    expect(homeForRole('admin')).toBe('/admin')
    expect(homeForRole('coach')).toBe('/coach/dashboard')
    expect(homeForRole('student')).toBe('/formations')
    expect(homeForRole(undefined)).toBe('/formations')
  })

  test('withNext encode `next` et laisse le lien nu sans `next`', () => {
    expect(withNext('/login', '/formations/abc?pack=1')).toBe('/login?next=%2Fformations%2Fabc%3Fpack%3D1')
    expect(withNext('/register', null)).toBe('/register')
  })
})

test.describe('Proxy — visiteur sur une route protégée (serveur requis)', () => {
  test('redirige vers /login?next=<chemin + query d’origine>', async ({ request }) => {
    const res = await request.get('/schedule?tab=upcoming', { maxRedirects: 0 })
    expect(res.status()).toBe(307)
    const location = new URL(res.headers()['location'], 'http://localhost')
    expect(location.pathname).toBe('/login')
    expect(location.searchParams.get('next')).toBe('/schedule?tab=upcoming')
  })

  test('le trainer demande un compte : le visiteur arrive sur la création de compte', async ({ request }) => {
    const res = await request.get('/trainer/ranges?share=abc', { maxRedirects: 0 })
    expect(res.status()).toBe(307)
    const location = new URL(res.headers()['location'], 'http://localhost')
    expect(location.pathname).toBe('/register')
    expect(location.searchParams.get('next')).toBe('/trainer/ranges?share=abc')
  })

  test('le tracker demande un compte : le visiteur arrive sur la création de compte', async ({ request }) => {
    const res = await request.get('/tracker/stats', { maxRedirects: 0 })
    expect(res.status()).toBe(307)
    const location = new URL(res.headers()['location'], 'http://localhost')
    expect(location.pathname).toBe('/register')
    expect(location.searchParams.get('next')).toBe('/tracker/stats')
  })

  test('le lecteur /formations/<id>/learn garde sa cible', async ({ request }) => {
    const res = await request.get('/formations/abc/learn', { maxRedirects: 0 })
    expect(res.status()).toBe(307)
    expect(new URL(res.headers()['location'], 'http://localhost').searchParams.get('next')).toBe('/formations/abc/learn')
  })
})
