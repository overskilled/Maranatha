/* Petites aides pour les points d'entrée JSON du back-office. */

import type { APIContext } from 'astro';

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export function ok(data: Record<string, unknown> = {}): Response {
  return json({ ok: true, ...data });
}

export function fail(error: string, status = 400): Response {
  return json({ ok: false, error }, status);
}

/** Refuse la requête si personne n'est connecté. */
export function requireUser(context: APIContext) {
  const user = context.locals.user;
  if (!user) return { user: null, response: fail('Session expirée. Reconnectez-vous.', 401) };
  return { user, response: null };
}

/** Réservé au propriétaire : comptes, réglages sensibles. */
export function requireOwner(context: APIContext) {
  const { user, response } = requireUser(context);
  if (response) return { user: null, response };
  if (user!.role !== 'owner') {
    return { user: null, response: fail('Cette action est réservée au propriétaire.', 403) };
  }
  return { user, response: null };
}

/** Lit un corps JSON ou un formulaire, indifféremment. */
export async function readBody(request: Request): Promise<Record<string, unknown>> {
  const type = request.headers.get('content-type') ?? '';

  if (type.includes('application/json')) {
    try {
      const parsed = await request.json();
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }

  if (type.includes('form')) {
    const form = await request.formData();
    const out: Record<string, unknown> = {};
    for (const [key, value] of form.entries()) {
      if (value instanceof File) continue;
      // Les champs répétés deviennent des tableaux.
      if (key in out) {
        const existing = out[key];
        out[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
      } else {
        out[key] = value;
      }
    }
    return out;
  }

  return {};
}

export function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
}

export function asNumber(value: unknown, fallback: number | null = null): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value.replace(/[\s  ]/g, '').replace(',', '.'));
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

export function asBoolean(value: unknown): boolean {
  return value === true || value === 'true' || value === 'on' || value === '1' || value === 'oui';
}

export function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => asString(v)).filter(Boolean);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed.map((v) => asString(v)).filter(Boolean) : [];
      } catch {
        /* on retombe sur la découpe par virgules */
      }
    }
    return trimmed.split(',').map((v) => v.trim()).filter(Boolean);
  }
  return [];
}

/** Redirection avec un message affiché en haut de la page suivante. */
export function redirectWith(
  context: APIContext,
  path: string,
  message: string,
  isError = false,
): Response {
  const url = new URL(path, context.url.origin);
  url.searchParams.set('message', message);
  if (isError) url.searchParams.set('erreur', '1');
  return context.redirect(url.pathname + url.search, 303);
}
