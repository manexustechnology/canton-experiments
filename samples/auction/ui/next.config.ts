import type { NextConfig } from 'next';

/**
 * Next.js config for the Canton Auction house.
 *
 * Standalone app — the Tenzro design system is vendored under
 * `lib/ui/` (copied from @tenzro/ui, not edited in place), so there is
 * no workspace package to transpile.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lucide-react', 'motion'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
