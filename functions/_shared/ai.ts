// Text generation through Cloudflare Workers AI. The free plan includes a daily
// allocation (10 000 neurons, reset at 00:00 UTC); on the free plan requests
// beyond it are refused rather than billed.

export interface AiBinding {
  run(model: string, inputs: Record<string, unknown>): Promise<unknown>;
}

export interface AiEnv {
  AI?: AiBinding;
}

// Higher quality first; the second model is cheaper and is tried when the first fails.
export const OWNER_MODELS = [
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  '@cf/mistralai/mistral-small-3.1-24b-instruct',
] as const;

// The public generator runs for any visitor, so it starts with the cheaper model
// to leave most of the shared daily allocation for the owner's drafts.
export const PUBLIC_MODELS = [
  '@cf/mistralai/mistral-small-3.1-24b-instruct',
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
] as const;

export class AiGenerationError extends Error {
  readonly userMessage: string;
  readonly status: number;

  constructor(userMessage: string, status: number, detail: string) {
    super(detail);
    this.userMessage = userMessage;
    this.status = status;
  }
}

const AI_NOT_CONFIGURED =
  'Бесплатный ИИ Cloudflare не подключён к проекту: нужна привязка Workers AI с именем AI (wrangler.jsonc → "ai").';
const DAILY_LIMIT =
  'Исчерпан бесплатный дневной лимит ИИ Cloudflare. Он обновится в 03:00 по Москве — попробуйте после этого времени.';

const isQuotaError = (message: string) => /\b4006\b|daily free allocation|neurons/i.test(message);

const extractText = (result: unknown): string => {
  if (typeof result === 'string') return result;
  if (!result || typeof result !== 'object') return '';
  const record = result as Record<string, unknown>;
  if (typeof record.response === 'string') return record.response;
  const choices = record.choices;
  if (Array.isArray(choices)) {
    const message = (choices[0] as { message?: { content?: unknown } } | undefined)?.message;
    if (typeof message?.content === 'string') return message.content;
  }
  return '';
};

// Models occasionally wrap the post in Markdown despite the instruction.
const stripMarkdown = (text: string) =>
  text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .trim();

export const generateText = async (
  env: AiEnv,
  prompt: string,
  options: { models: readonly string[]; maxTokens: number; temperature: number },
): Promise<string> => {
  if (!env.AI || typeof env.AI.run !== 'function') {
    throw new AiGenerationError(AI_NOT_CONFIGURED, 503, 'AI binding missing');
  }

  const failures: string[] = [];
  for (const model of options.models) {
    try {
      const result = await env.AI.run(model, {
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options.maxTokens,
        temperature: options.temperature,
      });
      const text = stripMarkdown(extractText(result));
      if (text) return text;
      failures.push(`${model}: empty response`);
    } catch (error) {
      const message = (error instanceof Error ? error.message : String(error)).slice(0, 500);
      console.error('Workers AI request failed', { model, message });
      // The allocation is shared by all models, so trying the next one is pointless.
      if (isQuotaError(message)) throw new AiGenerationError(DAILY_LIMIT, 429, message);
      failures.push(`${model}: ${message}`);
    }
  }

  const detail = failures.join(' | ');
  throw new AiGenerationError(
    `ИИ Cloudflare не смог создать текст. Причина: ${detail.slice(0, 300) || 'неизвестная ошибка'}.`,
    502,
    detail,
  );
};
