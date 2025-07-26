/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ultra minimal configuration
  reactStrictMode: false,
  swcMinify: false,
  experimental: {},
  
  // Disable all webpack optimizations that could cause issues
  webpack: (config, { dev, isServer }) => {
    // Completely disable source maps
    config.devtool = false;
    
    // Remove all fallbacks and aliases
    config.resolve.fallback = {};
    config.resolve.alias = {};
    
    // Disable module resolution caching
    config.cache = false;
    
    // Simplify optimization
    if (config.optimization) {
      config.optimization.minimize = false;
      config.optimization.splitChunks = false;
      config.optimization.concatenateModules = false;
    }
    
    return config;
  },
  
  // Disable all checks
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // No rewrites
  async rewrites() {
    return [];
  },
}

module.exports = nextConfig;