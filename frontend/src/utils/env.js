/**
 * Safe Environment Variable Helper for Next.js and Vite compatibility.
 * Checks process.env (NEXT_PUBLIC_* or VITE_*) on both server and client.
 */

export function getEnv(key, defaultValue = '') {
  // Explicit literal checks for Next.js client-side build-time inlining
  if (key === 'VITE_API_URL' || key === 'NEXT_PUBLIC_API_URL') {
    if (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
    if (typeof process !== 'undefined' && process.env && process.env.VITE_API_URL) return process.env.VITE_API_URL;
  }
  if (key === 'VITE_SOCKET_URL' || key === 'NEXT_PUBLIC_SOCKET_URL') {
    if (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_SOCKET_URL) return process.env.NEXT_PUBLIC_SOCKET_URL;
    if (typeof process !== 'undefined' && process.env && process.env.VITE_SOCKET_URL) return process.env.VITE_SOCKET_URL;
  }
  if (key === 'VITE_AGORA_APP_ID' || key === 'NEXT_PUBLIC_AGORA_APP_ID') {
    if (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_AGORA_APP_ID) return process.env.NEXT_PUBLIC_AGORA_APP_ID;
    if (typeof process !== 'undefined' && process.env && process.env.VITE_AGORA_APP_ID) return process.env.VITE_AGORA_APP_ID;
  }

  if (typeof process !== 'undefined' && process.env) {
    if (process.env[key]) return process.env[key];
  }

  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      if (import.meta.env[key]) return import.meta.env[key];
    }
  } catch (e) {}

  return defaultValue;
}
