/**
 * Vitest config - OPTIONAL
 * To remove testing: delete this file, __tests__/, and run:
 *   npm uninstall vitest
 *   Remove "test" script from package.json
 */
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    exclude: ['node_modules', '.next'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
