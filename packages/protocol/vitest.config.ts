import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: '@freevilisation/protocol',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})