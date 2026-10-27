import {
  authenticateOwner,
  ownerCorsHeaders,
  ownerJson,
} from '../../_shared/owner-auth.ts';
import {
  resolvePersonalVkUser,
  type VkEnv,
  vkErrorCode,
} from '../../_shared/vk.ts';

interface PagesContext {
  request: Request;
  env: VkEnv;
}

interface CachedStatus {
  checkedAt: number;
  credentials: string;
  body: { configured: true; ownerId: number; name: string; url: string };
}

// VK answers users.get with error 9 ("Flood control") when the check is repeated
// too often, so a confirmed connection is remembered and reused for a while.
const STATUS_TTL_MS = 10 * 60 * 1000;
const VK_FLOOD_CONTROL = 9;
let cachedStatus: CachedStatus | null = null;

// The cache belongs to one set of credentials: another token or owner id must
// never be answered from it.
const credentialsKey = (env: VkEnv) => `${env.VK_ACCESS_TOKEN?.trim() ?? ''}:${env.VK_OWNER_ID?.trim() ?? ''}`;

const cacheKeyMatches = (env: VkEnv, cached: CachedStatus) =>
  Boolean(env.VK_ACCESS_TOKEN?.trim()) && credentialsKey(env) === cached.credentials;

const freshCache = (env: VkEnv) => {
  if (!cachedStatus) return null;
  if (!cacheKeyMatches(env, cachedStatus)) return null;
  return Date.now() - cachedStatus.checkedAt < STATUS_TTL_MS ? cachedStatus : null;
};

export const onRequest = async ({ request, env }: PagesContext): Promise<Response> => {
  const cors = ownerCorsHeaders(request, env);
  const respond = (body: Record<string, unknown>, status = 200) => ownerJson(body, status, cors.headers);

  if (!cors.allowed) return respond({ error: 'Запрос отклонён.' }, 403);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors.headers });
  if (request.method !== 'POST') return respond({ error: 'Используйте POST-запрос.' }, 405);

  const auth = await authenticateOwner(request, env);
  if (!auth.ok) {
    return respond({ error: auth.status === 503 ? 'Закрытый редактор ещё не настроен.' : 'Неверный пароль владельца.' }, auth.status);
  }

  const cached = freshCache(env);
  if (cached) {
    return respond({ ...cached.body, cached: true, checkedAt: new Date(cached.checkedAt).toISOString() });
  }

  try {
    const { ownerId, user } = await resolvePersonalVkUser(env);
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    const body = {
      configured: true as const,
      ownerId,
      name: name || `ID ${ownerId}`,
      url: `https://vk.com/id${ownerId}`,
    };
    cachedStatus = { checkedAt: Date.now(), credentials: credentialsKey(env), body };
    return respond(body);
  } catch (error) {
    const reason = error instanceof Error ? error.message : '';
    if (reason === 'VK_NOT_CONFIGURED') {
      return respond({
        configured: false,
        error: 'Серверный доступ ВК не настроен: добавьте VK_ACCESS_TOKEN и VK_OWNER_ID в Cloudflare Pages.',
      }, 503);
    }
    const code = vkErrorCode(error);
    // Log only the upstream message, never request parameters or the Error object.
    let message = reason || 'Unknown upstream error';
    const token = env.VK_ACCESS_TOKEN?.trim();
    if (token) {
      message = message.replaceAll(token, '[redacted]').replaceAll(encodeURIComponent(token), '[redacted]');
    }
    console.error('VK users.get failed', { code, message: message.slice(0, 1000) });

    if (code === VK_FLOOD_CONTROL) {
      const stale = cachedStatus && cacheKeyMatches(env, cachedStatus) ? cachedStatus : null;
      if (stale) {
        return respond({
          ...stale.body,
          cached: true,
          stale: true,
          checkedAt: new Date(stale.checkedAt).toISOString(),
          notice: 'ВК временно ограничил частые проверки (код 9). Показано последнее успешное подключение.',
        });
      }
      return respond({
        configured: false,
        code,
        retryable: true,
        error: 'ВК временно ограничил частые проверки (код 9, Flood control). Подождите несколько минут и проверьте один раз.',
      }, 429);
    }

    return respond({
      configured: false,
      code,
      error: `Не удалось проверить подключение ВК${code ? ` (код ${code})` : ''}.`,
    }, 502);
  }
};
