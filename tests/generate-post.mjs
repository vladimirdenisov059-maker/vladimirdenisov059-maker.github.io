import assert from 'node:assert/strict';
import { onRequest } from '../functions/api/generate-post.ts';

const makeRequest = (plant, origin = 'https://vladimirdenisov059-maker.github.io') =>
  new Request('https://gardens-of-donbas-api.pages.dev/api/generate-post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({ plant }),
  });

const missingSecret = await onRequest({ request: makeRequest('хурма'), env: {} });
assert.equal(missingSecret.status, 503);

const foreignOrigin = await onRequest({
  request: makeRequest('хурма', 'https://attacker.example'),
  env: { PROXYAPI_KEY: 'test-only' },
});
assert.equal(foreignOrigin.status, 403);

const preflight = await onRequest({
  request: new Request('https://gardens-of-donbas-api.pages.dev/api/generate-post', {
    method: 'OPTIONS',
    headers: { Origin: 'https://vladimirdenisov059-maker.github.io' },
  }),
  env: {},
});
assert.equal(preflight.status, 204);
assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), 'https://vladimirdenisov059-maker.github.io');

const capturedPrompts = [];
globalThis.fetch = async (_url, options) => {
  assert.equal(options?.headers?.Authorization, 'Bearer test-only');
  const upstreamBody = JSON.parse(options.body);
  const prompt = upstreamBody.contents[0].parts[0].text;
  capturedPrompts.push(prompt);
  const subject = prompt.includes('Запрос посетителя: кизил.') ? 'Кизил' : 'Хурма';
  return Response.json({
    candidates: [{
      content: {
        parts: [{ text: subject + ' в Донбассе\n\nТестовый безопасный ответ.' }],
      },
    }],
  });
};

const persimmonResponse = await onRequest({
  request: makeRequest('хурма'),
  env: { PROXYAPI_KEY: 'test-only' },
});
const persimmonBody = await persimmonResponse.json();
const persimmonPrompt = capturedPrompts.at(-1);
assert.equal(persimmonResponse.status, 200);
assert.equal(persimmonResponse.headers.get('Access-Control-Allow-Origin'), 'https://vladimirdenisov059-maker.github.io');
assert.match(persimmonBody.post, /Хурма/);
assert.equal(persimmonBody.experienceBased, true);
assert.equal(persimmonBody.matchedPlant, 'Хурма Wonderful');
assert.match(persimmonPrompt, /Хурма Wonderful/);
assert.match(persimmonPrompt, /«Белогорье»/);
assert.match(persimmonPrompt, /цветение подтверждено Владимиром Денисовым и фотографией/);
assert.match(persimmonPrompt, /Плодоношение пока не подтверждено/);
assert.doesNotMatch(persimmonPrompt, /урожайность на прививках кратно выше/);

const dogwoodResponse = await onRequest({
  request: makeRequest('кизил'),
  env: { PROXYAPI_KEY: 'test-only' },
});
const dogwoodBody = await dogwoodResponse.json();
const dogwoodPrompt = capturedPrompts.at(-1);
assert.equal(dogwoodResponse.status, 200);
assert.match(dogwoodBody.post, /Кизил/);
assert.equal(dogwoodBody.experienceBased, true);
assert.equal(dogwoodBody.matchedPlant, 'Кизил');
assert.match(dogwoodPrompt, /на одном деревце кизила привиты разные сорта/);
assert.match(dogwoodPrompt, /урожайность на прививках кратно выше/);
assert.match(dogwoodPrompt, /Авторское видео от 28 июля 2026 года/);
assert.match(dogwoodPrompt, /полное имя «Владимир Денисов» употреби не более одного раза/);

console.log('API smoke checks passed: persimmon and dogwood evidence are separated');
