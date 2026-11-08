/**
 * Client-Side AES-256-GCM Encryption at Rest using the Web Crypto API
 * Compliant with enterprise at-rest cryptographic standards.
 */

const DEFAULT_SALT = new Uint8Array([111, 109, 110, 105, 99, 104, 97, 116, 95, 118, 97, 117, 108, 116, 50, 54]);
const DEFAULT_VAULT_KEY = "OmniChat-Vault-Default-Secure-Key-2026-AES256GCM";

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function computeFingerprint(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoder.encode(text));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}...${hex.slice(-8)}`;
}

/**
 * Encrypt a plain object or string using AES-256-GCM.
 * Output payload is formatted as: ENC_V1:<salt_b64>:<iv_b64>:<ciphertext_b64>
 */
export async function encryptAtRest(data: any, customPassphrase?: string): Promise<string> {
  const passphrase = customPassphrase || DEFAULT_VAULT_KEY;
  const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(jsonString);

  // Random 16-byte salt and 12-byte IV for AES-GCM
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveKey(passphrase, salt);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
    },
    key,
    encodedData
  );

  const saltB64 = bufferToBase64(salt.buffer);
  const ivB64 = bufferToBase64(iv.buffer);
  const cipherB64 = bufferToBase64(encryptedBuffer);

  return `ENC_V1:${saltB64}:${ivB64}:${cipherB64}`;
}

/**
 * Decrypt an AES-256-GCM encrypted payload
 */
export async function decryptAtRest<T = any>(encryptedText: string, customPassphrase?: string): Promise<T> {
  if (!encryptedText || !encryptedText.startsWith('ENC_V1:')) {
    // If not encrypted, return parsed or raw data
    try {
      return JSON.parse(encryptedText) as T;
    } catch {
      return encryptedText as unknown as T;
    }
  }

  const parts = encryptedText.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted payload structure');
  }

  const [, saltB64, ivB64, cipherB64] = parts;
  const salt = new Uint8Array(base64ToBuffer(saltB64));
  const iv = new Uint8Array(base64ToBuffer(ivB64));
  const cipherBuffer = base64ToBuffer(cipherB64);

  const passphrase = customPassphrase || DEFAULT_VAULT_KEY;
  const key = await deriveKey(passphrase, salt);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
    },
    key,
    cipherBuffer
  );

  const decoder = new TextDecoder();
  const jsonString = decoder.decode(decryptedBuffer);

  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return jsonString as unknown as T;
  }
}
