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
  env: { AI: { run: async () => assert.fail('foreign origin must not reach the model') } },
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
const capturedModels = [];
const aiCalls = { failFirst: false, quota: false };
const env = {
  AI: {
    run: async (model, inputs) => {
      capturedModels.push(model);
      if (aiCalls.quota) throw new Error('4006: you have used up your daily free allocation of 10,000 neurons');
      if (aiCalls.failFirst && capturedModels.length === 1) throw new Error('5007: model unavailable');
      const prompt = inputs.messages[0].content;
      capturedPrompts.push(prompt);
      const subject = prompt.includes('Запрос посетителя: кизил.')
        ? 'Кизил'
        : prompt.includes('Запрос посетителя: киви Стратона.')
          ? 'Киви'
          : 'Хурма';
      return { response: '## **' + subject + ' в Донбассе**\n\nТестовый безопасный ответ.' };
    },
  },
};

const persimmonResponse = await onRequest({
  request: makeRequest('хурма'),
  env,
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
  env,
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

const kiwiResponse = await onRequest({
  request: makeRequest('киви Стратона'),
  env,
});
const kiwiBody = await kiwiResponse.json();
const kiwiPrompt = capturedPrompts.at(-1);
assert.equal(kiwiResponse.status, 200);
assert.match(kiwiBody.post, /Киви/);
assert.equal(kiwiBody.experienceBased, true);
assert.equal(kiwiBody.matchedPlant, 'Киви Стратона');
assert.match(kiwiPrompt, /Общий опыт автора с киви Стратона длится около 22 лет/);
assert.match(kiwiPrompt, /Первые примерно 15 лет автор высаживал саженцы, полученные от Стратона/);
assert.match(kiwiPrompt, /Только после 2019 года автор высадил семена/);
assert.match(kiwiPrompt, /22 года относятся ко всему опыту, состоящему из двух этапов/);
assert.doesNotMatch(kiwiPrompt, /выращивается из семян около 22 лет/);

assert.doesNotMatch(kiwiBody.post, /[#*]/, 'Markdown is stripped from the model output');

// A failing model falls back to the next one.
capturedModels.length = 0;
aiCalls.failFirst = true;
const fallbackResponse = await onRequest({ request: makeRequest('хурма'), env });
assert.equal(fallbackResponse.status, 200);
assert.equal(capturedModels.length, 2);
aiCalls.failFirst = false;

// The exhausted free allocation is reported plainly and no second model is tried.
capturedModels.length = 0;
aiCalls.quota = true;
const quotaResponse = await onRequest({ request: makeRequest('хурма'), env });
assert.equal(quotaResponse.status, 429);
assert.match((await quotaResponse.json()).error, /бесплатный дневной лимит/);
assert.equal(capturedModels.length, 1);
aiCalls.quota = false;

console.log('API smoke checks passed: persimmon, dogwood and kiwi evidence are separated');
