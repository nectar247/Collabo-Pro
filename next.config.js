/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { 
    unoptimized: true,
    formats: ['image/webp', 'image/avif'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'ui.awin.com'
      },
      {
        protocol: 'https',
        hostname: 'awin.com'
      },
      {
        protocol: 'https',
        hostname: 'awin1.com'
      },
      {
        protocol: 'https',
        hostname: 'a1.awin1.com'
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com'
      }
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dialog'],
    outputFileTracingRoot: path.resolve(__dirname), // Ensures proper file tracing
  },
  //matcher: ['/admin/:path*', '/dashboard/:path*', '/:path*/settings/:path*', '/:path*/settings'],
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  async headers() {
    return [
      {
        // Static assets cache
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Image cache
        source: '/:path*.(jpg|jpeg|png|gif|ico|svg|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=31536000',
          },
        ],
      },
      {
        // JavaScript and CSS cache
        source: '/:path*.(js|css)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Next.js chunks cache
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Font cache
        source: '/:path*.(woff|woff2|eot|ttf|otf)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // apply to all routes
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              `default-src 'self' https://vouched4vouchers.firebaseapp.com`,
              `script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' https://*.trendii.com https://www.googletagmanager.com https://www.dwin2.com https://*.firebaseapp.com https://apis.google.com`,
              `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.trendii.com https://www.googletagmanager.com https://www.dwin2.com https://*.firebaseapp.com https://apis.google.com`,
              `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.firebaseapp.com https://tm.trendii.com`,
              `img-src 'self' https://ui.awin.com https://awin.com https://awin1.com https://a1.awin1.com https://images.unsplash.com https://*.firebaseapp.com https://firebasestorage.googleapis.com data:`,
              `font-src 'self' https://fonts.gstatic.com https://tm.trendii.com`,
              `connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://beeswax.trendii.com https://ingress.trendii.com https://tm.trendii.com https://*.firebaseapp.com`,
              `frame-src 'self' https://vouched4vouchers.firebaseapp.com`,
              `child-src 'self' https://vouched4vouchers.firebaseapp.com`,
            ].join('; ')
          }
        ]
      }
    ]
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'undici': false
    };

    config.optimization.splitChunks = {
      chunks: 'all',
      minSize: 20000,
      maxSize: 244000,
      minChunks: 1,
      maxAsyncRequests: 30,
      maxInitialRequests: 30,
      cacheGroups: {
        defaultVendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10,
          reuseExistingChunk: true,
        },
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true,
        },
      },
    };
    return config;
  },
}

module.exports = nextConfig