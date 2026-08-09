// Builds the background script and content scripts as self-contained bundles.
// They can't be code-split/shared with the sidebar app or each other:
// - background.js is an ES module (MV3 Firefox supports `"type": "module"`).
// - content-chatgpt.js must be a classic script (no import/export) since Firefox
//   content_scripts don't support ES modules the way the background page does.
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const entries = [
  { name: 'background', entry: 'src/background/index.ts', format: 'es' },
  { name: 'content-chatgpt', entry: 'src/content/chatgpt.ts', format: 'iife' },
  { name: 'content-claude', entry: 'src/content/claude.ts', format: 'iife' },
]

for (const { name, entry, format } of entries) {
  await build({
    root,
    configFile: false,
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      lib: {
        entry: resolve(root, entry),
        formats: [format],
        fileName: () => `${name}.js`,
        name: name.replace(/-/g, '_'),
      },
      rollupOptions: {
        output: { codeSplitting: false },
      },
    },
  })
}
