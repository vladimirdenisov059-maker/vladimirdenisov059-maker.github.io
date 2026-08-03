import {
  authenticateOwner,
  ownerCorsHeaders,
  ownerJson,
  readJsonBody,
} from '../../_shared/owner-auth.ts';
import { storeVkCredentials, type VkEnv } from '../../_shared/vk.ts';

interface PagesContext {
  request: Request;
  env: VkEnv;
}

interface ConnectVkBody {
  accessToken?: unknown;
  ownerId?: unknown;
  scope?: unknown;
  expires?: unknown;
}

export const onRequest = async ({ request, env }: PagesContext): Promise<Response> => {
  const cors = ownerCorsHeaders(request, env);
  const respond = (body: Record<string, unknown>, status = 200) => ownerJson(body, status, cors.headers);

  if (!cors.allowed) return respond({ error: 'Запрос отклонён.' }, 403);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors.headers });
  if (request.method !== 'POST') return respond({ error: 'Используйте POST-запрос.' }, 405);

  const auth = await authenticateOwner(request, env);
  if (!auth.ok) {
    return respond({
      error: auth.status === 503 ? 'Закрытый редактор ещё не настроен.' : 'Неверный пароль владельца.',
    }, auth.status);
  }

  const body = await readJsonBody<ConnectVkBody>(request, 8192);
  const accessToken = typeof body?.accessToken === 'string' ? body.accessToken.trim() : '';
  const ownerId = typeof body?.ownerId === 'number' ? body.ownerId : Number.NaN;
  const scope = typeof body?.scope === 'string' ? body.scope : '';
  const grantedScopes = new Set(scope.split(',').map((value) => value.trim()).filter(Boolean));
  const expires = typeof body?.expires === 'number' && Number.isFinite(body.expires) ? body.expires : null;

  if (accessToken.length < 20 || accessToken.length > 4096 || /[\r\n]/.test(accessToken)) {
    return respond({ error: 'VK вернул некорректный ключ доступа.' }, 400);
  }
  if (!Number.isSafeInteger(ownerId) || ownerId <= 0) {
    return respond({ error: 'VK вернул некорректный ID владельца.' }, 400);
  }
  if (!['wall', 'photos', 'video'].every((permission) => grantedScopes.has(permission))) {
    return respond({ error: 'VK не выдал все права: стена, фотографии и видео.' }, 400);
  }

  try {
    await storeVkCredentials(env, { accessToken, ownerId, scope, expires });
    return respond({ connected: true, ownerId });
  } catch (error) {
    console.error('VK credential storage failed', error);
    return respond({ error: 'Не удалось сохранить доступ VK в защищённом хранилище Cloudflare.' }, 503);
  }
};