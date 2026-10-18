import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  turbopack: {
    root: __dirname,
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

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com https://apis.google.com https://www.gstatic.com https://vercel.live https://*.vercel.live; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://vercel.live; font-src 'self' data: https://fonts.gstatic.com https://vercel.live https://assets.vercel.com; img-src 'self' data: blob: https://*.googleusercontent.com https://*.supabase.co https://challenges.cloudflare.com https://vercel.live https://vercel.com https://*.firebaseapp.com; frame-src 'self' https://challenges.cloudflare.com https://*.firebaseapp.com https://*.daily.co https://vercel.live; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://challenges.cloudflare.com https://api.resend.com https://*.daily.co wss://*.daily.co https://vercel.live https://*.vercel.live https://*.pusher.com wss://*.pusher.com;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
