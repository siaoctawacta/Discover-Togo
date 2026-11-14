// Prints the CSP *header* value (includes frame-ancestors) for the given environment, so the
// Content-Security-Policy in firebase.json / your CDN can be kept in sync with the build meta tag.
//   VITE_API_URL=https://api.discovertogo.app/api/v1 VITE_FIREBASE_AUTH_DOMAIN=discover-togo.firebaseapp.com npm run csp:print
import { buildCsp, DEFAULT_IMAGE_HOSTS } from '../csp.config.ts';

const env = process.env;
console.log(
  buildCsp({
    apiUrl: env.VITE_API_URL || 'https://api.discovertogo.app/api/v1',
    firebaseAuthDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'discover-togo.firebaseapp.com',
    imageHosts: env.VITE_IMAGE_HOSTS ? env.VITE_IMAGE_HOSTS.split(',').map((h) => h.trim()).filter(Boolean) : DEFAULT_IMAGE_HOSTS,
    forHeader: true,
  }),
);
