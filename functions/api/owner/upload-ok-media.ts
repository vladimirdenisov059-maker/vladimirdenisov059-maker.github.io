import {
  authenticateOwner,
  ownerCorsHeaders,
  ownerJson,
} from '../../_shared/owner-auth.ts';
import {
  callOk,
  okErrorCode,
  okConfigured,
  type OkEnv,
} from '../../_shared/ok.ts';

interface PagesContext {
  request: Request;
  env: OkEnv;
}

const PHOTO_LIMIT = 25 * 1024 * 1024;
const VIDEO_LIMIT = 95 * 1024 * 1024;
const photoTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const videoTypes = new Set(['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska']);

interface OkUploadUrlResponse { upload_url?: string }
interface OkPhotoUploadResult { photos?: Record<string, { token?: string; error?: string }> }
interface OkVideoUploadResult { video_id?: string; upload_url?: string; error?: string }

const safeUploadUrl = (value: string | undefined) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const isOkHost = hostname === 'ok.ru' || hostname.endsWith('.ok.ru') || hostname.endsWith('.mycdn.me') || hostname.endsWith('.odnoklassniki.ru');
    return url.protocol === 'https:' && isOkHost ? url : null;
  } catch {
    return null;
  }
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
  if (auth.role === 'reviewer') {
    return respond({ error: 'Демонстрационный доступ: загрузка файлов в Одноклассники недоступна.' }, 403);
  }
  if (!okConfigured(env)) {
    return respond({ error: 'Серверный доступ ОК не настроен: добавьте OK_APPLICATION_KEY, OK_APPLICATION_SECRET_KEY и OK_ACCESS_TOKEN в Cloudflare Pages.' }, 503);
  }

  const requestUrl = new URL(request.url);
  const kind = requestUrl.searchParams.get('kind');
  const fileSize = Number(request.headers.get('X-File-Size') ?? '0');
  const fileType = (request.headers.get('X-File-Type') ?? '').toLowerCase();
  if (!Number.isSafeInteger(fileSize) || fileSize <= 0) return respond({ error: 'Не удалось определить размер файла.' }, 400);
  if (kind === 'photo' && (!photoTypes.has(fileType) || fileSize > PHOTO_LIMIT)) {
    return respond({ error: 'Фотография должна быть JPG, PNG или WebP размером не более 25 МБ.' }, 400);
  }
  if (kind === 'video' && (!videoTypes.has(fileType) || fileSize > VIDEO_LIMIT)) {
    return respond({ error: 'Видео должно быть MP4, WebM, MOV или MKV размером не более 95 МБ.' }, 400);
  }
  if (kind !== 'photo' && kind !== 'video') return respond({ error: 'Неизвестный тип вложения.' }, 400);

  const contentType = request.headers.get('Content-Type') ?? '';
  if (!contentType.toLowerCase().startsWith('multipart/form-data;') || !request.body) {
    return respond({ error: 'Не удалось прочитать файл.' }, 400);
  }
  const bodyBuffer = await request.arrayBuffer();

  try {
    if (kind === 'photo') {
      const uploadUrlParams: Record<string, string> = env.OK_GROUP_ID ? { gid: env.OK_GROUP_ID } : {};
      const server = await callOk<OkUploadUrlResponse>(env, 'photosV2.getUploadUrl', uploadUrlParams);
      const uploadUrl = safeUploadUrl(server.upload_url);
      if (!uploadUrl) throw new Error('OK_UPLOAD_URL_INVALID');

      const form = new FormData();
      form.append('pics[]', new Blob([bodyBuffer], { type: fileType }), 'garden-photo.jpg');
      const uploaded = await fetch(uploadUrl, { method: 'POST', body: form });
      if (!uploaded.ok) throw new Error('OK_PHOTO_UPLOAD_FAILED');
      const uploadResult = await uploaded.json() as OkPhotoUploadResult;
      const firstEntry = uploadResult.photos ? Object.values(uploadResult.photos)[0] : undefined;
      if (!firstEntry?.token) throw new Error('OK_PHOTO_UPLOAD_FAILED');
      return respond({ uploaded: true, kind, attachment: `photo:${firstEntry.token}` });
    }

    const videoStart = await callOk<OkVideoUploadResult>(env, 'video.getUploadUrl', {
      ...(env.OK_GROUP_ID ? { gid: env.OK_GROUP_ID } : {}),
    });
    const uploadUrl = safeUploadUrl(videoStart.upload_url);
    if (!uploadUrl || !videoStart.video_id) throw new Error('OK_VIDEO_UPLOAD_URL_INVALID');
    const form = new FormData();
    form.append('file', new Blob([bodyBuffer], { type: fileType }), 'garden-video.mp4');
    const uploaded = await fetch(uploadUrl, { method: 'POST', body: form });
    if (!uploaded.ok) throw new Error('OK_VIDEO_UPLOAD_FAILED');
    return respond({ uploaded: true, kind, attachment: `video:${videoStart.video_id}` });
  } catch (error) {
    const code = okErrorCode(error);
    console.error('OK media upload failed', kind, code ?? error);
    return respond({
      error: `Одноклассники не приняли ${kind === 'photo' ? 'фотографию' : 'видео'}${code ? ` (код ${code})` : ''}.`,
    }, 502);
  }
};
