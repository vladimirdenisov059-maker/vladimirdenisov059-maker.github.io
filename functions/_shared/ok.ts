import type { OwnerEnv } from './owner-auth.ts';
import { md5Hex } from './md5.ts';

export interface OkEnv extends OwnerEnv {
  OK_APPLICATION_KEY?: string;
  OK_APPLICATION_SECRET_KEY?: string;
  OK_ACCESS_TOKEN?: string;
  OK_GROUP_ID?: string;
}

interface OkError { error_code?: number; error_msg?: string; error_data?: unknown }

export const okConfigured = (env: OkEnv) => Boolean(
  env.OK_APPLICATION_KEY && env.OK_APPLICATION_SECRET_KEY && env.OK_ACCESS_TOKEN,
);

// OK.ru's "server access_token" signature scheme: sig = md5(sortedParams + md5(access_token + secret_key)).
// See https://apiok.ru/dev/methods/ "Подпись запроса" for the reference algorithm.
const signParams = (params: Record<string, string>, accessToken: string, secretKey: string) => {
  const innerHash = md5Hex(accessToken + secretKey);
  const sortedKeys = Object.keys(params).sort();
  const concatenated = sortedKeys.map((key) => `${key}=${params[key]}`).join('');
  return md5Hex(concatenated + innerHash);
};

export const callOk = async <T>(env: OkEnv, method: string, extraParams: Record<string, string> = {}) => {
  if (!okConfigured(env)) throw new Error('OK_NOT_CONFIGURED');
  const accessToken = env.OK_ACCESS_TOKEN as string;
  const secretKey = env.OK_APPLICATION_SECRET_KEY as string;
  const params: Record<string, string> = {
    application_key: env.OK_APPLICATION_KEY as string,
    method,
    format: 'json',
    access_token: accessToken,
    ...extraParams,
  };
  const sig = signParams(params, accessToken, secretKey);
  const body = new URLSearchParams({ ...params, sig });

  const upstream = await fetch('https://api.ok.ru/fb.do', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const result = await upstream.json() as T | OkError;
  const asError = result as OkError;
  if (!upstream.ok || (asError && typeof asError === 'object' && 'error_code' in asError && asError.error_code)) {
    const error = new Error(asError.error_msg || `OK_${method}_FAILED`);
    Object.assign(error, { okCode: asError.error_code, upstreamStatus: upstream.status });
    throw error;
  }
  return result as T;
};

export const okErrorCode = (error: unknown) => {
  if (!error || typeof error !== 'object' || !('okCode' in error)) return null;
  const code = (error as { okCode?: unknown }).okCode;
  return typeof code === 'number' ? code : null;
};

interface OkCurrentUser { uid: string; name?: string }

export const resolveOkIdentity = async (env: OkEnv) => {
  if (!okConfigured(env)) throw new Error('OK_NOT_CONFIGURED');
  const user = await callOk<OkCurrentUser>(env, 'users.getCurrentUser', {});
  if (!user?.uid) throw new Error('OK_USER_NOT_FOUND');
  return user;
};
