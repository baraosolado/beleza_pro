/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: ['types'],
  async redirects() {
    return [{ source: '/favicon.ico', destination: '/icon.svg', permanent: false }];
  },
};

module.exports = nextConfig;
