/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Enable static export for Capacitor mobile builds
  // Disabled for now - we'll use Capacitor server mode instead
  // output: 'export',
}

export default nextConfig
