export interface OwnerEnv {
  ADMIN_PASSWORD?: string;
  ALLOWED_ORIGINS?: string;
}

const defaultAllowedOrigins = [
  'https://vladimirdenisov059-maker.github.io',
  'http://127.0.0.1:4321',
  'http://localhost:4321',
  'http://127.0.0.1:4322',
  'http://localhost:4322',
];

const encoder = new TextEncoder();

const secureEqual = async (left: string, right: string) => {
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(left)),
    crypto.subtle.digest('SHA-256', encoder.encode(right)),
  ]);
  const leftBytes = new Uint8Array(leftHash);
  const rightBytes = new Uint8Array(rightHash);
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
};

export const ownerCorsHeaders = (request: Request, env: OwnerEnv) => {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get('Origin');
  const allowedOrigins = new Set([
    ...defaultAllowedOrigins,
    ...(env.ALLOWED_ORIGINS ?? '').split(',').map((value) => value.trim()).filter(Boolean),
    requestUrl.origin,
  ]);
  const allowed = !origin || allowedOrigins.has(origin);
  const headers: HeadersInit = allowed && origin
    ? {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-VK-Access-Token, X-VK-Upload-URL, X-File-Size, X-File-Type, X-Video-Title',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin',
      }
    : {};
  return { allowed, headers };
};

export const ownerJson = (body: Record<string, unknown>, status = 200, headers: HeadersInit = {}) =>
  Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...Object.fromEntries(new Headers(headers)),
    },
  });

export const authenticateOwner = async (request: Request, env: OwnerEnv) => {
  if (!env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < 12) return { ok: false, status: 503 } as const;
  const authorization = request.headers.get('Authorization') ?? '';
  const password = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!password || !(await secureEqual(password, env.ADMIN_PASSWORD))) {
    return { ok: false, status: 401 } as const;
  }
  return { ok: true, status: 200 } as const;
};

export const readJsonBody = async <T>(request: Request, maximumBytes: number): Promise<T | null> => {
  const contentType = request.headers.get('Content-Type')?.toLowerCase() ?? '';
  const contentLength = Number(request.headers.get('Content-Length') ?? '0');
  if (!contentType.startsWith('application/json') || contentLength > maximumBytes) return null;
  try {
    return await request.json() as T;
  } catch {
    return null;
  }
};