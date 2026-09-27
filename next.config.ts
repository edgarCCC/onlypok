import type { NextConfig } from "next";

// Content-Security-Policy — scopée aux origines réellement utilisées par
// OnlyPok (Stripe, Daily.co, YouTube, Supabase, Vercel Analytics).
// 'unsafe-inline' est requis par le bootstrap Next.js sans nonce ; 'unsafe-eval'
// est volontairement EXCLU (protège contre l'exécution de scripts injectés).
// ⚠️ À valider sur un déploiement preview avant la prod : si un écran casse
// (visio, embed vidéo), élargir l'origine concernée plutôt que de retirer la CSP.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://js.stripe.com https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://img.youtube.com https://i.ytimg.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://api.stripe.com https://*.daily.co wss://*.daily.co https://va.vercel-scripts.com https://vitals.vercel-insights.com",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://*.daily.co https://www.youtube.com https://www.youtube-nocookie.com",
  "media-src 'self' blob: https://*.supabase.co",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const SECURITY_HEADERS = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  { key: 'X-Frame-Options',           value: 'DENY' },
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy',   value: CSP },
];

const nextConfig: NextConfig = {
  turbopack: {},
  serverExternalPackages: ['sharp'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        pathname: '/vi/**',
      },
    ],
  },
  async headers() {
    return [{ source: '/(.*)', headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
