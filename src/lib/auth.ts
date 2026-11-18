/* ============================================================
   Comptes, mots de passe et sessions.
   Pas de prestataire externe : le back-office reste accessible
   même quand la connexion sort mal du Cameroun.
   ============================================================ */

import {
  scrypt as scryptCb,
  randomBytes,
  timingSafeEqual,
  createHash,
} from 'node:crypto';
import { promisify } from 'node:util';
import { eq, and, gt, sql } from 'drizzle-orm';
import type { AstroCookies } from 'astro';
import { db } from './db';
import { users, sessions, loginAttempts, type User } from './db/schema';
import { newId, newToken } from './ids';
import { env } from './env';
import { normalize } from './text';

const scrypt = promisify(scryptCb);

export const SESSION_COOKIE = 'maranatha_session';

/* ---------- Mots de passe ---------- */

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 } as const;

/** Format stocké : scrypt$N$r$p$sel$empreinte (base64url). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = (await scrypt(password.normalize('NFKC'), salt, SCRYPT.keylen, {
    N: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p,
  })) as Buffer;
  return [
    'scrypt',
    SCRYPT.N,
    SCRYPT.r,
    SCRYPT.p,
    salt.toString('base64url'),
    key.toString('base64url'),
  ].join('$');
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  try {
    const [scheme, N, r, p, saltB64, hashB64] = stored.split('$');
    if (scheme !== 'scrypt') return false;
    const salt = Buffer.from(saltB64, 'base64url');
    const expected = Buffer.from(hashB64, 'base64url');
    const key = (await scrypt(password.normalize('NFKC'), salt, expected.length, {
      N: Number(N),
      r: Number(r),
      p: Number(p),
    })) as Buffer;
    return key.length === expected.length && timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}

/** Règle minimale, annoncée à l'écran : au moins 10 caractères. */
export function passwordProblem(password: string): string | null {
  if (password.length < 10) return 'Le mot de passe doit faire au moins 10 caractères.';
  if (password.length > 200) return 'Le mot de passe est trop long.';
  if (/^\d+$/.test(password)) return "N'utilisez pas uniquement des chiffres.";
  return null;
}

/* ---------- Sessions ---------- */

function tokenId(token: string): string {
  const secret = env.sessionSecret || 'maranatha-dev-secret';
  return createHash('sha256').update(`${secret}:${token}`).digest('hex');
}

export async function createSession(
  userId: string,
  meta: { userAgent?: string | null; ip?: string | null } = {},
): Promise<{ token: string; expiresAt: number }> {
  const token = newToken();
  const expiresAt = Math.floor(Date.now() / 1000) + env.sessionDays * 86400;

  await db.insert(sessions).values({
    id: tokenId(token),
    userId,
    expiresAt,
    userAgent: meta.userAgent?.slice(0, 300) ?? null,
    ip: meta.ip?.slice(0, 60) ?? null,
  });

  return { token, expiresAt };
}

export type SessionUser = Pick<
  User,
  'id' | 'email' | 'name' | 'role' | 'mustChangePassword'
>;

/** Renvoie le compte derrière un jeton, ou null. Prolonge la session. */
export async function resolveSession(
  token: string | undefined,
): Promise<SessionUser | null> {
  if (!token) return null;
  const id = tokenId(token);
  const nowSec = Math.floor(Date.now() / 1000);

  const rows = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      active: users.active,
      mustChangePassword: users.mustChangePassword,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, nowSec)))
    .limit(1);

  const row = rows[0];
  if (!row || !row.active) return null;

  // Prolongation glissante : on repousse l'échéance une fois par jour.
  const remaining = row.expiresAt - nowSec;
  const full = env.sessionDays * 86400;
  if (remaining < full - 86400) {
    await db
      .update(sessions)
      .set({ expiresAt: nowSec + full })
      .where(eq(sessions.id, id));
  }

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    mustChangePassword: row.mustChangePassword,
  };
}

export async function destroySession(token: string | undefined): Promise<void> {
  if (!token) return;
  await db.delete(sessions).where(eq(sessions.id, tokenId(token)));
}

/** Déconnecte le compte partout — après un changement de mot de passe. */
export async function destroyAllSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export function setSessionCookie(
  cookies: AstroCookies,
  token: string,
  expiresAt: number,
): void {
  cookies.set(SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: env.production,
    expires: new Date(expiresAt * 1000),
  });
}

export function clearSessionCookie(cookies: AstroCookies): void {
  cookies.delete(SESSION_COOKIE, { path: '/' });
}

/* ---------- Limitation des tentatives ---------- */

const MAX_ATTEMPTS = 8;
const WINDOW_SECONDS = 900; // 15 minutes

export async function recordAttempt(
  identifier: string,
  success: boolean,
): Promise<void> {
  await db.insert(loginAttempts).values({
    identifier: normalize(identifier).slice(0, 120),
    success,
  });
}

/** Nombre de secondes à attendre, ou 0 si la voie est libre. */
export async function attemptsBlocked(identifier: string): Promise<number> {
  const since = Math.floor(Date.now() / 1000) - WINDOW_SECONDS;
  const rows = await db
    .select({
      failures: sql<number>`count(*)`,
      last: sql<number>`max(${loginAttempts.createdAt})`,
    })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.identifier, normalize(identifier).slice(0, 120)),
        eq(loginAttempts.success, false),
        gt(loginAttempts.createdAt, since),
      ),
    );

  const failures = Number(rows[0]?.failures ?? 0);
  if (failures < MAX_ATTEMPTS) return 0;
  const last = Number(rows[0]?.last ?? 0);
  const retryAt = last + WINDOW_SECONDS;
  return Math.max(0, retryAt - Math.floor(Date.now() / 1000));
}

/** Nettoyage : vieilles tentatives et sessions expirées. */
export async function pruneAuthTables(): Promise<void> {
  const nowSec = Math.floor(Date.now() / 1000);
  await db.delete(sessions).where(sql`${sessions.expiresAt} < ${nowSec}`);
  await db
    .delete(loginAttempts)
    .where(sql`${loginAttempts.createdAt} < ${nowSec - 86400 * 7}`);
}

/* ---------- Connexion ---------- */

export type LoginResult =
  | { ok: true; user: SessionUser; token: string; expiresAt: number }
  | { ok: false; error: string; retryAfter?: number };

export async function login(
  email: string,
  password: string,
  meta: { userAgent?: string | null; ip?: string | null } = {},
): Promise<LoginResult> {
  const id = normalize(email);
  if (!id || !password) {
    return { ok: false, error: 'Renseignez votre adresse et votre mot de passe.' };
  }

  const wait = await attemptsBlocked(id);
  if (wait > 0) {
    return {
      ok: false,
      error: `Trop de tentatives. Réessayez dans ${Math.ceil(wait / 60)} minutes.`,
      retryAfter: wait,
    };
  }

  const found = await db.select().from(users).where(eq(users.email, id)).limit(1);
  const user = found[0];

  // Même temps de réponse que le compte existe ou non.
  const hash =
    user?.passwordHash ??
    'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  const valid = await verifyPassword(password, hash);

  if (!user || !valid || !user.active) {
    await recordAttempt(id, false);
    return { ok: false, error: 'Adresse ou mot de passe incorrect.' };
  }

  await recordAttempt(id, true);
  await db
    .update(users)
    .set({ lastLoginAt: Math.floor(Date.now() / 1000) })
    .where(eq(users.id, user.id));

  const session = await createSession(user.id, meta);
  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    },
    token: session.token,
    expiresAt: session.expiresAt,
  };
}

/* ---------- Comptes ---------- */

export async function createUser(input: {
  email: string;
  name: string;
  password: string;
  role?: 'owner' | 'staff';
  mustChangePassword?: boolean;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const email = normalize(input.email);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "Cette adresse e-mail n'est pas valide." };
  }
  const problem = passwordProblem(input.password);
  if (problem) return { ok: false, error: problem };

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing.length) {
    return { ok: false, error: 'Un compte utilise déjà cette adresse.' };
  }

  const id = newId();
  await db.insert(users).values({
    id,
    email,
    name: input.name.trim() || email,
    passwordHash: await hashPassword(input.password),
    role: input.role ?? 'staff',
    mustChangePassword: input.mustChangePassword ?? false,
  });
  return { ok: true, id };
}

export async function changePassword(
  userId: string,
  current: string,
  next: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const found = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = found[0];
  if (!user) return { ok: false, error: 'Compte introuvable.' };

  if (!(await verifyPassword(current, user.passwordHash))) {
    return { ok: false, error: 'Le mot de passe actuel est incorrect.' };
  }
  const problem = passwordProblem(next);
  if (problem) return { ok: false, error: problem };

  await db
    .update(users)
    .set({
      passwordHash: await hashPassword(next),
      mustChangePassword: false,
    })
    .where(eq(users.id, userId));

  await destroyAllSessions(userId);
  return { ok: true };
}

/**
 * Crée le compte propriétaire au premier démarrage, d'après
 * OWNER_EMAIL / OWNER_PASSWORD. Sans effet si un compte existe déjà.
 */
export async function ensureOwner(): Promise<void> {
  const count = await db.select({ n: sql<number>`count(*)` }).from(users);
  if (Number(count[0]?.n ?? 0) > 0) return;

  if (!env.ownerEmail || !env.ownerPassword) {
    console.warn(
      '[comptes] Aucun compte. Renseignez OWNER_EMAIL et OWNER_PASSWORD puis redémarrez.',
    );
    return;
  }

  const result = await createUser({
    email: env.ownerEmail,
    name: env.ownerName,
    password: env.ownerPassword,
    role: 'owner',
    mustChangePassword: true,
  });

  if (result.ok) {
    console.log(`[comptes] Compte propriétaire créé pour ${env.ownerEmail}.`);
  } else {
    console.error(`[comptes] Création impossible : ${result.error}`);
  }
}
