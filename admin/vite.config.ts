import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { buildCsp, DEFAULT_IMAGE_HOSTS } from './csp.config.ts';

/**
 * Injects a strict CSP <meta> tag into index.html for builds only.
 * (The dev server needs inline scripts for React Fast Refresh, so it runs without it.)
 * In production also send the same policy as a real HTTP header (see firebase.json).
 */
function cspPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'discover-togo-csp',
    apply: 'build',
    transformIndexHtml(html) {
      const csp = buildCsp({
        apiUrl: env.VITE_API_URL || 'http://localhost:4000/api/v1',
        firebaseAuthDomain: env.VITE_FIREBASE_AUTH_DOMAIN || undefined,
        imageHosts: env.VITE_IMAGE_HOSTS
          ? env.VITE_IMAGE_HOSTS.split(',').map((h) => h.trim()).filter(Boolean)
          : DEFAULT_IMAGE_HOSTS,
      });
      return html.replace(
        '<!-- CSP -->',
        `<meta http-equiv="Content-Security-Policy" content="${csp}" />`,
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react(), cspPlugin(env)],
    server: { port: 5173, strictPort: true },
    preview: { port: 4173, strictPort: true },
    build: { sourcemap: false },
  };
});
