import {
  authenticateOwner,
  ownerCorsHeaders,
  ownerJson,
} from '../../_shared/owner-auth.ts';
import {
  okErrorCode,
  resolveOkIdentity,
  type OkEnv,
} from '../../_shared/ok.ts';

interface PagesContext {
  request: Request;
  env: OkEnv;
}

export const onRequest = async ({ request, env }: PagesContext): Promise<Response> => {
  const cors = ownerCorsHeaders(request, env);
  const respond = (body: Record<string, unknown>, status = 200) => ownerJson(body, status, cors.headers);

  if (!cors.allowed) return respond({ error: 'Запрос отклонён.' }, 403);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors.headers });
  if (request.method !== 'POST') return respond({ error: 'Используйте POST-запрос.' }, 405);

  const auth = await authenticateOwner(request, env);
  if (!auth.ok) {
    return respond({ error: auth.status === 503 ? 'Закрытый редактор ещё не настроен.' : 'Неверный пароль владельца.' }, auth.status);
  }

  try {
    const user = await resolveOkIdentity(env);
    return respond({
      configured: true,
      uid: user.uid,
      name: user.name || `ID ${user.uid}`,
      url: `https://ok.ru/profile/${user.uid}`,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : '';
    if (reason === 'OK_NOT_CONFIGURED') {
      return respond({
        configured: false,
        error: 'Серверный доступ ОК не настроен: добавьте OK_APPLICATION_KEY, OK_APPLICATION_SECRET_KEY и OK_ACCESS_TOKEN в Cloudflare Pages.',
      }, 503);
    }
    const code = okErrorCode(error);
    console.error('OK users.getCurrentUser failed', code ?? error);
    return respond({
      configured: false,
      error: `Не удалось проверить подключение ОК${code ? ` (код ${code})` : ''}.`,
    }, 502);
  }
};
