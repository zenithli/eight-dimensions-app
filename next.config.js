/** @type {import('next').NextConfig} */
// Build: 202603162356
const nextConfig = {
  // Prisma Client を Server Components / Route Handler で使う場合に必要
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
  },

  async headers() {
    return [
      // ── API Routes ──
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin',  value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
      // ── 静的JS/CSSを常に最新版に（キャッシュ無効化）──
      // ビルドごとにファイル名が変わるのでブラウザは自動更新される
      // 念のため no-cache を設定
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
