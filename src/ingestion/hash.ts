// Portable deterministic evidence hash for local/Worker fixture mode. Production R2 persistence
// should replace this with WebCrypto SHA-256 over the exact redacted payload bytes.
export function createHash(input: string): string {
  let a = 2166136261; for (let i = 0; i < input.length; i++) { a ^= input.charCodeAt(i); a = Math.imul(a, 16777619); }
  return `fnv1a32:${(a >>> 0).toString(16).padStart(8, '0')}`;
}
