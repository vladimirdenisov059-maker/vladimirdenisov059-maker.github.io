import {
  authenticateOwner,
  ownerCorsHeaders,
  ownerJson,
  readJsonBody,
} from '../../_shared/owner-auth.ts';
import {
  callOk,
  okConfigured,
  okErrorCode,
  type OkEnv,
} from '../../_shared/ok.ts';

interface PagesContext {
  request: Request;
  env: OkEnv;
}

interface PublishRequest {
  message?: unknown;
  approved?: unknown;
  attachments?: unknown;
}

interface OkMediaItem {
  type: 'photo' | 'movie';
  list: Array<{ id: string }>;
}

interface OkMediatopicResponse { id?: string }

const attachmentPattern = /^(photo|video):[\w.+/=-]+$/;

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
  if (auth.role === 'reviewer') {
    return respond({ error: 'Демонстрационный доступ: реальная публикация в Одноклассниках недоступна.' }, 403);
  }
  if (!okConfigured(env)) {
    return respond({ error: 'Серверный доступ ОК не настроен: добавьте OK_APPLICATION_KEY, OK_APPLICATION_SECRET_KEY и OK_ACCESS_TOKEN в Cloudflare Pages.' }, 503);
  }
  if (!env.OK_GROUP_ID) {
    return respond({ error: 'Не указана группа ОК для публикации: добавьте OK_GROUP_ID в Cloudflare Pages.' }, 503);
  }

  const body = await readJsonBody<PublishRequest>(request, 32768);
  if (!body) return respond({ error: 'Не удалось прочитать запрос.' }, 400);
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const attachments = Array.isArray(body.attachments)
    ? body.attachments.filter((value): value is string => typeof value === 'string')
    : [];

  if (body.approved !== true) return respond({ error: 'Публикация не подтверждена владельцем.' }, 409);
  if (message.length < 100 || message.length > 15000) {
    return respond({ error: 'Текст публикации должен содержать от 100 до 15 000 знаков.' }, 400);
  }
  if (attachments.length > 10 || attachments.some((value) => !attachmentPattern.test(value))) {
    return respond({ error: 'Список фотографий или видео сформирован неверно.' }, 400);
  }

  const media: Array<{ type: 'text'; text: string } | OkMediaItem> = [{ type: 'text', text: message }];
  const photoIds = attachments.filter((value) => value.startsWith('photo:')).map((value) => value.slice('photo:'.length));
  const videoIds = attachments.filter((value) => value.startsWith('video:')).map((value) => value.slice('video:'.length));
  if (photoIds.length) media.push({ type: 'photo', list: photoIds.map((id) => ({ id })) });
  if (videoIds.length) media.push({ type: 'movie', list: videoIds.map((id) => ({ id })) });

  try {
    const result = await callOk<OkMediatopicResponse>(env, 'mediatopic.post', {
      gid: env.OK_GROUP_ID,
      type: 'GROUP_THEME',
      attachment: JSON.stringify({ media }),
    });
    const postId = result.id;
    if (!postId) throw new Error('OK_MEDIATOPIC_POST_FAILED');
    return respond({
      published: true,
      postId,
      url: `https://ok.ru/group/${env.OK_GROUP_ID}/topic/${postId}`,
    });
  } catch (error) {
    const code = okErrorCode(error);
    console.error('OK mediatopic.post failed', code ?? error);
    return respond({
      error: `Одноклассники не приняли запись${code ? ` (код ${code})` : ''}.`,
    }, 502);
  }
};
