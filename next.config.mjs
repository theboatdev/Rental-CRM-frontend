/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.SHENALY_BUILD_DIR || '.next',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'shenalyrentacar.com',
      },
    ],
  },
};

export default nextConfig;
