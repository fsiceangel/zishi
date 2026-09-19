import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves from /zishi/; local dev serves from the root.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/zishi/' : '/',
}))
