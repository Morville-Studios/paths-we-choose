import { defineConfig } from 'vite';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

// One identity shared by the running client and the deployed release manifest.
const buildId = randomUUID();
const localeCatalog = JSON.parse(readFileSync(new URL('./src/i18n/generated.json', import.meta.url), 'utf8')) as Record<string, Record<string, string>>;

export default defineConfig({
  base: './',
  define: { __BUILD_ID__: JSON.stringify(buildId) },
  plugins: [{
    name: 'game-locale-chunks',
    resolveId(id) {
      return id.startsWith('virtual:game-locale:') ? `\0${id}` : null;
    },
    load(id) {
      if (!id.startsWith('\0virtual:game-locale:')) return null;
      const locale = id.slice('\0virtual:game-locale:'.length);
      const entries = localeCatalog[locale];
      if (!entries) throw new Error(`Missing generated locale: ${locale}`);
      return `export default ${JSON.stringify(entries)};`;
    },
  }, {
    name: 'release-manifest',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ buildId }) });
    },
  }],
  build: {
    outDir: 'dist',
    target: 'es2022',
  },
});
