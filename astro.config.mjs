// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// The site is a static build uploaded to Azure Static Web Apps. Nothing renders
// on a server: `dist/` is the whole deployment.
export default defineConfig({
  site: 'https://baikapp.com',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [sitemap()],
  // keep the authored markup byte-for-byte: whitespace between inline
  // elements is rendered, so collapsing it would shift the design
  compressHTML: false,
  devToolbar: { enabled: false },
});
