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

  turbopack: {
    root: ".",
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
