import { test, expect } from '@playwright/test'
import { allowedOrigins, getAppUrl, resolveAppOrigin, FALLBACK_APP_URL, LOCAL_APP_URL } from '../../lib/app-origin'

/* Origine des URL de retour Stripe (header Origin filtré). Tests unitaires sans
   navigateur ni serveur, env injecté :
   E2E_BASE_URL=http://127.0.0.1:9 npx playwright test app-origin --grep-invert "serveur requis" --reporter=list */

const req = (origin: string | null) =>
  new Request('http://onlypok.test/api/stripe/checkout', { method: 'POST', headers: origin === null ? {} : { Origin: origin } })

const PROD = {
  VERCEL_ENV: 'production', NEXT_PUBLIC_APP_URL: 'https://onlypok.com',
  VERCEL_URL: 'onlypok-abc123.vercel.app', VERCEL_BRANCH_URL: 'onlypok-git-main.vercel.app',
}
const PREVIEW = {
  VERCEL_ENV: 'preview', NEXT_PUBLIC_APP_URL: 'https://onlypok.com',
  VERCEL_URL: 'onlypok-git-feat-x-edgar.vercel.app', VERCEL_BRANCH_URL: 'onlypok-git-feat-x.vercel.app',
}
const LOCAL = { NEXT_PUBLIC_APP_URL: 'http://localhost:3000' } // .env.local typique : pas de VERCEL_ENV

test('origine autorisée conservée telle quelle : les URL de retour ne changent pas', () => {
  expect(resolveAppOrigin(req('https://onlypok.com'), PROD)).toBe('https://onlypok.com')
  expect(resolveAppOrigin(req('https://onlypok.com'), { ...PROD, NEXT_PUBLIC_APP_URL: 'https://onlypok.com/' })).toBe('https://onlypok.com')
  const origin = resolveAppOrigin(req('https://onlypok.com'), PROD)
  expect(`${origin}/schedule?payment=success&session_id={CHECKOUT_SESSION_ID}`)
    .toBe('https://onlypok.com/schedule?payment=success&session_id={CHECKOUT_SESSION_ID}')
  expect(getAppUrl(PROD)).toBe('https://onlypok.com')
  expect(getAppUrl({ NEXT_PUBLIC_APP_URL: 'https://onlypok.com//' })).toBe('https://onlypok.com')
})

test('origine étrangère (ou déguisée, ou localhost en production) remplacée par NEXT_PUBLIC_APP_URL', () => {
  for (const origin of [
    'https://evil.example', 'https://onlypok.com.evil.example', 'https://onlypok.com@evil.example',
    'http://onlypok.com', 'https://onlypok.com:8443', 'null', 'onlypok.com', 'javascript:alert(1)',
    'http://localhost:3000', 'http://127.0.0.1:3000',
  ]) {
    expect(resolveAppOrigin(req(origin), PROD), origin).toBe('https://onlypok.com')
  }
})

test('Origin absent → NEXT_PUBLIC_APP_URL ; sans elle en production → repli du domaine Vercel', () => {
  expect(resolveAppOrigin(req(null), PROD)).toBe('https://onlypok.com')
  expect(resolveAppOrigin(req(null), { VERCEL_ENV: 'production' })).toBe(FALLBACK_APP_URL)
  expect(resolveAppOrigin(req(null), { VERCEL_ENV: 'production', NEXT_PUBLIC_APP_URL: '   ' })).toBe(FALLBACK_APP_URL)
})

test('en local (sans VERCEL_ENV) : localhost et 127.0.0.1 acceptés sur tout port, dev server en repli', () => {
  expect(resolveAppOrigin(req('http://localhost:3000'), LOCAL)).toBe('http://localhost:3000')
  expect(resolveAppOrigin(req('http://127.0.0.1:3999'), LOCAL)).toBe('http://127.0.0.1:3999')
  expect(resolveAppOrigin(req('https://localhost:8443'), {})).toBe('https://localhost:8443')
  expect(resolveAppOrigin(req('https://evil.example'), LOCAL)).toBe('http://localhost:3000')
  expect(resolveAppOrigin(req('https://evil.example'), {})).toBe(LOCAL_APP_URL)
  expect(resolveAppOrigin(req(null), {})).toBe(LOCAL_APP_URL)
})

test('preview Vercel : VERCEL_URL et VERCEL_BRANCH_URL acceptés en https seulement, autres previews refusées', () => {
  expect(allowedOrigins(PREVIEW)).toEqual([
    'https://onlypok.com', 'https://onlypok-git-feat-x-edgar.vercel.app', 'https://onlypok-git-feat-x.vercel.app',
  ])
  expect(resolveAppOrigin(req('https://onlypok-git-feat-x-edgar.vercel.app'), PREVIEW)).toBe('https://onlypok-git-feat-x-edgar.vercel.app')
  expect(resolveAppOrigin(req('https://onlypok-git-feat-x.vercel.app'), PREVIEW)).toBe('https://onlypok-git-feat-x.vercel.app')
  expect(resolveAppOrigin(req('http://onlypok-git-feat-x-edgar.vercel.app'), PREVIEW)).toBe('https://onlypok.com')
  expect(resolveAppOrigin(req('https://onlypok-git-other.vercel.app'), PREVIEW)).toBe('https://onlypok.com')
  // Preview sans NEXT_PUBLIC_APP_URL ni Origin : jamais localhost (VERCEL_ENV est posé), repli Vercel
  expect(resolveAppOrigin(req(null), { VERCEL_ENV: 'preview', VERCEL_URL: 'onlypok-git-feat-x-edgar.vercel.app' })).toBe(FALLBACK_APP_URL)
})
