import {
  authenticateOwner,
  ownerCorsHeaders,
  ownerJson,
  readJsonBody,
} from '../../_shared/owner-auth.ts';
import {
  callVk,
  resolvePersonalVkUser,
  type VkEnv,
  vkErrorCode,
} from '../../_shared/vk.ts';

interface PagesContext {
  request: Request;
  env: VkEnv;
}

interface PublishRequest {
  message?: unknown;
  approved?: unknown;
  requestId?: unknown;
  attachments?: unknown;
  publishAt?: unknown;
}

interface VkWallPostResponse { post_id?: number }

// The studio deliberately sends a compact 16-hex id: it is short enough for
// VK's `guid` parameter while still providing idempotency for repeat clicks.
// Keep accepting UUID v4 values for backwards compatibility with older builds.
const requestIdPattern = /^(?:[a-f\d]{16}|[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12})$/i;
const attachmentPattern = /^(photo|video)\d+_\d+(?:_[\w-]+)?$/;
const maximumScheduleSeconds = 365 * 24 * 60 * 60;

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
  let vkIdentity;
  try {
    vkIdentity = await resolvePersonalVkUser(request, env);
  } catch (error) {
    const code = vkErrorCode(error);
    return respond({ error: `Личная страница ВК не подключена${code ? ` (код ${code})` : ''}. Нажмите «Подключить мою страницу ВК».` }, 503);
  }
  const { ownerId, accessToken } = vkIdentity;

  const body = await readJsonBody<PublishRequest>(request, 32768);
  if (!body) return respond({ error: 'Не удалось прочитать запрос.' }, 400);
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const requestId = typeof body.requestId === 'string' ? body.requestId : '';
  const attachments = Array.isArray(body.attachments)
    ? body.attachments.filter((value): value is string => typeof value === 'string')
    : [];
  const publishAt = body.publishAt === null || body.publishAt === undefined || body.publishAt === ''
    ? null
    : Number(body.publishAt);

  if (body.approved !== true) return respond({ error: 'Публикация не подтверждена владельцем.' }, 409);
  if (message.length < 100 || message.length > 15000) {
    return respond({ error: 'Текст публикации должен содержать от 100 до 15 000 знаков.' }, 400);
  }
  if (!requestIdPattern.test(requestId)) return respond({ error: 'Обновите страницу и повторите попытку.' }, 400);
  if (attachments.length > 10 || attachments.some((value) => !attachmentPattern.test(value))) {
    return respond({ error: 'Список фотографий или видео сформирован неверно.' }, 400);
  }

  const now = Math.floor(Date.now() / 1000);
  if (publishAt !== null && (!Number.isSafeInteger(publishAt) || publishAt < now + 60 || publishAt > now + maximumScheduleSeconds)) {
    return respond({ error: 'Дата отложенной публикации должна быть в будущем, но не позднее чем через год.' }, 400);
  }

  const params = new URLSearchParams({
    owner_id: String(ownerId),
    message,
    guid: requestId,
  });
  if (attachments.length) params.set('attachments', attachments.join(','));
  if (publishAt !== null) params.set('publish_date', String(publishAt));

  try {
    const result = await callVk<VkWallPostResponse>(env, 'wall.post', params, accessToken);
    const postId = result.post_id;
    if (!postId) throw new Error('VK_WALL_POST_FAILED');
    return respond({
      published: true,
      scheduled: publishAt !== null,
      publishAt,
      postId,
      url: `https://vk.com/wall${ownerId}_${postId}`,
    });
  } catch (error) {
    const code = vkErrorCode(error);
    console.error('VK wall.post failed', code ?? error);
    return respond({
      error: `ВКонтакте не принял запись${code ? ` (код ${code})` : ''}. Проверьте стену перед повтором.`,
    }, 502);
  }
};
