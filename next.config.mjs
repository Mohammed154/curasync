/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,

  // Suppress webpack Buffer serialization warning for large cached strings
  webpack(config, { dev, isServer }) {
    if (dev) {
      config.cache = {
        type: "filesystem",
        compression: "gzip",
        store: "pack",
        buildDependencies: { config: [import.meta.url] },
      };
    }
    return config;
  },

  // Empty turbopack config to allow both webpack and turbopack to coexist
  turbopack: {},


  // 1. Clerk validates publishableKey during prerender (fails with placeholder keys)
  // 2. All pages need auth context which is only available at request time
  // 3. TimescaleDB queries cannot be pre-executed at build time
  // In production on Vercel this is correct — pages are server-rendered on demand (ƒ)
  output: undefined, // default Next.js output (server-side rendering)

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "/api/v1/:path*",
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
