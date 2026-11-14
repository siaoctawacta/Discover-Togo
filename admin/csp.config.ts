/**
 * Content-Security-Policy builder shared by the Vite build (meta tag) and documentation.
 * Keep in sync with the `Content-Security-Policy` header in firebase.json.
 */
export const DEFAULT_IMAGE_HOSTS = [
  'firebasestorage.googleapis.com',
  'storage.googleapis.com',
  'images.unsplash.com',
  'upload.wikimedia.org',
];

export interface CspOptions {
  apiUrl: string;
  firebaseAuthDomain?: string;
  imageHosts: string[];
  /** frame-ancestors is ignored inside <meta>; only include it for real headers. */
  forHeader?: boolean;
}

export function buildCsp({ apiUrl, firebaseAuthDomain, imageHosts, forHeader }: CspOptions): string {
  const apiOrigin = new URL(apiUrl).origin;
  const authFrame = firebaseAuthDomain ? [`https://${firebaseAuthDomain}`] : [];
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", 'https://apis.google.com'],
    'style-src': ["'self'"],
    'img-src': [
      "'self'",
      'data:',
      ...imageHosts.map((h) => `https://${h}`),
      'https://lh3.googleusercontent.com', // Google profile photos
    ],
    'font-src': ["'self'"],
    'connect-src': [
      "'self'",
      apiOrigin,
      'https://identitytoolkit.googleapis.com',
      'https://securetoken.googleapis.com',
      'https://www.googleapis.com',
    ],
    'frame-src': [...authFrame, 'https://accounts.google.com'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'manifest-src': ["'self'"],
    'worker-src': ["'self'"],
  };
  if (forHeader) directives['frame-ancestors'] = ["'none'"];
  const parts = Object.entries(directives).map(([k, v]) => `${k} ${[...new Set(v)].join(' ')}`);
  if (apiOrigin.startsWith('https://')) parts.push('upgrade-insecure-requests');
  return parts.join('; ');
}
