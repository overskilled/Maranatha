/* Identifiants courts, triables, lisibles dans une URL. */

import { randomBytes, randomUUID } from 'node:crypto';

const ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz'; // base32 Crockford, sans i/l/o/u

/**
 * Identifiant de 20 caractères : 8 de temps (millisecondes, donc triable
 * par ordre de création) puis 12 d'aléatoire.
 */
export function newId(): string {
  let time = Date.now();
  let head = '';
  for (let i = 0; i < 8; i += 1) {
    head = ALPHABET[time % 32] + head;
    time = Math.floor(time / 32);
  }
  const bytes = randomBytes(12);
  let tail = '';
  for (let i = 0; i < 12; i += 1) {
    tail += ALPHABET[bytes[i] % 32];
  }
  return head + tail;
}

/** Jeton de session, jamais stocké en clair côté serveur. */
export function newToken(): string {
  return randomBytes(32).toString('base64url');
}

export { randomUUID };
