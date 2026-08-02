import {
  authenticateOwner,
  ownerCorsHeaders,
  ownerJson,
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

interface UploadServer {
  upload_url?: string;
}

interface PhotoUploadResult {
  server: number;
  photo: string;
  hash: string;
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
    const hostname = url.hostname.toLowerCase();
    const isVkUploadHost = hostname === 'vk.com'
      || hostname.endsWith('.vk.com')
      || hostname === 'vk.ru'
      || hostname.endsWith('.vk.ru')
      || hostname.endsWith('.vkuser.net')
      || hostname === 'userapi.com'
      || hostname.endsWith('.userapi.com')
      || hostname === 'vkuserphoto.ru'
      || hostname.endsWith('.vkuserphoto.ru')
      || hostname === 'vkvideo.ru'
      || hostname.endsWith('.vkvideo.ru')
      || hostname === 'vkontakte.ru'
      || hostname.endsWith('.vkontakte.ru')
      || hostname === 'ovu.mycdn.me'
      || hostname.endsWith('.vk-cdn.net');
    return url.protocol === 'https:' && isVkUploadHost ? url : null;
  } catch {
    return null;
  }
};

const asRecord = (value: unknown): Record<string, unknown> | null => (
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
);

const normalizePhotoUploadResult = (value: unknown): PhotoUploadResult | null => {
  const root = asRecord(value);
  const candidates = [root, asRecord(root?.response), asRecord(root?.data)].filter(
    (candidate): candidate is Record<string, unknown> => Boolean(candidate),
  );

  for (const candidate of candidates) {
    const rawServer = candidate.server;
    const server = typeof rawServer === 'number'
      ? rawServer
      : typeof rawServer === 'string' && rawServer.trim()
        ? Number(rawServer)
        : Number.NaN;
    const hash = typeof candidate.hash === 'string' ? candidate.hash.trim() : '';
    let photo = typeof candidate.photo === 'string' ? candidate.photo.trim() : '';
    if (!photo && candidate.photo !== undefined) {
      try { photo = JSON.stringify(candidate.photo); } catch { photo = ''; }
    }
    if (!photo && candidate.photos_list !== undefined) {
      if (typeof candidate.photos_list === 'string') {
        photo = candidate.photos_list.trim();
      } else {
        try { photo = JSON.stringify(candidate.photos_list); } catch { photo = ''; }
      }
    }
    if (Number.isFinite(server) && hash && photo && photo !== '[]' && photo !== '{}') {
      return { server, photo, hash };
    }
  }
  return null;
};

const uploadResponseFields = (value: unknown) => {
  const root = asRecord(value);
  const records = [root, asRecord(root?.response), asRecord(root?.data)].filter(
    (record): record is Record<string, unknown> => Boolean(record),
  );
  const fields = [...new Set(records.flatMap((record) => Object.keys(record)))]
    .filter((field) => /^[a-z0-9_]+$/i.test(field))
    .slice(0, 12);
  return fields.join(', ') || 'нет';
};
const uploadBody = async (request: Request, uploadUrl: URL) => {
  const contentType = request.headers.get('Content-Type') ?? '';
  if (!contentType.toLowerCase().startsWith('multipart/form-data;')) throw new Error('INVALID_MULTIPART');
  if (!request.body) throw new Error('EMPTY_UPLOAD_BODY');

  const contentLength = Number(request.headers.get('Content-Length') ?? '0');
  const FixedLengthStreamCtor = (globalThis as typeof globalThis & {
    FixedLengthStream?: new (length: number) => {
      readable: ReadableStream<Uint8Array>;
      writable: WritableStream<Uint8Array>;
    };
  }).FixedLengthStream;

  if (!Number.isSafeInteger(contentLength) || contentLength <= 0 || !FixedLengthStreamCtor) {
    const bufferedBody = await request.arrayBuffer();
    return fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body: bufferedBody,
    });
  }

  const fixedBody = new FixedLengthStreamCtor(contentLength);
  const piping = request.body.pipeTo(fixedBody.writable);
  const uploading = fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: fixedBody.readable,
  });
  const [response] = await Promise.all([uploading, piping]);
  return response;
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

  const bridgeUploadUrl = request.headers.get('X-VK-Upload-URL');
  if (bridgeUploadUrl) {
    const uploadUrl = safeUploadUrl(bridgeUploadUrl);
    if (!uploadUrl) {
      let hostname = 'неизвестен';
      try { hostname = new URL(bridgeUploadUrl).hostname; } catch { /* Keep the safe fallback. */ }
      return respond({ error: `ВКонтакте вернул недопустимый адрес загрузки (домен: ${hostname}).` }, 400);
    }
    try {
      const uploaded = await uploadBody(request, uploadUrl);
      const uploadReply = await uploaded.text();
      if (!uploaded.ok) {
        console.error('VK bridge upload server rejected file', kind, uploaded.status, uploadReply.slice(0, 500));
        return respond({ error: `Сервер загрузки ВКонтакте ответил HTTP ${uploaded.status}.` }, 502);
      }
      let parsedUploadResult: unknown = {};
      if (uploadReply.trim()) {
        try {
          parsedUploadResult = JSON.parse(uploadReply) as unknown;
        } catch {
          return respond({ error: 'Сервер загрузки ВКонтакте вернул непонятный ответ.' }, 502);
        }
      }
      const parsedRecord = asRecord(parsedUploadResult);
      if (parsedRecord && ('error' in parsedRecord || 'error_code' in parsedRecord)) {
        return respond({ error: 'ВКонтакте отклонил загружаемый файл.' }, 502);
      }
      if (kind === 'photo') {
        const uploadResult = normalizePhotoUploadResult(parsedUploadResult);
        if (!uploadResult) {
          return respond({
            error: 'Сервер ВКонтакте принял файл, но не вернул данные для сохранения фотографии (поля ответа: ' + uploadResponseFields(parsedUploadResult) + ').',
          }, 502);
        }
        return respond({ uploaded: true, kind, uploadResult });
      }
      const uploadResult = parsedRecord ?? {};
      return respond({ uploaded: true, kind, uploadResult });
    } catch (error) {
      console.error('VK bridge media proxy failed', kind, error);
      return respond({ error: 'Не удалось передать файл на сервер загрузки ВКонтакте.' }, 502);
    }
  }

  let vkIdentity;
  try {
    vkIdentity = await resolvePersonalVkUser(request, env);
  } catch (error) {
    const code = vkErrorCode(error);
    return respond({ error: `Не удалось подключить личную страницу ВК${code ? ` (код ${code})` : ''}.` }, 503);
  }
  const { ownerId, accessToken } = vkIdentity;
  try {
    if (kind === 'photo') {
      const server = await callVk<UploadServer>(env, 'photos.getWallUploadServer', new URLSearchParams(), accessToken);
      const uploadUrl = safeUploadUrl(server.upload_url);
      if (!uploadUrl) throw new Error('INVALID_UPLOAD_URL');
      const uploaded = await uploadBody(request, uploadUrl);
      const rawUploadResult = await uploaded.json() as unknown;
      const uploadResult = normalizePhotoUploadResult(rawUploadResult);
      if (!uploaded.ok || !uploadResult) {
        throw new Error('PHOTO_UPLOAD_FAILED');
      }
      const saved = await callVk<SavedPhoto[]>(env, 'photos.saveWallPhoto', new URLSearchParams({
        user_id: String(ownerId),
        photo: uploadResult.photo,
        server: String(uploadResult.server),
        hash: uploadResult.hash,
      }), accessToken);
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
    }), accessToken);
    const uploadUrl = safeUploadUrl(video.upload_url);
    if (!uploadUrl || !video.video_id || !video.owner_id || video.owner_id !== ownerId) throw new Error('VIDEO_SAVE_FAILED');
    const uploaded = await uploadBody(request, uploadUrl);
    const uploadReply = await uploaded.text();
    if (!uploaded.ok) {
      console.error('VK video upload server rejected file', uploaded.status, uploadReply.slice(0, 500));
      throw Object.assign(new Error('VIDEO_UPLOAD_FAILED'), { upstreamStatus: uploaded.status });
    }
    return respond({
      uploaded: true,
      kind,
      attachment: `video${video.owner_id}_${video.video_id}${video.access_key ? `_${video.access_key}` : ''}`,
    });
  } catch (error) {
    const code = vkErrorCode(error);
    const upstreamStatus = error && typeof error === 'object' && 'upstreamStatus' in error
      ? Number((error as { upstreamStatus?: unknown }).upstreamStatus)
      : null;
    console.error('VK media upload failed', kind, code ?? error);
    return respond({
      error: `ВКонтакте не принял ${kind === 'photo' ? 'фотографию' : 'видео'}${code ? ` (код ${code})` : ''}${upstreamStatus ? `: сервер загрузки ответил HTTP ${upstreamStatus}` : ''}.`,
    }, 502);
  }
};
