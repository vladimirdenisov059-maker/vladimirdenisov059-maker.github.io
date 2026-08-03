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

  try {
    const { ownerId, user } = await resolvePersonalVkUser(request, env);
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    return respond({
      configured: true,
      ownerId,
      name: name || `ID ${ownerId}`,
      url: `https://vk.com/id${ownerId}`,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : '';
    if (reason === 'VK_NOT_CONFIGURED') {
      return respond({
        configured: false,
        error: 'Серверный доступ ВК не настроен: добавьте VK_ACCESS_TOKEN и VK_OWNER_ID в Cloudflare Pages.',
      }, 503);
    }
    const code = vkErrorCode(error);
    console.error('VK users.get failed', code ?? error);
    return respond({
      configured: false,
      error: `Не удалось проверить подключение ВК${code ? ` (код ${code})` : ''}.`,
    }, 502);
  }
};
