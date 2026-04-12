/** @type {import('next').NextConfig} */

const CSP = [
  "default-src 'self'",
  // Next.js requires unsafe-inline for its runtime scripts/styles
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  // Google profile pictures + map tiles (Leaflet: OSM primary, CartoDB fallback)
  "img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.googleusercontent.com https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com",
  // API calls: weather + Neon DB edge
  "connect-src 'self' https://api.open-meteo.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const securityHeaders = [
  { key: 'X-Frame-Options',           value: 'DENY' },
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control',    value: 'on' },
  { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=(self)' },
  { key: 'Content-Security-Policy',   value: CSP },
];

const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@neondatabase/serverless'],
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
    ],
  },

  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'ironmap.cz' }],
        destination: 'https://www.ironmap.cz/:path*',
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
