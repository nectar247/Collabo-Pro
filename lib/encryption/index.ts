import * as SecureStore from 'expo-secure-store';

// ─── AES-256-GCM encryption using Web Crypto API ─────────────────────────────
// Hermes exposes the Web Crypto API on global.crypto, not as a bare `crypto`
// global. We grab it once here — and check for subtle so we can degrade
// gracefully if the polyfill hasn't loaded yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _crypto = (global as any).crypto as Crypto | undefined;
const _subtle = _crypto?.subtle;

export interface EncryptedPayload {
  ciphertext: string; // base64
  iv: string;         // base64
}

// Convert ArrayBuffer to base64
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert base64 to ArrayBuffer
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Import a raw base64 key for AES-GCM operations
async function importKey(keyBase64: string): Promise<CryptoKey> {
  if (!_subtle) throw new Error('crypto.subtle unavailable');
  const keyBuffer = base64ToBuffer(keyBase64);
  return _subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Generate a new random AES-256 key, returned as base64
export async function generateKey(): Promise<string> {
  if (!_subtle) throw new Error('crypto.subtle unavailable');
  const key = await _subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const exported = await _subtle.exportKey('raw', key);
  return bufferToBase64(exported);
}

// Encrypt plaintext string → EncryptedPayload
export async function encryptMessage(
  plaintext: string,
  keyBase64: string
): Promise<EncryptedPayload> {
  if (!_subtle || !_crypto) throw new Error('crypto.subtle unavailable');
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const iv = _crypto.getRandomValues(new Uint8Array(12));
  const cryptoKey = await importKey(keyBase64);

  const encrypted = await _subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  );

  return {
    ciphertext: bufferToBase64(encrypted),
    iv: bufferToBase64(iv.buffer),
  };
}

// Decrypt EncryptedPayload → plaintext string
export async function decryptMessage(
  payload: EncryptedPayload,
  keyBase64: string
): Promise<string> {
  if (!_subtle) throw new Error('crypto.subtle unavailable');
  const cryptoKey = await importKey(keyBase64);
  const decrypted = await _subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBuffer(payload.iv) },
    cryptoKey,
    base64ToBuffer(payload.ciphertext)
  );
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

// Serialize message content for Firestore storage
export function serializeEncrypted(payload: EncryptedPayload): string {
  return JSON.stringify(payload);
}

// Deserialize Firestore stored content back to EncryptedPayload
export function deserializeEncrypted(raw: string): EncryptedPayload {
  return JSON.parse(raw) as EncryptedPayload;
}

// ─── Per-workspace key management via expo-secure-store ───────────────────────

const KEY_PREFIX = 'enc_key_';

export async function storeWorkspaceKey(
  workspaceId: string,
  keyBase64: string
): Promise<void> {
  await SecureStore.setItemAsync(`${KEY_PREFIX}${workspaceId}`, keyBase64);
}

export async function getWorkspaceKey(workspaceId: string): Promise<string> {
  const key = await SecureStore.getItemAsync(`${KEY_PREFIX}${workspaceId}`);
  if (!key) {
    // First time on this device for this workspace — generate a new key
    const newKey = await generateKey();
    await storeWorkspaceKey(workspaceId, newKey);
    return newKey;
  }
  return key;
}

// ─── Convenience: encrypt/decrypt message content for a workspace ─────────────

export async function encryptForWorkspace(
  plaintext: string,
  workspaceId: string
): Promise<string> {
  // Degrade gracefully when Web Crypto API is unavailable (e.g. missing polyfill).
  if (!_subtle) return plaintext;
  try {
    const key = await getWorkspaceKey(workspaceId);
    const payload = await encryptMessage(plaintext, key);
    return serializeEncrypted(payload);
  } catch {
    return plaintext;
  }
}

export async function decryptForWorkspace(
  storedContent: string,
  workspaceId: string
): Promise<string> {
  if (!_subtle) return storedContent;
  try {
    const key = await getWorkspaceKey(workspaceId);
    const payload = deserializeEncrypted(storedContent);
    return await decryptMessage(payload, key);
  } catch {
    // Fallback: return raw content if decryption fails (e.g. legacy unencrypted messages)
    return storedContent;
  }
}
