import { buildGardenEvidence } from '../generate-post.ts';
import { normalizePlantInput, plantNameError } from '../../_shared/plant-name.ts';
import { AiGenerationError, generateText, OWNER_MODELS, type AiEnv } from '../../_shared/ai.ts';
import {
  authenticateOwner,
  ownerCorsHeaders,
  ownerJson,
  readJsonBody,
  type OwnerEnv,
} from '../../_shared/owner-auth.ts';

interface Env extends OwnerEnv, AiEnv {
  VK_ACCESS_TOKEN?: string;
  VK_OWNER_ID?: string;
}

interface PagesContext {
  request: Request;
  env: Env;
}

interface DraftRequest {
  plant?: unknown;
  focus?: unknown;
  notes?: unknown;
}


const cleanText = (value: unknown, maximumLength: number) =>
  typeof value === 'string' ? value.trim().replace(/\r\n?/g, '\n').slice(0, maximumLength) : '';

export const onRequest = async ({ request, env }: PagesContext): Promise<Response> => {
  const cors = ownerCorsHeaders(request, env);
  const respond = (body: Record<string, unknown>, status = 200) => ownerJson(body, status, cors.headers);

  if (!cors.allowed) return respond({ error: 'Запрос отклонён.' }, 403);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors.headers });
  if (request.method !== 'POST') return respond({ error: 'Используйте POST-запрос.' }, 405);

  const auth = await authenticateOwner(request, env);
  if (!auth.ok) {
    return respond({
      error: auth.status === 503
        ? 'Закрытый редактор ещё не настроен владельцем.'
        : 'Неверный пароль владельца.',
    }, auth.status);
  }
  const body = await readJsonBody<DraftRequest>(request, 8192);
  if (!body) return respond({ error: 'Не удалось прочитать запрос.' }, 400);

  const plant = normalizePlantInput(body.plant);
  const focus = cleanText(body.focus, 500);
  const notes = cleanText(body.notes, 3000);
  const plantError = plantNameError(plant, 80);
  if (plantError) return respond({ error: plantError }, 400);

  const evidence = buildGardenEvidence(plant);
  if (!evidence.records.length && !notes) {
    return respond({ error: 'В архиве такого растения пока нет. Добавьте свои факты в поле «Мои наблюдения».' }, 422);
  }

  const prompt = [
    `Подготовь подробный авторский пост для личной страницы ВКонтакте о растении: ${plant}.`,
    'Пиши от первого лица, от имени Владимира Денисова, садовода из Донбасса.',
    'Главный источник — факты из опубликованного архива и дополнительные наблюдения автора ниже.',
    'Нельзя придумывать личный опыт, даты, сорта, урожайность, морозостойкость, результаты или события.',
    'Если сведения требуют уточнения, честно обозначь это или не включай их в текст.',
    `Опубликованный архив:\n${evidence.text || 'Записей нет.'}`,
    focus ? `Главная тема поста, заданная автором:\n${focus}` : 'Главную тему выбери по самому содержательному факту из архива.',
    notes ? `Дополнительные наблюдения автора для этого черновика:\n${notes}` : 'Дополнительных наблюдений для этого черновика нет.',
    'Структура: выразительный заголовок; короткое личное вступление; подробная история опыта и наблюдений; практический вывод; вопрос читателям; 3–5 уместных хэштегов в конце.',
    'Объём: 2500–4000 знаков. Абзацы короткие, удобные для чтения с телефона.',
    'Тон живой, спокойный и достоверный, без канцелярита, рекламных обещаний и чрезмерных эмоций.',
    'Не используй Markdown-разметку. Допустимо не более трёх спокойных эмодзи во всём тексте.',
    'Не повторяй имя автора: текст уже публикуется от его имени.',
    'Верни только готовый текст поста без пояснений редактору.',
  ].join('\n\n');

  let post: string;
  try {
    post = await generateText(env, prompt, { models: OWNER_MODELS, maxTokens: 2600, temperature: 0.48 });
  } catch (error) {
    if (error instanceof AiGenerationError) return respond({ error: error.userMessage }, error.status);
    throw error;
  }

  return respond({
    post,
    plant,
    matchedPlant: evidence.records.map((record) => record.name).join(', ') || null,
    vkConfigured: Boolean(env.VK_ACCESS_TOKEN && env.VK_OWNER_ID),
  });
};