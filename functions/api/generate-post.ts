import { plants } from '../../src/data/plants.ts';
import { AiGenerationError, generateText, PUBLIC_MODELS, type AiEnv } from '../_shared/ai.ts';

interface Env extends AiEnv {
  ALLOWED_ORIGINS?: string;
}

interface PagesContext {
  request: Request;
  env: Env;
}

const NO_EXPERIENCE_NOTE =
  'Это общая справка: личного опыта выращивания этого растения в архиве сада Владимира Денисова пока нет.';

// For plants missing from the archive the text must not attribute anything to the author.
// \b is ASCII-only in JavaScript, so Cyrillic word edges use letter lookarounds.
const AUTHOR_MENTION = new RegExp(
  [
    'Денисов',
    'Владимир',
    'автор',
    'в (?:его|своём|своем|моём|моем|нашем) саду',
    'по (?:его|моим|моему|нашим) наблюдени',
    'у меня',
    '(?<!\\p{L})(?:я|мой|моя|моё|мое|мои|мне)(?!\\p{L})',
    'садовод (?:заметил|попробовал|вырастил|выращивает|наблюдал|считает|советует|надеется)',
  ].join('|'),
  'iu',
);
const mentionsAuthor = (text: string) => AUTHOR_MENTION.test(text);

const allowedPlantName =/^[\p{L}\p{M}\d][\p{L}\p{M}\d\s()«»„“”'’.,-]{1,58}$/u;

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

export const buildGardenEvidence = (query: string) => {
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

  if (!env.AI) {
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
  const hasExperience = evidence.records.length > 0;
  const commonRules = [
    'Учитывай континентальный климат Донбасса: жаркое сухое лето, возможный дефицит влаги, зимние морозы, оттепели и возвратные весенние заморозки.',
    'Не придумывай урожайность, морозостойкость, даты, сортовые свойства или подтверждённые результаты.',
    'Если растение плохо подходит региону, честно назови риск и предложи защищённый способ выращивания.',
    'Не используй Markdown-разметку, хэштеги, ссылки и призывы покупать товары.',
  ];

  const prompt = hasExperience
    ? [
        `Запрос посетителя: ${plant}.`,
        'Ниже переданы только опубликованные факты из личного сада Владимира Денисова. Они являются главным источником поста.',
        'Сразу после заголовка, без общего вступления, изложи конкретный опыт автора блоком «Из опыта Владимира Денисова».',
        'Используй только явно переданные факты. Факт, помеченный «Главный практический вывод автора», обязательно поставь в первый абзац блока опыта. Не превращай наблюдение за одним экземпляром в общее правило и не скрывай пункты, требующие подтверждения.',
        'Каждое утверждение об авторе должно опираться на конкретный факт из списка. Не приписывай автору действий, чувств, надежд, планов, советов или выводов, которых нет в списке.',
        evidence.text,
        'Только после авторского опыта добавь короткий блок «Общие рекомендации для Донбасса». Общие сведения нельзя выдавать за наблюдения автора.',
        'Напиши на русском языке короткий увлекательный пост для садоводов Донбасса.',
        'Строгий объём: 1000–1500 знаков. Структура: заголовок; 2–3 коротких абзаца опыта автора; 1–2 абзаца общих рекомендаций; один практический совет.',
        'Избегай тавтологии: полное имя «Владимир Денисов» употреби не более одного раза. Затем пиши «автор», «садовод», «в его саду» или «по его наблюдению». Не используй порядок слов «Денисова Владимира»; допустимо «Владимир Денисов» или по падежу «Владимира Денисова».',
        ...commonRules,
      ].join('\n')
    : [
        `Запрос посетителя: ${plant}.`,
        'Напиши на русском языке короткую общую справку о выращивании этого растения в Донбассе.',
        'Строгий объём: 800–1200 знаков. Структура: заголовок; 2–3 коротких абзаца общих сведений; один практический совет.',
        'Это нейтральная справка, а не рассказ о чьём-то опыте. Строго запрещено упоминать автора, владельца сайта, Владимира Денисова, «садовода» как конкретного человека, чей-либо сад или личные наблюдения.',
        'Не пиши от первого лица и не используй слова «я», «мой», «у меня», «автор», «в его саду», «по его наблюдению».',
        ...commonRules,
      ].join('\n');

  const generate = (extra = '', temperature = 0.55) =>
    generateText(env, extra ? `${prompt}\n${extra}` : prompt, { models: PUBLIC_MODELS, maxTokens: 900, temperature });

  let post: string;
  try {
    post = await generate();
    if (!hasExperience && mentionsAuthor(post)) {
      // One stricter retry; a second violation is refused rather than shown.
      post = await generate(
        'ВНИМАНИЕ: предыдущий вариант нарушил запрет и упомянул автора или личный опыт. Перепиши как безличную справку без единого упоминания автора.',
        0.3,
      );
      if (mentionsAuthor(post)) {
        console.error('Public generator: model kept attributing experience to the author', { plant });
        return respond({ error: 'ИИ не справился с этим растением. Попробуйте ещё раз или другое название.' }, 502);
      }
    }
  } catch (error) {
    if (error instanceof AiGenerationError) return respond({ error: error.userMessage }, error.status);
    throw error;
  }

  if (!hasExperience) post = `${post}\n\n${NO_EXPERIENCE_NOTE}`;

  return respond({ post, plant, experienceBased: hasExperience, matchedPlant: matchedPlant || null });
};
