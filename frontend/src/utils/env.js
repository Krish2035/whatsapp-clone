/**
 * Safe Environment Variable Helper for Next.js and Vite compatibility.
 * Checks process.env (NEXT_PUBLIC_* or VITE_*) on both server and client.
 */

export function getEnv(key, defaultValue = '') {
  if (typeof process !== 'undefined' && process.env) {
    const nextKey = `NEXT_PUBLIC_${key.replace(/^VITE_/, '')}`;
    if (process.env[nextKey]) {
      return process.env[nextKey];
    }
    if (process.env[key]) {
      return process.env[key];
    }
  }

  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      if (import.meta.env[key]) {
        return import.meta.env[key];
      }
    }
  } catch (e) {}

  return defaultValue;
}
