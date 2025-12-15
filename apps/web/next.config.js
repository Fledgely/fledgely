/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enable server actions
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Transpile the shared contracts package
  transpilePackages: ['@fledgely/contracts'],
}

module.exports = nextConfig
