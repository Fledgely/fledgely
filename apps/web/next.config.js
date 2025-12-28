/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@fledgely/shared'],
  experimental: {
    typedRoutes: true,
  },
}

module.exports = nextConfig
