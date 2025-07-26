/** @type {import('next').NextConfig} */
const nextConfig = {
  // Minimal configuration to prevent webpack errors
  reactStrictMode: false,
  swcMinify: false,
  
  // Disable experimental features that cause issues
  experimental: {},
  
  // Simplified webpack config
  webpack: (config, { dev, isServer }) => {
    // Disable source maps in development to prevent webpack issues
    if (dev) {
      config.devtool = false;
    }
    
    // Add fallbacks for Node.js modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      stream: false,
      url: false,
      zlib: false,
      http: false,
      https: false,
      assert: false,
      os: false,
      path: false,
    };
    
    return config;
  },
  
  // Disable TypeScript and ESLint checking during build
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Simple API rewrite
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://backend:8000/api/v1/:path*',
      },
    ];
  },
};

module.exports = nextConfig;