import assert from 'node:assert/strict';
import { onRequest as generateVkDraft } from '../functions/api/owner/generate-vk.ts';
import { onRequest as publishVk } from '../functions/api/owner/publish-vk.ts';

const origin = 'https://vladimirdenisov059-maker.github.io';
const password = 'strong-owner-password-for-tests';
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

const preflight = await generateVkDraft({
  request: new Request('https://gardens-of-donbas-api.pages.dev/api/owner/generate-vk', {
    method: 'OPTIONS',
    headers: { Origin: origin },
  }),
  env: {},
});
assert.equal(preflight.status, 204);
assert.match(preflight.headers.get('Access-Control-Allow-Headers') ?? '', /Authorization/);

const missingPasswordSetup = await generateVkDraft({
  request: makeRequest('/api/owner/generate-vk', { plant: 'киви Стратона' }),
  env: { PROXYAPI_KEY: 'test-only' },
});
assert.equal(missingPasswordSetup.status, 503);

const wrongPassword = await generateVkDraft({
  request: makeRequest('/api/owner/generate-vk', { plant: 'киви Стратона' }, 'Bearer wrong-password-value'),
  env: { ADMIN_PASSWORD: password, PROXYAPI_KEY: 'test-only' },
});
assert.equal(wrongPassword.status, 401);

let capturedPrompt = '';
let capturedVkParams;
globalThis.fetch = async (url, options) => {
  if (String(url).includes('proxyapi.ru')) {
    const upstreamBody = JSON.parse(options.body);
    capturedPrompt = upstreamBody.contents[0].parts[0].text;
    return Response.json({
      candidates: [{ content: { parts: [{ text: 'Киви Стратона: мой опыт\n\nПодробный проверяемый черновик для ВКонтакте.' }] } }],
    });
  }
  if (String(url).includes('api.vk.com/method/wall.post')) {
    capturedVkParams = new URLSearchParams(options.body);
    return Response.json({ response: { post_id: 321 } });
  }
  throw new Error(`Unexpected URL: ${url}`);
};

const draftResponse = await generateVkDraft({
  request: makeRequest('/api/owner/generate-vk', {
    plant: 'киви Стратона',
    focus: 'Два этапа опыта',
    notes: 'Не смешивать возраст сеянцев с общим опытом.',
  }),
  env: {
    ADMIN_PASSWORD: password,
    PROXYAPI_KEY: 'test-only',
    VK_ACCESS_TOKEN: 'vk-test-token',
    VK_OWNER_ID: '12345',
  },
});
const draftBody = await draftResponse.json();
assert.equal(draftResponse.status, 200);
assert.equal(draftBody.vkConfigured, true);
assert.equal(draftBody.matchedPlant, 'Киви Стратона');
assert.match(draftBody.post, /мой опыт/);
assert.match(capturedPrompt, /Пиши от первого лица/);
assert.match(capturedPrompt, /Первые примерно 15 лет/);
assert.match(capturedPrompt, /Только после 2019 года/);
assert.match(capturedPrompt, /Не смешивать возраст сеянцев/);
assert.match(capturedPrompt, /2500–4000 знаков/);

const unknownPlant = await generateVkDraft({
  request: makeRequest('/api/owner/generate-vk', { plant: 'неизвестное растение' }),
  env: { ADMIN_PASSWORD: password, PROXYAPI_KEY: 'test-only' },
});
assert.equal(unknownPlant.status, 422);

const publishNotConfigured = await publishVk({
  request: makeRequest('/api/owner/publish-vk', {
    message: 'Текст '.repeat(30),
    approved: true,
    requestId: '123e4567-e89b-42d3-a456-426614174000',
  }),
  env: { ADMIN_PASSWORD: password },
});
assert.equal(publishNotConfigured.status, 503);

const publishWithoutApproval = await publishVk({
  request: makeRequest('/api/owner/publish-vk', {
    message: 'Текст '.repeat(30),
    approved: false,
    requestId: '123e4567-e89b-42d3-a456-426614174000',
  }),
  env: { ADMIN_PASSWORD: password, VK_ACCESS_TOKEN: 'vk-test-token', VK_OWNER_ID: '12345' },
});
assert.equal(publishWithoutApproval.status, 409);

const approvedMessage = 'Проверенный автором текст публикации. '.repeat(8);
const publishResponse = await publishVk({
  request: makeRequest('/api/owner/publish-vk', {
    message: approvedMessage,
    approved: true,
    requestId: '123e4567-e89b-42d3-a456-426614174000',
  }),
  env: { ADMIN_PASSWORD: password, VK_ACCESS_TOKEN: 'vk-test-token', VK_OWNER_ID: '12345' },
});
const publishBody = await publishResponse.json();
assert.equal(publishResponse.status, 200);
assert.equal(publishBody.published, true);
assert.equal(publishBody.url, 'https://vk.com/wall12345_321');
assert.equal(capturedVkParams.get('owner_id'), '12345');
assert.equal(capturedVkParams.get('message'), approvedMessage.trim());
assert.equal(capturedVkParams.get('guid'), '123e4567-e89b-42d3-a456-426614174000');
assert.equal(capturedVkParams.get('access_token'), 'vk-test-token');

console.log('Owner studio checks passed: authentication, draft generation, approval and VK publishing');