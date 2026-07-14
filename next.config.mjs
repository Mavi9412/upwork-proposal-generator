/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  turbopack: {},
  serverExternalPackages: ['pdf-parse'],
  output: 'standalone',
};

export default nextConfig;
