/** @type {import('next').NextConfig} */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
let supabaseHost = null
let supabaseProtocol = 'https'

if (supabaseUrl) {
  try {
    const parsed = new URL(supabaseUrl)
    supabaseHost = parsed.hostname
    supabaseProtocol = parsed.protocol.replace(':', '')
  } catch {
    // Ignore invalid URL, fallback to unoptimized images.
  }
}

const remotePatterns = []
if (supabaseHost) {
  remotePatterns.push({
    protocol: supabaseProtocol,
    hostname: supabaseHost,
    pathname: '/storage/v1/object/public/**',
  })
}

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  images: {
    remotePatterns,
    unoptimized: !supabaseHost,
  },
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ]
  },
  env: {
    NEXT_PUBLIC_APP_ENV: process.env.NODE_ENV
  }
}

module.exports = nextConfig
