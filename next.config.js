/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prisma Client を Server Components / Route Handler で使う場合に必要
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
  },

  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
