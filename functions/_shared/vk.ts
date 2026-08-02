import type { OwnerEnv } from './owner-auth.ts';

export interface VkEnv extends OwnerEnv {
  VK_ACCESS_TOKEN?: string;
  VK_OWNER_ID?: string;
  VK_API_VERSION?: string;
}

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

export const callVk = async <T>(env: VkEnv, method: string, parameters: URLSearchParams) => {
  if (!env.VK_ACCESS_TOKEN) throw new Error('VK_NOT_CONFIGURED');
  parameters.set('access_token', env.VK_ACCESS_TOKEN);
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

export const vkErrorCode = (error: unknown) => {
  if (!error || typeof error !== 'object' || !('vkCode' in error)) return null;
  const code = (error as { vkCode?: unknown }).vkCode;
  return typeof code === 'number' ? code : null;
};
