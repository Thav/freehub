import { defineConfig } from 'vite'
import { resolve } from 'path'
import { rm } from 'node:fs/promises'

const outDir = '../../public'

export default defineConfig({
  root: './src',
  plugins: [
    {
      name: "Cleaning assets folder",
      async buildStart() {
        await rm(resolve(__dirname, `${outDir}/assets`), { recursive: true, force: true })
      }
    }
  ],
  build: {
    outDir,
    copyPublicDir: false,
    rollupOptions: {
      input: {
        'index': './src/index.js'
      }
    },
    manifest: true
  }}
)