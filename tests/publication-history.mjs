import assert from 'node:assert/strict';
import { onRequest as publicationHistory } from '../functions/api/owner/publication-history.ts';

const origin = 'https://vladimirdenisov059-maker.github.io';
const password = 'strong-owner-password-for-tests';
const values = new Map();
const storage = {
  async get(key) { return values.get(key) ?? null; },
  async put(key, value) { values.set(key, value); },
};
const env = { ADMIN_PASSWORD: password, PUBLICATION_HISTORY: storage };
const request = (body, authorization = `Bearer ${password}`) => new Request(
  'https://gardens-of-donbas-api.pages.dev/api/owner/publication-history',
  {
    method: 'POST',
    headers: { Origin: origin, Authorization: authorization, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  },
);



const denied = await publicationHistory({ request: request({ action: 'list' }, 'Bearer wrong-password'), env });
assert.equal(denied.status, 401);

const unavailable = await publicationHistory({
  request: request({ action: 'list' }),
  env: { ADMIN_PASSWORD: password },
});
assert.equal(unavailable.status, 503);

const saved = await publicationHistory({
  request: request({
    action: 'add',
    entry: {
      id: '123e4567-e89b-42d3-a456-426614174000',
      platform: 'vk',
      title: 'Киви Стратона',
      status: 'scheduled',
      createdAt: '2026-08-02T19:30:00.000Z',
      scheduledAt: '2026-08-02T19:49:00.000Z',
      url: 'https://vk.com/wall123_456',
    },
  }),
  env,
});
assert.equal(saved.status, 200);
assert.equal((await saved.json()).saved, true);

const listed = await publicationHistory({ request: request({ action: 'list' }), env });
const body = await listed.json();
assert.equal(listed.status, 200);
assert.equal(body.entries.length, 1);
assert.equal(body.entries[0].platform, 'vk');
assert.equal(body.entries[0].status, 'scheduled');
assert.equal(body.entries[0].title, 'Киви Стратона');

console.log('Publication history checks passed: protected save and list');
