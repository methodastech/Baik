// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/* CSS and JS under /css, /js and the root are served with a one-year immutable cache, and the
   service worker serves them cache-first. Their URLs never changed between deploys, so returning
   visitors kept the old files forever. After the build, every local .css/.js reference in every
   page gets ?v=<hash of that file's bytes>: the URL changes exactly when the file does. */
function versionAssets() {
  return {
    name: 'baik-version-assets',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const out = fileURLToPath(dir);
        const hashes = new Map();
        const hashOf = p => {
          if (hashes.has(p)) return hashes.get(p);
          const f = join(out, p);
          const h = existsSync(f) ? createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 10) : null;
          hashes.set(p, h); return h;
        };
        let pages = 0, refs = 0;
        for (const name of readdirSync(out)) {
          if (!name.endsWith('.html')) continue;
          const file = join(out, name);
          const html = readFileSync(file, 'utf8');
          const next = html.replace(/(\s(?:src|href)=")(\/[^"?#]+\.(?:css|js))(")/g, (m, a, path, b) => {
            const h = hashOf(path.slice(1)); if (!h) return m;
            refs++; return a + path + '?v=' + h + b;
          });
          if (next !== html) { writeFileSync(file, next); pages++; }
        }
        logger.info(`versioned ${refs} css/js references in ${pages} pages`);
      },
    },
  };
}

// The site is a static build uploaded to Azure Static Web Apps. Nothing renders
// on a server: `dist/` is the whole deployment.
export default defineConfig({
  site: 'https://baikapp.com',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [sitemap(), versionAssets()],
  // keep the authored markup byte-for-byte: whitespace between inline
  // elements is rendered, so collapsing it would shift the design
  compressHTML: false,
  devToolbar: { enabled: false },
});
