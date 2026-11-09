import { defineConfig } from 'vite'

// Deployed as a GitHub Pages project site, so production is served from a
// sub-path. Asset URLs in JS are built from import.meta.env.BASE_URL — see
// src/utils/paths.js — because `base` alone does not rewrite string literals.
const REPO_BASE = '/3d-anatomy/'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? REPO_BASE : '/',
  build: {
    target: 'esnext',
    assetsInlineLimit: 0
  },
  server: {
    port: 3000,
    open: true,
    // The dev server is reached through a preview proxy whose host name is
    // assigned by the environment, so it cannot be listed ahead of time.
    // The check only applies to the dev server; the build is a static site
    // and is served by whatever hosts it.
    allowedHosts: true
  }
}))
