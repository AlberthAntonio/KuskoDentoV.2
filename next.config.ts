import type { NextConfig } from 'next';

// CSP se define dinamicamente en middleware.ts (con nonce). Aqui solo los demas headers.
const baseSecurityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  // HSTS: Máxima seguridad para HTTPS (31536000 segundos = 1 año)
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' }
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,

  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },

  // Te recomiendo envolver esto en un condicional si usas subida de archivos o optimizaciones pesadas
  images: {
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840], // Opcional: Controla los tamaños de imágenes generados
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
    ],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: baseSecurityHeaders,
      },
    ];
  },
};

export default nextConfig;