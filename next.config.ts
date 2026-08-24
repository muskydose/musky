import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Allow access to remote image placeholders and providers.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  output: 'standalone',
  transpilePackages: ['motion'],
  async headers() {
    const isDevPreview = process.env.NODE_ENV !== 'production' || process.env.DISABLE_HMR === 'true';

    // Strict clickjacking protection for production (SAMEORIGIN / frame-ancestors 'self'),
    // while permitting framing from Google AI Studio preview origins in dev/preview mode.
    const frameHeaders = isDevPreview
      ? [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://*.google.com https://*.google.dev https://*.studio.google.com https://*.run.app",
          },
        ]
      : [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self'",
          },
        ];

    return [
      {
        source: '/(.*)',
        headers: [
          ...frameHeaders,
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
  webpack: (config, {dev}) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
    if (dev) {
      config.watchOptions = {
        ignored: [
          '**/.git/**',
          '**/.next/**',
          '**/node_modules/**',
          '**/tmp/**',
          '**/*.log',
        ],
      };
    }
    return config;
  },
};

export default nextConfig;
