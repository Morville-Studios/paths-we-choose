import { defineConfig } from 'vite';
import { randomUUID } from 'node:crypto';

// One identity shared by the running client and the deployed release manifest.
const buildId = randomUUID();

export default defineConfig({
  base: './',
  define: { __BUILD_ID__: JSON.stringify(buildId) },
  plugins: [{
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
