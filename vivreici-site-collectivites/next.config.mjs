import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack résout les imports CSS depuis la racine Git du monorepo (pas de package.json).
  // resolveAlias force la résolution de tailwindcss vers le node_modules local.
  turbopack: {
    resolveAlias: {
      tailwindcss: path.resolve(__dirname, "node_modules/tailwindcss"),
    },
  },
}

export default nextConfig
