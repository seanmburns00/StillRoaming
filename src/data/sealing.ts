const SEAL_SECRET = "still-roaming-daily-quiz";
const IV_BYTES = 12;

let keyRequest: Promise<CryptoKey> | undefined;

function key(): Promise<CryptoKey> {
  keyRequest ??= crypto.subtle
    .digest("SHA-256", new TextEncoder().encode(SEAL_SECRET))
    .then((material) => crypto.subtle.importKey("raw", material, "AES-GCM", false, ["encrypt", "decrypt"]));
  return keyRequest;
}

export async function seal(value: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(), new TextEncoder().encode(JSON.stringify(value)));
  return toBase64(new Uint8Array([...iv, ...new Uint8Array(encrypted)]));
}

export async function unseal<T>(sealed: string): Promise<T> {
  const bytes = fromBase64(sealed);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, IV_BYTES) }, await key(), bytes.slice(IV_BYTES));
  return JSON.parse(new TextDecoder().decode(decrypted)) as T;
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(text: string): Uint8Array {
  return Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
}
