/* ============================================================
   Connexion à la base.
   SQLite en mode WAL : un seul fichier, des écritures sûres,
   et des imports de plusieurs milliers de lignes en une
   transaction. La sauvegarde du soir est une copie de fichier.
   ============================================================ */

import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { env } from '../env';
import * as schema from './schema';

let instance: ReturnType<typeof create> | null = null;

function create() {
  mkdirSync(dirname(env.databasePath), { recursive: true });

  const sqlite = new Database(env.databasePath);

  // WAL : les lectures ne bloquent pas l'écriture en cours.
  sqlite.pragma('journal_mode = WAL');
  // Bon compromis entre durabilité et vitesse d'écriture en lot.
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('foreign_keys = ON');
  // Attendre plutôt que d'échouer si une écriture est en cours.
  sqlite.pragma('busy_timeout = 5000');
  sqlite.pragma('temp_store = MEMORY');
  // 64 Mo de cache : le catalogue entier tient en mémoire.
  sqlite.pragma('cache_size = -64000');

  const db = drizzle(sqlite, { schema });

  return { db, sqlite };
}

function connection() {
  if (!instance) {
    instance = create();
    runMigrations(instance);
  }
  return instance;
}

function runMigrations(conn: ReturnType<typeof create>) {
  try {
    migrate(conn.db, { migrationsFolder: './drizzle' });
  } catch (error) {
    console.error('[base] migration impossible :', error);
    throw error;
  }
}

/** Client Drizzle, créé à la première utilisation. */
export const db = new Proxy({} as ReturnType<typeof create>['db'], {
  get(_target, prop) {
    const value = connection().db[prop as keyof ReturnType<typeof create>['db']];
    return typeof value === 'function' ? value.bind(connection().db) : value;
  },
});

/** Accès direct à better-sqlite3, pour les transactions synchrones. */
export function raw() {
  return connection().sqlite;
}

/**
 * Exécute une fonction dans une transaction immédiate.
 * C'est ce qui rend un import de 5 000 lignes quasi instantané :
 * un seul fsync au lieu de 5 000.
 */
export function transact<T>(fn: () => T): T {
  const sqlite = connection().sqlite;
  const run = sqlite.transaction(fn);
  return run.immediate();
}

/** Sauvegarde à chaud, sans arrêter le serveur. */
export async function backup(destination: string): Promise<void> {
  await connection().sqlite.backup(destination);
}

/** Fait de la place après de grosses suppressions. */
export function compact(): void {
  connection().sqlite.exec('VACUUM');
  connection().sqlite.exec('ANALYZE');
}

export { schema };
export * from './schema';
