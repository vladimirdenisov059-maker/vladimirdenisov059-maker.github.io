import { plants } from '../../src/data/plants.ts';

interface Env {
  PROXYAPI_KEY?: string;
  ALLOWED_ORIGINS?: string;
}

interface PagesContext {
  request: Request;
  env: Env;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string };
}

const MODEL = 'gemini-3.5-flash-lite';
const API_URL = `https://api.proxyapi.ru/google/v1beta/models/${MODEL}:generateContent`;
const allowedPlantName = /^[\p{L}\p{M}\d][\p{L}\p{M}\d\s()«»„“”'’.,-]{1,58}$/u;

const publishedExperimentEvidence: Record<string, string[]> = {
  'persimmon-wonderful': [
    'В саду наблюдается прививка гибридной хурмы Wonderful на подвое хурмы виргинской «Белогорье».',
    'В 2026 году прививка Wonderful цвела; цветение подтверждено Владимиром Денисовым и фотографией.',
    'Плодоношение пока не подтверждено.',
    'Точная дата прививки и точная дата цветения ещё требуют уточнения.',
  ],
  dogwood: [
    'Главный практический вывод автора: на одном деревце кизила привиты разные сорта, и урожайность на прививках кратно выше.',
    'Авторское видео от 28 июля 2026 года показывает разные прививки и их плодоношение.',
    'По многолетнему наблюдению автора, кизил каждый год цветёт под снегом.',
    'Названия привитых сортов ещё требуют уточнения.',
  ],
  'kiwi-stratona': [
    'Общий опыт автора с киви Стратона длится около 22 лет, но это не возраст растений, выращенных из семян.',
    'Первые примерно 15 лет автор высаживал саженцы, полученные от Стратона.',
    'Только после 2019 года автор высадил семена киви Стратона; точный год посева ещё требует уточнения.',
    'В 2026 году у семенных растений впервые зафиксированы цветки; по наблюдению автора они мужские.',
    'Плодоношение не подтверждено; женского цветения для завязывания плодов пока нет.',
    'Запрещено писать, что киви выращивается из семян 22 года или что семенным растениям 22 года: 22 года относятся ко всему опыту, состоящему из двух этапов.',
  ],
};

const normalizePlantName = (value: string) =>
  value.toLocaleLowerCase('ru-RU')
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{M}\d]+/gu, ' ')
    .trim();

const findPlantRecords = (query: string) => {
  const normalizedQuery = normalizePlantName(query);
  return plants.filter((record) =>
    [record.name, record.variety, record.slug]
      .filter((value): value is string => Boolean(value))
      .map(normalizePlantName)
      .some((value) => value === normalizedQuery || value.includes(normalizedQuery) || normalizedQuery.includes(value)),
  );
};

const buildGardenEvidence = (query: string) => {
  const records = findPlantRecords(query);
  const publicFacts = records.map((record) => ({
    name: record.name,
    variety: record.variety,
    publicDescription: record.description,
    publicStatus: record.status,
    yearsInGarden: record.yearsInGarden,
    floweringPeriod: record.floweringPeriod,
    harvestPeriod: record.harvestPeriod,
    pollination: record.pollination,
    winterHardiness: record.winterHardiness,
    fruitSize: record.fruitSize,
    taste: record.taste,
    yield: record.yield,
    thornless: record.thornless,
    remontant: record.remontant,
    planting: record.planting,
    care: record.care,
    pruning: record.pruning,
    winterProtection: record.winterProtection,
    publicNotes: record.personalNotes,
    publicAdvantages: record.advantages,
    publicLimitations: record.disadvantages,
    publicNeedsConfirmation: record.confirmationNeeded,
    publishedExperimentFacts: publishedExperimentEvidence[record.id] ?? [],
  }));

  return {
    records,
    text: JSON.stringify(publicFacts, null, 2),
  };
};

const json = (body: Record<string, unknown>, status = 200, extraHeaders: HeadersInit = {}) =>
  Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...Object.fromEntries(new Headers(extraHeaders)),
    },
  });

const defaultAllowedOrigins = [
  'https://vladimirdenisov059-maker.github.io',
  'http://127.0.0.1:4321',
  'http://localhost:4321',
  'http://127.0.0.1:4322',
  'http://localhost:4322',
];

export const onRequest = async ({ request, env }: PagesContext): Promise<Response> => {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get('Origin');
  const allowedOrigins = new Set([
    ...defaultAllowedOrigins,
    ...(env.ALLOWED_ORIGINS ?? '').split(',').map((value) => value.trim()).filter(Boolean),
    requestUrl.origin,
  ]);
  const originAllowed = !origin || allowedOrigins.has(origin);
  const corsHeaders: HeadersInit = originAllowed && origin
    ? {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin',
      }
    : {};
  const respond = (body: Record<string, unknown>, status = 200) => json(body, status, corsHeaders);

  if (!originAllowed) {
    return respond({ error: 'Запрос отклонён.' }, 403);
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return respond({ error: 'Используйте POST-запрос.' }, 405);
  }

  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) {
    return respond({ error: 'Ожидается JSON.' }, 415);
  }

  const contentLength = Number(request.headers.get('Content-Length') ?? '0');
  if (contentLength > 2048) {
    return respond({ error: 'Запрос слишком большой.' }, 413);
  }

  if (!env.PROXYAPI_KEY) {
    return respond({ error: 'Генератор ещё не настроен владельцем сайта.' }, 503);
  }

  let plant: string;
  try {
    const body = (await request.json()) as { plant?: unknown };
    plant = typeof body.plant === 'string' ? body.plant.trim().replace(/\s+/g, ' ') : '';
  } catch {
    return respond({ error: 'Не удалось прочитать запрос.' }, 400);
  }

  if (!allowedPlantName.test(plant)) {
    return respond({ error: 'Введите название растения — от 2 до 60 символов.' }, 400);
  }

  const evidence = buildGardenEvidence(plant);
  const matchedPlant = evidence.records.map((record) => record.name).join(', ');
  const experienceBlock = evidence.records.length
    ? [
        'Ниже переданы только опубликованные факты из личного сада Владимира Денисова. Они являются главным источником поста.',
        'Сразу после заголовка, без общего вступления, изложи конкретный опыт автора блоком «Из опыта Владимира Денисова».',
        'Используй только явно переданные факты. Факт, помеченный «Главный практический вывод автора», обязательно поставь в первый абзац блока опыта. Не превращай наблюдение за одним экземпляром в общее правило и не скрывай пункты, требующие подтверждения.',
        evidence.text,
      ].join('\n')
    : [
        'В опубликованном архиве сайта нет записи об этом растении.',
        'Не приписывай Владимиру Денисову выращивание, наблюдения или результаты. Напиши только общую справку и прямо обозначь отсутствие личного опыта в архиве.',
      ].join('\n');

  const prompt = [
    `Запрос посетителя: ${plant}.`,
    experienceBlock,
    'Только после авторского опыта добавь короткий блок «Общие рекомендации для Донбасса». Общие сведения нельзя выдавать за наблюдения автора.',
    'Напиши на русском языке короткий увлекательный пост для садоводов Донбасса.',
    'Строгий объём: 1000–1500 знаков. Структура: заголовок; 2–3 коротких абзаца опыта автора; 1–2 абзаца общих рекомендаций; один практический совет.',
    'Учитывай континентальный климат Донбасса: жаркое сухое лето, возможный дефицит влаги, зимние морозы, оттепели и возвратные весенние заморозки.',
    'Не придумывай урожайность, морозостойкость, даты, сортовые свойства или подтверждённые результаты.',
    'Избегай тавтологии: полное имя «Владимир Денисов» употреби не более одного раза. Затем пиши «автор», «садовод», «в его саду» или «по его наблюдению». Не используй порядок слов «Денисова Владимира»; допустимо «Владимир Денисов» или по падежу «Владимира Денисова».',
    'Если растение плохо подходит региону, честно назови риск и предложи защищённый способ выращивания.',
    'Не используй Markdown-разметку, хэштеги, ссылки и призывы покупать товары.',
  ].join('\n');

  let upstream: Response;
  try {
    upstream = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.PROXYAPI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.55,
          topP: 0.9,
          maxOutputTokens: 500,
        },
      }),
    });
  } catch {
    return respond({ error: 'Сервис генерации временно недоступен. Попробуйте позже.' }, 502);
  }

  let result: GeminiResponse;
  try {
    result = (await upstream.json()) as GeminiResponse;
  } catch {
    return respond({ error: 'Сервис генерации вернул некорректный ответ.' }, 502);
  }

  if (!upstream.ok) {
    console.error('ProxyAPI request failed', upstream.status, result.error?.message ?? 'Unknown error');
    return respond({ error: 'Не удалось создать пост. Попробуйте ещё раз чуть позже.' }, 502);
  }

  const post = result.candidates?.[0]?.content?.parts
    ?.map((part) => part.text?.trim())
    .filter(Boolean)
    .join('\n\n')
    .trim();

  if (!post) {
    return respond({ error: 'Модель не вернула текст. Попробуйте другое название растения.' }, 502);
  }

  return respond({ post, plant, experienceBased: evidence.records.length > 0, matchedPlant: matchedPlant || null });
};
