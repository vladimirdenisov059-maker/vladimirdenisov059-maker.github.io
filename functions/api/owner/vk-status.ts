import {
  authenticateOwner,
  ownerCorsHeaders,
  ownerJson,
} from '../../_shared/owner-auth.ts';
import {
  callVk,
  configuredPersonalOwnerId,
  type VkEnv,
  vkErrorCode,
} from '../../_shared/vk.ts';

interface PagesContext {
  request: Request;
  env: VkEnv;
}

interface VkUser {
  id: number;
  first_name?: string;
  last_name?: string;
  screen_name?: string;
}

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

  const ownerId = configuredPersonalOwnerId(env);
  if (!ownerId) {
    return respond({
      configured: false,
      error: 'Личная страница ВКонтакте ещё не подключена.',
    }, 503);
  }

  try {
    const users = await callVk<VkUser[]>(env, 'users.get', new URLSearchParams({
      user_ids: String(ownerId),
      fields: 'screen_name',
    }));
    const user = users[0];
    if (!user || user.id !== ownerId) {
      return respond({ configured: false, error: 'Токен ВК не соответствует выбранной личной странице.' }, 409);
    }
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    return respond({
      configured: true,
      ownerId,
      name: name || `ID ${ownerId}`,
      url: `https://vk.com/id${ownerId}`,
    });
  } catch (error) {
    const code = vkErrorCode(error);
    console.error('VK users.get failed', code ?? error);
    return respond({
      configured: false,
      error: `Не удалось проверить подключение ВК${code ? ` (код ${code})` : ''}.`,
    }, 502);
  }
};
