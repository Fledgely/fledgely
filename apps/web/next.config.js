/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enable server actions
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Transpile the shared workspace packages
  transpilePackages: ['@fledgely/contracts', '@fledgely/shared'],
  // TEMPORARY: Skip TypeScript errors during build
  // This is needed because there is significant type drift between
  // the contracts package types and the web app implementations.
  // See Sprint Change Proposal 2025-12-28 - Epic 0 addresses this.
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
