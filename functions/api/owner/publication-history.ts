import {
  authenticateOwner,
  ownerCorsHeaders,
  ownerJson,
  readJsonBody,
  type OwnerEnv,
} from '../../_shared/owner-auth.ts';

interface KvNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

interface Env extends OwnerEnv {
  PUBLICATION_HISTORY?: KvNamespace;
}

interface PagesContext {
  request: Request;
  env: Env;
}

type PublicationStatus = 'published' | 'scheduled' | 'error';

interface PublicationEntry {
  id: string;
  platform: 'vk' | 'ok' | 'dzen';
  title: string;
  status: PublicationStatus;
  createdAt: string;
  scheduledAt?: string;
  url?: string;
}

interface HistoryRequest {
  action?: unknown;
  entry?: Record<string, unknown>;
}

const STORAGE_KEY = 'publication-history:v1';
const MAX_ENTRIES = 200;
const allowedId = /^[a-zA-Z0-9_-]{8,100}$/;

const cleanText = (value: unknown, maximumLength: number) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maximumLength) : '';

const cleanIsoDate = (value: unknown) => {
  if (typeof value !== 'string' || value.length > 40) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const cleanUrl = (value: unknown) => {
  if (typeof value !== 'string' || value.length > 500) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : undefined;
  } catch {
    return undefined;
  }
};

const readHistory = async (storage: KvNamespace): Promise<PublicationEntry[]> => {
  const value = await storage.get(STORAGE_KEY);
  if (!value) return [];
  try {
    const entries = JSON.parse(value);
    return Array.isArray(entries) ? entries.slice(0, MAX_ENTRIES) : [];
  } catch {
    return [];
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
    return respond({
      error: auth.status === 503 ? 'Закрытый редактор ещё не настроен.' : 'Неверный пароль владельца.',
    }, auth.status);
  }
  if (!env.PUBLICATION_HISTORY) {
    return respond({ error: 'Хранилище истории публикаций ещё не подключено.' }, 503);
  }

  const body = await readJsonBody<HistoryRequest>(request, 4096);
  if (!body) return respond({ error: 'Не удалось прочитать запрос.' }, 400);
  const entries = await readHistory(env.PUBLICATION_HISTORY);

  if (body.action === 'list') return respond({ entries });
  if (auth.role === 'reviewer') return respond({ error: 'Демонстрационный доступ: изменение истории публикаций недоступно.' }, 403);
  if (body.action !== 'add' || !body.entry) return respond({ error: 'Неизвестное действие.' }, 400);

  const id = cleanText(body.entry.id, 100);
  const platform = body.entry.platform;
  const status = body.entry.status;
  const title = cleanText(body.entry.title, 120);
  const createdAt = cleanIsoDate(body.entry.createdAt) ?? new Date().toISOString();
  const scheduledAt = cleanIsoDate(body.entry.scheduledAt);
  const url = cleanUrl(body.entry.url);

  if (!allowedId.test(id) || !['vk', 'ok', 'dzen'].includes(String(platform)) ||
      !['published', 'scheduled', 'error'].includes(String(status)) || !title) {
    return respond({ error: 'Запись истории заполнена неверно.' }, 400);
  }

  const entry: PublicationEntry = {
    id,
    platform: platform as PublicationEntry['platform'],
    title,
    status: status as PublicationStatus,
    createdAt,
    ...(scheduledAt ? { scheduledAt } : {}),
    ...(url ? { url } : {}),
  };
  const next = [entry, ...entries.filter((item) => item.id !== id)].slice(0, MAX_ENTRIES);
  await env.PUBLICATION_HISTORY.put(STORAGE_KEY, JSON.stringify(next));
  return respond({ saved: true, entry });
};
