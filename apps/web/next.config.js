/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for Vercel edge/serverless deployment
  output: "standalone",

  // Allow Replit's proxied dev domain for HMR and dev resources
  allowedDevOrigins: process.env.REPLIT_DEV_DOMAIN ? [process.env.REPLIT_DEV_DOMAIN] : [],

  // Expose API URL to the browser bundle
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "",
  },

  // Allow images from common external sources
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },

  // Suppress noisy build warnings from dependencies
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
