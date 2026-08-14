/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static export
  output: 'export',

  // Disable server-side features
  images: {
    unoptimized: true,
  },

  // Configure trailing slashes for static export
  trailingSlash: true,

  // Disable server components (all client-side)
  experimental: {
    // No server components
  },

  // Webpack configuration
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

module.exports = nextConfig;