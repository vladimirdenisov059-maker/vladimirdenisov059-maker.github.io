import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { onRequest as generateVkDraft } from '../functions/api/owner/generate-vk.ts';
import { onRequest as publishVk } from '../functions/api/owner/publish-vk.ts';
import { onRequest as vkStatus } from '../functions/api/owner/vk-status.ts';
import { onRequest as uploadVkMedia } from '../functions/api/owner/upload-vk-media.ts';

const origin = 'https://vladimirdenisov059-maker.github.io';
const password = 'strong-owner-password-for-tests';
const ownerId = '12345';
const env = {
  ADMIN_PASSWORD: password,
  PROXYAPI_KEY: 'test-only',
  VK_ACCESS_TOKEN: 'vk-test-token',
  VK_OWNER_ID: ownerId,
};

const makeRequest = (path, body, authorization = `Bearer ${password}`) =>
  new Request(`https://gardens-of-donbas-api.pages.dev${path}`, {
    method: 'POST',
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      ...(authorization ? { Authorization: authorization } : {}),
    },
    body: JSON.stringify(body),
  });

const makeMediaRequest = (kind, file, uploadUrl = '') => {
  const body = new FormData();
  body.append(kind === 'photo' ? 'photo' : 'video_file', file, kind === 'photo' ? 'garden.jpg' : 'garden.mp4');
  return new Request(`https://gardens-of-donbas-api.pages.dev/api/owner/upload-vk-media?kind=${kind}`, {
    method: 'POST',
    headers: {
      Origin: origin,
      Authorization: `Bearer ${password}`,
      'X-File-Size': String(file.size),
      'X-File-Type': file.type,
      'X-Video-Title': 'garden-video',
      ...(uploadUrl ? { 'X-VK-Upload-URL': uploadUrl } : {}),
    },
    body,
  });
};

const preflight = await generateVkDraft({
  request: new Request('https://gardens-of-donbas-api.pages.dev/api/owner/generate-vk', {
    method: 'OPTIONS',
    headers: { Origin: origin },
  }),
  env: {},
});
assert.equal(preflight.status, 204);
assert.match(preflight.headers.get('Access-Control-Allow-Headers') ?? '', /Authorization/);
assert.match(preflight.headers.get('Access-Control-Allow-Headers') ?? '', /X-File-Size/);
assert.match(preflight.headers.get('Access-Control-Allow-Headers') ?? '', /X-VK-Access-Token/);
assert.match(preflight.headers.get('Access-Control-Allow-Headers') ?? '', /X-VK-Upload-URL/);

const missingPasswordSetup = await generateVkDraft({
  request: makeRequest('/api/owner/generate-vk', { plant: 'киви Стратона' }),
  env: { PROXYAPI_KEY: 'test-only' },
});
assert.equal(missingPasswordSetup.status, 503);

const wrongPassword = await generateVkDraft({
  request: makeRequest('/api/owner/generate-vk', { plant: 'киви Стратона' }, 'Bearer wrong-password-value'),
  env,
});
assert.equal(wrongPassword.status, 401);

let capturedPrompt = '';
let capturedWallParams;
let photoUploadWasStreamed = false;
let videoUploadWasStreamed = false;
let malformedPhotoUpload = false;
globalThis.fetch = async (url, options = {}) => {
  const target = String(url);
  if (target.includes('proxyapi.ru')) {
    const upstreamBody = JSON.parse(options.body);
    capturedPrompt = upstreamBody.contents[0].parts[0].text;
    return Response.json({ candidates: [{ content: { parts: [{ text: 'Киви Стратона: мой опыт\n\nПодробный проверяемый черновик для ВКонтакте.' }] } }] });
  }
  if (target.includes('/method/users.get')) {
    return Response.json({ response: [{ id: Number(ownerId), first_name: 'Владимир', last_name: 'Денисов', screen_name: 'dionis1959' }] });
  }
  if (target.includes('/method/photos.getWallUploadServer')) {
    return Response.json({ response: { upload_url: 'https://pu.vk.ru/test-photo-upload' } });
  }
  if (target === 'https://pu.vk.ru/test-photo-upload') {
    photoUploadWasStreamed = Boolean(options.body);
    if (malformedPhotoUpload) return Response.json({ request_id: 'test-request' });
    return Response.json({ response: { server: '7', photo: [{ photo: 'payload' }], hash: 'photo-hash' } });
  }
  if (target.includes('/method/photos.saveWallPhoto')) {
    return Response.json({ response: [{ owner_id: Number(ownerId), id: 77 }] });
  }
  if (target.includes('/method/video.save')) {
    return Response.json({ response: { upload_url: 'https://pu.vk.ru/test-video-upload', owner_id: Number(ownerId), video_id: 88 } });
  }
  if (target === 'https://pu.vk.ru/test-video-upload' || target === 'https://ovu.mycdn.me/test-video-upload') {
    videoUploadWasStreamed = Boolean(options.body);
    return Response.json({ size: 1024, owner_id: Number(ownerId), video_id: 88 });
  }
  if (target.includes('/method/wall.post')) {
    capturedWallParams = new URLSearchParams(options.body);
    return Response.json({ response: { post_id: 321 } });
  }
  throw new Error(`Unexpected URL: ${target}`);
};

const draftResponse = await generateVkDraft({
  request: makeRequest('/api/owner/generate-vk', {
    plant: 'киви Стратона',
    focus: 'Два этапа опыта',
    notes: 'Не смешивать возраст сеянцев с общим опытом.',
  }),
  env,
});
const draftBody = await draftResponse.json();
assert.equal(draftResponse.status, 200);
assert.equal(draftBody.vkConfigured, true);
assert.equal(draftBody.matchedPlant, 'Киви Стратона');
assert.match(capturedPrompt, /Пиши от первого лица/);
assert.match(capturedPrompt, /Первые примерно 15 лет/);
assert.match(capturedPrompt, /Только после 2019 года/);

const statusResponse = await vkStatus({ request: makeRequest('/api/owner/vk-status', {}), env });
const statusBody = await statusResponse.json();
assert.equal(statusResponse.status, 200);
assert.equal(statusBody.configured, true);
assert.equal(statusBody.name, 'Владимир Денисов');

const temporaryTokenRequest = makeRequest('/api/owner/vk-status', {});
temporaryTokenRequest.headers.set('X-VK-Access-Token', 'temporary-vk-user-token');
const temporaryStatusResponse = await vkStatus({
  request: temporaryTokenRequest,
  env: { ADMIN_PASSWORD: password },
});
assert.equal(temporaryStatusResponse.status, 200);
assert.equal((await temporaryStatusResponse.json()).ownerId, Number(ownerId));

const photo = new File([new Uint8Array([1, 2, 3])], 'garden.jpg', { type: 'image/jpeg' });
const photoResponse = await uploadVkMedia({ request: makeMediaRequest('photo', photo), env });
const photoBody = await photoResponse.json();
assert.equal(photoResponse.status, 200);
assert.equal(photoBody.attachment, 'photo12345_77');
assert.equal(photoUploadWasStreamed, true);

const bridgePhotoResponse = await uploadVkMedia({
  request: makeMediaRequest('photo', photo, 'https://pu.vk.ru/test-photo-upload'),
  env: { ADMIN_PASSWORD: password },
});
const bridgePhotoBody = await bridgePhotoResponse.json();
assert.equal(bridgePhotoResponse.status, 200);
assert.deepEqual(bridgePhotoBody.uploadResult, {
  server: 7,
  photo: '[{"photo":"payload"}]',
  hash: 'photo-hash',
});

malformedPhotoUpload = true;
const malformedBridgePhotoResponse = await uploadVkMedia({
  request: makeMediaRequest('photo', photo, 'https://pu.vk.ru/test-photo-upload'),
  env: { ADMIN_PASSWORD: password },
});
malformedPhotoUpload = false;
const malformedBridgePhotoBody = await malformedBridgePhotoResponse.json();
assert.equal(malformedBridgePhotoResponse.status, 502);
assert.match(malformedBridgePhotoBody.error, /поля ответа: request_id/);

const video = new File([new Uint8Array([1, 2, 3, 4])], 'garden.mp4', { type: 'video/mp4' });
const videoResponse = await uploadVkMedia({ request: makeMediaRequest('video', video), env });
const videoBody = await videoResponse.json();
assert.equal(videoResponse.status, 200);
assert.equal(videoBody.attachment, 'video12345_88');
assert.equal(videoUploadWasStreamed, true);
const bridgeVideoResponse = await uploadVkMedia({
  request: makeMediaRequest('video', video, 'https://ovu.mycdn.me/test-video-upload'),
  env: { ADMIN_PASSWORD: password },
});
const bridgeVideoBody = await bridgeVideoResponse.json();
assert.equal(bridgeVideoResponse.status, 200);
assert.equal(bridgeVideoBody.uploaded, true);
assert.equal(bridgeVideoBody.kind, 'video');
assert.deepEqual(bridgeVideoBody.uploadResult, { size: 1024, owner_id: Number(ownerId), video_id: 88 });

const unsafeBridgeResponse = await uploadVkMedia({
  request: makeMediaRequest('video', video, 'https://example.com/upload'),
  env: { ADMIN_PASSWORD: password },
});
assert.equal(unsafeBridgeResponse.status, 400);

const publishWithoutApproval = await publishVk({
  request: makeRequest('/api/owner/publish-vk', {
    message: 'Текст '.repeat(30), approved: false, requestId: '123e4567-e89b-42d3-a456-426614174000',
  }),
  env,
});
assert.equal(publishWithoutApproval.status, 409);

const invalidSchedule = await publishVk({
  request: makeRequest('/api/owner/publish-vk', {
    message: 'Текст '.repeat(30), approved: true, requestId: '123e4567-e89b-42d3-a456-426614174000', publishAt: 1,
  }),
  env,
});
assert.equal(invalidSchedule.status, 400);

const approvedMessage = 'Проверенный автором текст публикации. '.repeat(8);
const publishAt = Math.floor(Date.now() / 1000) + 3600;
const publishResponse = await publishVk({
  request: makeRequest('/api/owner/publish-vk', {
    message: approvedMessage,
    attachments: ['photo12345_77', 'video12345_88'],
    publishAt,
    approved: true,
    requestId: '123e4567e89b42d3',
  }),
  env,
});
const publishBody = await publishResponse.json();
assert.equal(publishResponse.status, 200);
assert.equal(publishBody.published, true);
assert.equal(publishBody.scheduled, true);
assert.equal(publishBody.url, 'https://vk.com/wall12345_321');
assert.equal(capturedWallParams.get('owner_id'), ownerId);
assert.equal(capturedWallParams.get('attachments'), 'photo12345_77,video12345_88');
assert.equal(capturedWallParams.get('publish_date'), String(publishAt));
assert.equal(capturedWallParams.get('guid'), '123e4567e89b42d3');
assert.equal(capturedWallParams.get('access_token'), 'vk-test-token');

const studioSource = readFileSync(new URL('../src/pages/studio-vd.astro', import.meta.url), 'utf8');
const uploadSource = readFileSync(new URL('../functions/api/owner/upload-vk-media.ts', import.meta.url), 'utf8');
assert.doesNotMatch(studioSource, /VKWebAppInit/);
assert.doesNotMatch(studioSource, /VKWebAppGetAuthToken/);
assert.doesNotMatch(studioSource, /VKWebAppShowWallPostBox/);
assert.doesNotMatch(studioSource, /@vkontakte\/vk-bridge/);
assert.match(studioSource, /preparePhotoForVk/);
assert.match(studioSource, /createImageBitmap/);
assert.match(studioSource, /Повторяем загрузку файла/);
assert.match(studioSource, /api\/owner\/publish-vk/);
assert.match(studioSource, /slice\(0, 16\)/);
assert.match(studioSource, /error_data/);
assert.doesNotMatch(studioSource, /fetch\(server\.upload_url/);
assert.doesNotMatch(studioSource, /fetch\(video\.upload_url/);
assert.match(studioSource, /Пост не создан и не поставлен в очередь/);
assert.match(studioSource, /Вложения прикреплены/);
assert.match(studioSource, /failed to fetch\|load failed\|networkerror/);
assert.ok(studioSource.includes("'garden-' + kind + '.' + extension"));
assert.match(uploadSource, /FixedLengthStream/);
assert.match(uploadSource, /Content-Length/);
assert.match(uploadSource, /сервер загрузки ответил HTTP/);
assert.match(uploadSource, /bridgeUploadUrl/);
assert.match(uploadSource, /isVkUploadHost/);

console.log('Owner studio checks passed: authentication, VK server-side publish, media uploads and scheduling');
