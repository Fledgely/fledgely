/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@fledgely/shared'],
  experimental: {
    typedRoutes: true,
  },
  // Firebase Hosting with frameworksBackend uses Cloud Functions for SSR
  // Image optimization disabled for simpler deployment (no external image CDN needed)
  images: {
    unoptimized: true,
  },
  // Trailing slashes for clean URLs on Firebase Hosting
  trailingSlash: true,
}

module.exports = nextConfig
