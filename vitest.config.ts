import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig(() => {
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    test: {
      // PRISM's own tests live in src/ and api/src/. The vendored Conway
      // Automaton checkout (./automaton) ships its own test suite that needs
      // its own `pnpm install` — exclude it so `npm test` stays green.
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/automaton/**',
        '**/bin/**',
      ],
    },
  };
});
