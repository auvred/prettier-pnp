import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    threads: false,
    include: ['tests/integration/__tests__/**/*.test.ts'],
  },
})
