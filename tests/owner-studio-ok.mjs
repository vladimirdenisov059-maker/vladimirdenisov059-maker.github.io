import assert from 'node:assert/strict';
import { md5Hex } from '../functions/_shared/md5.ts';
import { onRequest as okStatus } from '../functions/api/owner/ok-status.ts';
import { onRequest as publishOk } from '../functions/api/owner/publish-ok.ts';
import { onRequest as uploadOkMedia } from '../functions/api/owner/upload-ok-media.ts';

// RFC 1321 reference vectors for the hand-rolled MD5 implementation OK's signature scheme needs.
assert.equal(md5Hex(''), 'd41d8cd98f00b204e9800998ecf8427e');
assert.equal(md5Hex('abc'), '900150983cd24fb0d6963f7d28e17f72');
assert.equal(md5Hex('message digest'), 'f96b697d7cb7938d525a2f31aaf161d0');

const origin = 'https://vladimirdenisov059-maker.github.io';
const password = 'strong-owner-password-for-tests';
const applicationKey = 'ok-test-app-key';
const secretKey = 'ok-test-secret-key';
const accessToken = 'ok-test-access-token';
const groupId = '70000055666856';
const env = {
  ADMIN_PASSWORD: password,
  OK_APPLICATION_KEY: applicationKey,
  OK_APPLICATION_SECRET_KEY: secretKey,
  OK_ACCESS_TOKEN: accessToken,
  OK_GROUP_ID: groupId,
};

// Independent re-implementation of OK's "server access_token" signature so the test doesn't
// just re-assert whatever functions/_shared/ok.ts happens to compute internally.
const expectedSig = (params) => {
  const innerHash = md5Hex(accessToken + secretKey);
  const sortedKeys = Object.keys(params).sort();
  const concatenated = sortedKeys.map((key) => `${key}=${params[key]}`).join('');
  return md5Hex(concatenated + innerHash);
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

const makeMediaRequest = (kind, file) => {
  const form = new FormData();
  form.append(kind === 'photo' ? 'photo' : 'video_file', file, kind === 'photo' ? 'garden.jpg' : 'garden.mp4');
  return new Request(`https://gardens-of-donbas-api.pages.dev/api/owner/upload-ok-media?kind=${kind}`, {
    method: 'POST',
    headers: {
      Origin: origin,
      Authorization: `Bearer ${password}`,
      'X-File-Size': String(file.size),
      'X-File-Type': file.type,
    },
    body: form,
  });
};

// -- ok-status: unconfigured and auth failures --------------------------------------------

const wrongPasswordStatus = await okStatus({
  request: makeRequest('/api/owner/ok-status', {}, 'Bearer wrong-password-value'),
  env,
});
assert.equal(wrongPasswordStatus.status, 401);

const unconfiguredStatus = await okStatus({
  request: makeRequest('/api/owner/ok-status', {}),
  env: { ADMIN_PASSWORD: password },
});
assert.equal(unconfiguredStatus.status, 503);
assert.equal((await unconfiguredStatus.json()).configured, false);

// -- shared fetch mock for the OK REST endpoint and upload targets ------------------------

let lastOkCallParams = null;
let lastOkCallSig = null;
let capturedMediatopicParams = null;
let photoUploadWasCalled = false;
let videoUploadWasCalled = false;
let uploadUrlOverride = null;

globalThis.fetch = async (url, options = {}) => {
  const target = String(url);

  if (target === 'https://api.ok.ru/fb.do') {
    const params = new URLSearchParams(options.body);
    const sig = params.get('sig');
    const rest = {};
    for (const [key, value] of params.entries()) {
      if (key !== 'sig') rest[key] = value;
    }
    lastOkCallParams = rest;
    lastOkCallSig = sig;

    const method = params.get('method');
    if (method === 'users.getCurrentUser') {
      return Response.json({ uid: '512005340310', name: 'Владимир Денисов' });
    }
    if (method === 'mediatopic.post') {
      capturedMediatopicParams = rest;
      return Response.json({ id: '999888' });
    }
    if (method === 'photosV2.getUploadUrl') {
      return Response.json({ upload_url: uploadUrlOverride ?? 'https://api.ok.ru/test-photo-upload' });
    }
    if (method === 'video.getUploadUrl') {
      return Response.json({ upload_url: uploadUrlOverride ?? 'https://api.ok.ru/test-video-upload', video_id: 'v-77' });
    }
    throw new Error(`Unexpected OK method: ${method}`);
  }

  if (target === 'https://api.ok.ru/test-photo-upload') {
    photoUploadWasCalled = true;
    return Response.json({ photos: { 'garden-photo.jpg': { token: 'photo-token-123' } } });
  }
  if (target === 'https://api.ok.ru/test-video-upload') {
    videoUploadWasCalled = true;
    return Response.json({});
  }

  throw new Error(`Unexpected URL: ${target}`);
};

// -- ok-status: configured happy path + signature correctness -----------------------------

const configuredStatus = await okStatus({ request: makeRequest('/api/owner/ok-status', {}), env });
const configuredStatusBody = await configuredStatus.json();
assert.equal(configuredStatus.status, 200);
assert.equal(configuredStatusBody.configured, true);
assert.equal(configuredStatusBody.uid, '512005340310');
assert.equal(configuredStatusBody.name, 'Владимир Денисов');
assert.equal(lastOkCallParams.application_key, applicationKey);
assert.equal(lastOkCallParams.access_token, accessToken);
assert.equal(lastOkCallSig, expectedSig(lastOkCallParams));

// -- publish-ok: validation and access control ---------------------------------------------

const reviewPassword = 'temporary-reviewer-password-12';
const reviewEnv = {
  ...env,
  REVIEW_PASSWORD: reviewPassword,
  REVIEW_EXPIRES_AT: new Date(Date.now() + 60_000).toISOString(),
};

const reviewerBlocked = await publishOk({
  request: makeRequest('/api/owner/publish-ok', { message: 'Текст '.repeat(30), approved: true }, `Bearer ${reviewPassword}`),
  env: reviewEnv,
});
assert.equal(reviewerBlocked.status, 403);

const missingGroupId = await publishOk({
  request: makeRequest('/api/owner/publish-ok', { message: 'Текст '.repeat(30), approved: true }),
  env: { ...env, OK_GROUP_ID: undefined },
});
assert.equal(missingGroupId.status, 503);

const notApproved = await publishOk({
  request: makeRequest('/api/owner/publish-ok', { message: 'Текст '.repeat(30), approved: false }),
  env,
});
assert.equal(notApproved.status, 409);

const tooShortMessage = await publishOk({
  request: makeRequest('/api/owner/publish-ok', { message: 'Коротко', approved: true }),
  env,
});
assert.equal(tooShortMessage.status, 400);

const badAttachment = await publishOk({
  request: makeRequest('/api/owner/publish-ok', {
    message: 'Проверенный автором текст публикации. '.repeat(8),
    approved: true,
    attachments: ['not-a-valid-attachment'],
  }),
  env,
});
assert.equal(badAttachment.status, 400);

// -- publish-ok: happy path ------------------------------------------------------------------

const publishMessage = 'Проверенный автором текст публикации для Одноклассников. '.repeat(6);
const publishResponse = await publishOk({
  request: makeRequest('/api/owner/publish-ok', {
    message: publishMessage,
    approved: true,
    attachments: ['photo:token-abc', 'video:video-77'],
  }),
  env,
});
const publishBody = await publishResponse.json();
assert.equal(publishResponse.status, 200);
assert.equal(publishBody.published, true);
assert.equal(publishBody.postId, '999888');
assert.equal(publishBody.url, `https://ok.ru/group/${groupId}/topic/999888`);
assert.equal(capturedMediatopicParams.gid, groupId);
assert.equal(capturedMediatopicParams.type, 'GROUP_THEME');
const attachmentPayload = JSON.parse(capturedMediatopicParams.attachment);
assert.deepEqual(attachmentPayload.media[0], { type: 'text', text: publishMessage.trim() });
assert.deepEqual(attachmentPayload.media[1], { type: 'photo', list: [{ id: 'token-abc' }] });
assert.deepEqual(attachmentPayload.media[2], { type: 'movie', list: [{ id: 'video-77' }] });

// -- upload-ok-media: validation, access control and signature ------------------------------

const oversizedPhoto = new File([new Uint8Array(1)], 'garden.jpg', { type: 'image/jpeg' });
const badSizeHeaderRequest = makeMediaRequest('photo', oversizedPhoto);
badSizeHeaderRequest.headers.set('X-File-Size', '999999999999');
const badSizeResponse = await uploadOkMedia({ request: badSizeHeaderRequest, env });
assert.equal(badSizeResponse.status, 400);

const wrongTypePhoto = new File([new Uint8Array([1, 2, 3])], 'garden.txt', { type: 'text/plain' });
const wrongTypeResponse = await uploadOkMedia({ request: makeMediaRequest('photo', wrongTypePhoto), env });
assert.equal(wrongTypeResponse.status, 400);

const photo = new File([new Uint8Array([1, 2, 3])], 'garden.jpg', { type: 'image/jpeg' });
const uploadReviewerRequest = makeMediaRequest('photo', photo);
uploadReviewerRequest.headers.set('Authorization', `Bearer ${reviewPassword}`);
const uploadReviewerBlocked = await uploadOkMedia({
  request: uploadReviewerRequest,
  env: reviewEnv,
});
assert.equal(uploadReviewerBlocked.status, 403);

const uploadNotConfigured = await uploadOkMedia({
  request: makeMediaRequest('photo', photo),
  env: { ADMIN_PASSWORD: password },
});
assert.equal(uploadNotConfigured.status, 503);

const photoUploadResponse = await uploadOkMedia({ request: makeMediaRequest('photo', photo), env });
const photoUploadBody = await photoUploadResponse.json();
assert.equal(photoUploadResponse.status, 200);
assert.equal(photoUploadBody.attachment, 'photo:photo-token-123');
assert.equal(photoUploadWasCalled, true);
assert.equal(lastOkCallParams.gid, groupId);
assert.equal(lastOkCallSig, expectedSig(lastOkCallParams));

const video = new File([new Uint8Array([1, 2, 3, 4])], 'garden.mp4', { type: 'video/mp4' });
const videoUploadResponse = await uploadOkMedia({ request: makeMediaRequest('video', video), env });
const videoUploadBody = await videoUploadResponse.json();
assert.equal(videoUploadResponse.status, 200);
assert.equal(videoUploadBody.attachment, 'video:v-77');
assert.equal(videoUploadWasCalled, true);

// An upload_url OK returns outside its own infrastructure must be rejected, not followed.
uploadUrlOverride = 'https://evil.example.com/steal';
const unsafeUploadResponse = await uploadOkMedia({ request: makeMediaRequest('photo', photo), env });
assert.equal(unsafeUploadResponse.status, 502);
uploadUrlOverride = null;

console.log('OK integration checks passed: status, publish validation, media uploads and signature scheme');
