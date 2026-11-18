/* ============================================================
   Où vivent les photos du catalogue.

   Deux pilotes, même interface :
     — « local »  : le disque du serveur. Rien à configurer, la
       boutique marche hors ligne et en développement.
     — « r2 »     : Cloudflare R2. Les photos sortent du serveur,
       sont servies par le réseau de Cloudflare, et survivent à
       un redéploiement même sans volume.

   Le choix se fait par la configuration. Le reste du code ne
   sait pas lequel est actif.
   ============================================================ */

import { mkdir, writeFile, unlink, readFile, stat } from 'node:fs/promises';
import { join, basename } from 'node:path';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectsCommand,
  HeadBucketCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { env } from './env';

export type StoredObject = { key: string; bytes: number };

/** Une année : les noms de fichiers portent un suffixe unique. */
const CACHE_CONTROL = 'public, max-age=31536000, immutable';

/* ---------- Pilote R2 ---------- */

let client: S3Client | null = null;

function r2(): S3Client {
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: env.r2.endpoint,
      credentials: {
        accessKeyId: env.r2.accessKeyId,
        secretAccessKey: env.r2.secretAccessKey,
      },
    });
  }
  return client;
}

/** Clé complète d'un rendu dans le bucket. */
function r2Key(filename: string): string {
  const prefix = env.r2.prefix.replace(/^\/+|\/+$/g, '');
  return prefix ? `${prefix}/${filename}` : filename;
}

/* ---------- Interface commune ---------- */

export const storage = {
  /** « r2 » si le stockage distant est configuré, sinon « local ». */
  get driver(): 'local' | 'r2' {
    return env.r2.enabled ? 'r2' : 'local';
  },

  /** Écrit un rendu. `name` est un nom de fichier, pas un chemin. */
  async put(name: string, body: Buffer, contentType = 'image/webp'): Promise<StoredObject> {
    const safe = basename(name);

    if (this.driver === 'r2') {
      await r2().send(
        new PutObjectCommand({
          Bucket: env.r2.bucket,
          Key: r2Key(safe),
          Body: body,
          ContentType: contentType,
          CacheControl: CACHE_CONTROL,
        }),
      );
      return { key: r2Key(safe), bytes: body.byteLength };
    }

    await mkdir(env.uploadsDir, { recursive: true });
    await writeFile(join(env.uploadsDir, safe), body);
    return { key: safe, bytes: body.byteLength };
  },

  /**
   * Supprime plusieurs rendus. Une photo retirée doit l'être
   * partout : on ne laisse pas d'objets orphelins à payer.
   */
  async remove(names: string[]): Promise<void> {
    const safe = names.map((n) => basename(n)).filter(Boolean);
    if (!safe.length) return;

    if (this.driver === 'r2') {
      // L'API accepte 1 000 clés par appel ; on reste loin du plafond.
      for (let i = 0; i < safe.length; i += 500) {
        await r2()
          .send(
            new DeleteObjectsCommand({
              Bucket: env.r2.bucket,
              Delete: { Objects: safe.slice(i, i + 500).map((n) => ({ Key: r2Key(n) })) },
            }),
          )
          .catch((error) => {
            // Un fichier déjà absent ne doit pas faire échouer la suppression
            // de la fiche : on le signale et on continue.
            console.error('[stockage] suppression R2 incomplète :', error);
          });
      }
      return;
    }

    await Promise.all(
      safe.map((n) => unlink(join(env.uploadsDir, n)).catch(() => {})),
    );
  },

  /**
   * Relit un rendu. Utilisé par /media quand les photos sont sur
   * le disque ; avec R2, le navigateur va les chercher directement.
   */
  async read(name: string): Promise<{ body: Buffer; bytes: number } | null> {
    if (!/^[a-z0-9-]+\.webp$/i.test(name)) return null;
    const safe = basename(name);

    if (this.driver === 'r2') {
      try {
        const result = await r2().send(
          new GetObjectCommand({ Bucket: env.r2.bucket, Key: r2Key(safe) }),
        );
        const body = Buffer.from(await result.Body!.transformToByteArray());
        return { body, bytes: body.byteLength };
      } catch {
        return null;
      }
    }

    try {
      const path = join(env.uploadsDir, safe);
      const info = await stat(path);
      if (!info.isFile()) return null;
      return { body: await readFile(path), bytes: info.size };
    } catch {
      return null;
    }
  },

  /**
   * Adresse publique d'un rendu.
   * Avec un domaine R2 public, l'image part du réseau de Cloudflare
   * et ne touche jamais le serveur.
   */
  url(name: string): string {
    if (this.driver === 'r2' && env.r2.publicUrl) {
      const base = env.r2.publicUrl.replace(/\/+$/, '');
      return `${base}/${r2Key(name)}`;
    }
    return `/media/${name}`;
  },

  /** Vérifie l'accès au démarrage, pour échouer tôt et clairement. */
  async check(): Promise<{ ok: true } | { ok: false; error: string }> {
    if (this.driver === 'local') {
      try {
        await mkdir(env.uploadsDir, { recursive: true });
        return { ok: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { ok: false, error: `Dossier des photos inaccessible : ${message}` };
      }
    }

    try {
      await r2().send(new HeadBucketCommand({ Bucket: env.r2.bucket }));
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, error: `Bucket R2 « ${env.r2.bucket} » injoignable : ${message}` };
    }
  },
};
