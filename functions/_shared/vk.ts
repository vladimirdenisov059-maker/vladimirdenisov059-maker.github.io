import type { OwnerEnv } from './owner-auth.ts';

export interface VkEnv extends OwnerEnv {
  VK_ACCESS_TOKEN?: string;
  VK_OWNER_ID?: string;
  VK_API_VERSION?: string;
  PUBLICATION_HISTORY?: KvNamespace;
}

interface KvNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

interface StoredVkCredentials {
  accessToken: string;
  ownerId: number;
  scope?: string;
  expires?: number | null;
}

const credentialsStorageKey = 'owner-configuration:vk:v1';
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

const base64ToBytes = (value: string) => {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const credentialsKey = async (password: string) => crypto.subtle.importKey(
  'raw',
  await crypto.subtle.digest('SHA-256', encoder.encode(password)),
  'AES-GCM',
  false,
  ['encrypt', 'decrypt'],
);

export const storeVkCredentials = async (env: VkEnv, credentials: StoredVkCredentials) => {
  if (!env.PUBLICATION_HISTORY || !env.ADMIN_PASSWORD) throw new Error('VK_STORAGE_NOT_CONFIGURED');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await credentialsKey(env.ADMIN_PASSWORD),
    encoder.encode(JSON.stringify(credentials)),
  );
  await env.PUBLICATION_HISTORY.put(credentialsStorageKey, JSON.stringify({
    version: 1,
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
  }));
};

export const loadVkCredentials = async (env: VkEnv): Promise<StoredVkCredentials | null> => {
  if (!env.PUBLICATION_HISTORY || !env.ADMIN_PASSWORD) return null;
  try {
    const stored = await env.PUBLICATION_HISTORY.get(credentialsStorageKey);
    if (!stored) return null;
    const envelope = JSON.parse(stored) as { version?: number; iv?: string; ciphertext?: string };
    if (envelope.version !== 1 || !envelope.iv || !envelope.ciphertext) return null;
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBytes(envelope.iv) },
      await credentialsKey(env.ADMIN_PASSWORD),
      base64ToBytes(envelope.ciphertext),
    );
    const credentials = JSON.parse(decoder.decode(decrypted)) as StoredVkCredentials;
    if (
      !credentials.accessToken
      || credentials.accessToken.length > 4096
      || !Number.isSafeInteger(credentials.ownerId)
      || credentials.ownerId <= 0
    ) return null;
    return credentials;
  } catch {
    return null;
  }
};

interface VkError {
  error_code?: number;
  error_msg?: string;
}

interface VkEnvelope<T> {
  response?: T;
  error?: VkError;
}

export const vkApiVersion = (env: VkEnv) => env.VK_API_VERSION || '5.199';

export const configuredPersonalOwnerId = (env: VkEnv): number | null => {
  if (!env.VK_ACCESS_TOKEN || !env.VK_OWNER_ID || !/^\d+$/.test(env.VK_OWNER_ID)) return null;
  const ownerId = Number(env.VK_OWNER_ID);
  return Number.isSafeInteger(ownerId) && ownerId > 0 ? ownerId : null;
};

export const requestVkAccessToken = (request: Request, env: VkEnv) => {
  const supplied = (request.headers.get('X-VK-Access-Token') ?? '').trim();
  if (supplied && supplied.length <= 4096 && !/[\r\n]/.test(supplied)) return supplied;
  return env.VK_ACCESS_TOKEN?.trim() || null;
};

export const callVk = async <T>(
  env: VkEnv,
  method: string,
  parameters: URLSearchParams,
  accessToken = env.VK_ACCESS_TOKEN,
) => {
  if (!accessToken) throw new Error('VK_NOT_CONFIGURED');
  parameters.set('access_token', accessToken);
  parameters.set('v', vkApiVersion(env));

  const upstream = await fetch(`https://api.vk.com/method/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: parameters,
  });
  const result = await upstream.json() as VkEnvelope<T>;
  if (!upstream.ok || result.error || result.response === undefined) {
    const error = new Error(result.error?.error_msg || `VK_${method}_FAILED`);
    Object.assign(error, { vkCode: result.error?.error_code, upstreamStatus: upstream.status });
    throw error;
  }
  return result.response;
};

interface VkCurrentUser {
  id: number;
  first_name?: string;
  last_name?: string;
  screen_name?: string;
}

export const resolvePersonalVkUser = async (request: Request, env: VkEnv) => {
  const suppliedToken = (request.headers.get('X-VK-Access-Token') ?? '').trim();
  const storedCredentials = suppliedToken ? null : await loadVkCredentials(env);
  const accessToken = suppliedToken || storedCredentials?.accessToken || requestVkAccessToken(request, env);
  if (!accessToken) throw new Error('VK_NOT_CONFIGURED');
  const configuredOwnerId = storedCredentials?.ownerId ?? configuredPersonalOwnerId(env);
  const parameters = new URLSearchParams({ fields: 'screen_name' });
  if (configuredOwnerId) parameters.set('user_ids', String(configuredOwnerId));
  const users = await callVk<VkCurrentUser[]>(env, 'users.get', parameters, accessToken);
  const user = users[0];
  if (!user || !Number.isSafeInteger(user.id) || user.id <= 0) throw new Error('VK_USER_NOT_FOUND');
  if (configuredOwnerId && user.id !== configuredOwnerId) throw new Error('VK_OWNER_MISMATCH');
  return { accessToken, ownerId: user.id, user };
};

export const vkErrorCode = (error: unknown) => {
  if (!error || typeof error !== 'object' || !('vkCode' in error)) return null;
  const code = (error as { vkCode?: unknown }).vkCode;
  return typeof code === 'number' ? code : null;
};
