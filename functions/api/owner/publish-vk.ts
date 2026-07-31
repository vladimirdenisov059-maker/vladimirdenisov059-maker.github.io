import {
  authenticateOwner,
  ownerCorsHeaders,
  ownerJson,
  readJsonBody,
  type OwnerEnv,
} from '../../_shared/owner-auth.ts';

interface Env extends OwnerEnv {
  VK_ACCESS_TOKEN?: string;
  VK_OWNER_ID?: string;
  VK_API_VERSION?: string;
}

interface PagesContext {
  request: Request;
  env: Env;
}

interface PublishRequest {
  message?: unknown;
  approved?: unknown;
  requestId?: unknown;
}

interface VkResponse {
  response?: { post_id?: number };
  error?: { error_code?: number; error_msg?: string };
}

const requestIdPattern = /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;

export const onRequest = async ({ request, env }: PagesContext): Promise<Response> => {
  const cors = ownerCorsHeaders(request, env);
  const respond = (body: Record<string, unknown>, status = 200) => ownerJson(body, status, cors.headers);

  if (!cors.allowed) return respond({ error: 'Запрос отклонён.' }, 403);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors.headers });
  if (request.method !== 'POST') return respond({ error: 'Используйте POST-запрос.' }, 405);

  const auth = await authenticateOwner(request, env);
  if (!auth.ok) {
    return respond({
      error: auth.status === 503
        ? 'Закрытый редактор ещё не настроен владельцем.'
        : 'Неверный пароль владельца.',
    }, auth.status);
  }
  if (!env.VK_ACCESS_TOKEN || !env.VK_OWNER_ID) {
    return respond({ error: 'Публикация в ВК ещё не подключена. Черновик можно сохранить и скопировать.' }, 503);
  }

  const body = await readJsonBody<PublishRequest>(request, 24576);
  if (!body) return respond({ error: 'Не удалось прочитать запрос.' }, 400);
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const requestId = typeof body.requestId === 'string' ? body.requestId : '';
  if (body.approved !== true) return respond({ error: 'Публикация не подтверждена владельцем.' }, 409);
  if (message.length < 100 || message.length > 15000) {
    return respond({ error: 'Текст публикации должен содержать от 100 до 15 000 знаков.' }, 400);
  }
  if (!requestIdPattern.test(requestId)) return respond({ error: 'Обновите страницу и повторите попытку.' }, 400);
  if (!/^-?\d+$/.test(env.VK_OWNER_ID)) return respond({ error: 'Идентификатор страницы ВК настроен неверно.' }, 503);

  const params = new URLSearchParams({
    owner_id: env.VK_OWNER_ID,
    message,
    guid: requestId,
    access_token: env.VK_ACCESS_TOKEN,
    v: env.VK_API_VERSION || '5.199',
  });

  let upstream: Response;
  try {
    upstream = await fetch('https://api.vk.com/method/wall.post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
  } catch {
    return respond({ error: 'ВКонтакте временно недоступен. Текст не опубликован.' }, 502);
  }

  let result: VkResponse;
  try {
    result = await upstream.json() as VkResponse;
  } catch {
    return respond({ error: 'ВКонтакте вернул некорректный ответ. Проверьте стену перед повтором.' }, 502);
  }
  const postId = result.response?.post_id;
  if (!upstream.ok || !postId) {
    console.error('VK wall.post failed', result.error?.error_code ?? upstream.status);
    return respond({
      error: `ВКонтакте не опубликовал запись${result.error?.error_code ? ` (код ${result.error.error_code})` : ''}.`,
    }, 502);
  }

  return respond({
    published: true,
    postId,
    url: `https://vk.com/wall${env.VK_OWNER_ID}_${postId}`,
  });
};