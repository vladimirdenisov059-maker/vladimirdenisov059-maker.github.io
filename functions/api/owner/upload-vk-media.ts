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

interface UploadServer {
  upload_url?: string;
}

interface PhotoUploadResult {
  server?: number;
  photo?: string;
  hash?: string;
}

interface SavedPhoto {
  id?: number;
  owner_id?: number;
  access_key?: string;
}

interface SavedVideo extends UploadServer {
  video_id?: number;
  owner_id?: number;
  access_key?: string;
}

const PHOTO_LIMIT = 25 * 1024 * 1024;
const VIDEO_LIMIT = 95 * 1024 * 1024;
const photoTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const videoTypes = new Set(['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska']);

const safeUploadUrl = (value: string | undefined) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
};

const uploadBody = async (request: Request, uploadUrl: URL) => {
  const contentType = request.headers.get('Content-Type') ?? '';
  if (!contentType.toLowerCase().startsWith('multipart/form-data;')) throw new Error('INVALID_MULTIPART');
  return fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: request.body,
  });
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
  const ownerId = configuredPersonalOwnerId(env);
  if (!ownerId) return respond({ error: 'Личная страница ВКонтакте ещё не подключена.' }, 503);

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

  try {
    if (kind === 'photo') {
      const server = await callVk<UploadServer>(env, 'photos.getWallUploadServer', new URLSearchParams());
      const uploadUrl = safeUploadUrl(server.upload_url);
      if (!uploadUrl) throw new Error('INVALID_UPLOAD_URL');
      const uploaded = await uploadBody(request, uploadUrl);
      const uploadResult = await uploaded.json() as PhotoUploadResult;
      if (!uploaded.ok || !uploadResult.photo || !uploadResult.hash || uploadResult.server === undefined) {
        throw new Error('PHOTO_UPLOAD_FAILED');
      }
      const saved = await callVk<SavedPhoto[]>(env, 'photos.saveWallPhoto', new URLSearchParams({
        user_id: String(ownerId),
        photo: uploadResult.photo,
        server: String(uploadResult.server),
        hash: uploadResult.hash,
      }));
      const photo = saved[0];
      if (!photo?.id || !photo.owner_id || photo.owner_id !== ownerId) throw new Error('PHOTO_SAVE_FAILED');
      return respond({
        uploaded: true,
        kind,
        attachment: `photo${photo.owner_id}_${photo.id}${photo.access_key ? `_${photo.access_key}` : ''}`,
      });
    }

    const requestedTitle = decodeURIComponent(request.headers.get('X-Video-Title') ?? '').trim().slice(0, 128);
    const video = await callVk<SavedVideo>(env, 'video.save', new URLSearchParams({
      name: requestedTitle || 'Видео из сада Владимира Денисова',
      wallpost: '0',
    }));
    const uploadUrl = safeUploadUrl(video.upload_url);
    if (!uploadUrl || !video.video_id || !video.owner_id || video.owner_id !== ownerId) throw new Error('VIDEO_SAVE_FAILED');
    const uploaded = await uploadBody(request, uploadUrl);
    if (!uploaded.ok) throw new Error('VIDEO_UPLOAD_FAILED');
    await uploaded.text();
    return respond({
      uploaded: true,
      kind,
      attachment: `video${video.owner_id}_${video.video_id}${video.access_key ? `_${video.access_key}` : ''}`,
    });
  } catch (error) {
    const code = vkErrorCode(error);
    console.error('VK media upload failed', kind, code ?? error);
    return respond({
      error: `ВКонтакте не принял ${kind === 'photo' ? 'фотографию' : 'видео'}${code ? ` (код ${code})` : ''}.`,
    }, 502);
  }
};
