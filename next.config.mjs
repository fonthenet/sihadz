import { createRequire } from 'module'
const require = createRequire(import.meta.url)

// PWA disabled by default - service worker causes navigation flashing/reloads on v0.app and similar.
// Enable with ENABLE_PWA=true (e.g. for Capacitor/mobile deployments).
const pwaEnabled = process.env.ENABLE_PWA === 'true'
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: !pwaEnabled,
  register: pwaEnabled,
  skipWaiting: true,
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow dev requests from custom domain and local network IPs
  allowedDevOrigins: ['sihadz.com', '*.sihadz.com', 'www.sihadz.com', '192.168.50.121', 'localhost'],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Reduce serverless function size - exclude unused dirs from trace
  experimental: {
    outputFileTracingExcludes: {
      '*': ['settings/**', 'android/**', '.cursor/**', '__tests__/**', 'docs/**'],
    },
  },
  // Force all server functions to use Node.js runtime (not Edge)
  // This prevents 404 errors on Vercel for dynamic API routes
  serverExternalPackages: ['@supabase/ssr', '@supabase/supabase-js', 'bcrypt'],
  // Static export disabled - DZDoc uses API routes that require a server
  // For Capacitor, we use server mode (app loads from deployed URL or dev server)
  // output: 'export',
  
  // Turbopack is used by default in Next.js 16 for dev
  // Empty config to acknowledge we have webpack config for production builds only
  turbopack: {},
  
  // Webpack bundle analyzer (run with ANALYZE=true npm run build)
  // Note: This only applies to production builds (npm run build), not dev server
  webpack: (config, { isServer }) => {
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: isServer ? '../analyze/server.html' : './analyze/client.html',
          openAnalyzer: false,
        })
      )
    }
    return config
  },
}

export default withPWA(nextConfig)
