/* ============================================================
   Traitement des photos produits.
   Une photo déposée devient trois rendus WebP et un micro-aperçu.
   Même approche que les images du site : léger, net, et rapide
   à charger sur une connexion mobile.
   ============================================================ */

import { mkdir, writeFile, unlink, readFile, stat } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import sharp from 'sharp';
import { env } from './env';
import { slugify, skuify } from './text';
import { newId } from './ids';

/** Largeurs produites. La vignette du back-office utilise la première. */
export const WIDTHS = [400, 800, 1600] as const;

/** 12 Mo : largement de quoi accepter une photo de téléphone. */
export const MAX_BYTES = 12 * 1024 * 1024;

const ACCEPTED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/tiff',
  'image/heic',
  'image/heif',
]);

const ACCEPTED_EXT = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff', '.heic', '.heif',
]);

export type ProcessedImage = {
  filename: string;
  width: number;
  height: number;
  widths: number[];
  placeholder: string;
  bytes: number;
};

export function isAcceptedImage(file: { type?: string; name?: string }): boolean {
  if (file.type && ACCEPTED.has(file.type.toLowerCase())) return true;
  const ext = extname(file.name ?? '').toLowerCase();
  return ACCEPTED_EXT.has(ext);
}

async function ensureDir(): Promise<void> {
  await mkdir(env.uploadsDir, { recursive: true });
}

/**
 * Traite une photo et écrit ses rendus.
 *
 * `hint` sert à nommer le fichier de façon lisible (souvent la
 * référence du produit) ; un suffixe aléatoire évite les collisions
 * et garantit qu'un remplacement ne sera pas servi depuis le cache.
 */
export async function processImage(
  input: Buffer,
  hint = 'photo',
): Promise<ProcessedImage> {
  if (input.byteLength > MAX_BYTES) {
    throw new Error(
      `La photo pèse ${Math.round(input.byteLength / 1024 / 1024)} Mo, la limite est de ${MAX_BYTES / 1024 / 1024} Mo.`,
    );
  }

  await ensureDir();

  // `failOn: 'none'` : une photo légèrement abîmée passe quand même.
  const image = sharp(input, { failOn: 'none' }).rotate();
  const meta = await image.metadata();

  const sourceWidth = meta.width ?? 0;
  const sourceHeight = meta.height ?? 0;
  if (!sourceWidth || !sourceHeight) {
    throw new Error("Ce fichier n'est pas une image lisible.");
  }

  const filename = `${slugify(hint) || 'photo'}-${newId().slice(-8)}`;

  // Ne jamais agrandir : on s'arrête à la largeur d'origine.
  const targets = WIDTHS.filter((w) => w <= sourceWidth);
  if (targets.length === 0) targets.push(sourceWidth as (typeof WIDTHS)[number]);

  let bytes = 0;
  const written: number[] = [];

  for (const width of targets) {
    const buffer = await sharp(input, { failOn: 'none' })
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: width >= 1600 ? 76 : 82, effort: 4 })
      .toBuffer();

    await writeFile(join(env.uploadsDir, `${filename}-${width}.webp`), buffer);
    bytes += buffer.byteLength;
    written.push(width);
  }

  // Micro-aperçu intégré au HTML, affiché le temps du chargement.
  const lqip = await sharp(input, { failOn: 'none' })
    .rotate()
    .resize({ width: 24 })
    .blur(1.2)
    .webp({ quality: 40 })
    .toBuffer();

  const largest = written[written.length - 1];
  const scale = largest / sourceWidth;

  return {
    filename,
    width: largest,
    height: Math.round(sourceHeight * scale),
    widths: written,
    placeholder: `data:image/webp;base64,${lqip.toString('base64')}`,
    bytes,
  };
}

/** Supprime tous les rendus d'une photo. */
export async function deleteImage(
  filename: string,
  widths: number[] = [...WIDTHS],
): Promise<void> {
  const safe = basename(filename).replace(/[^a-z0-9-]/gi, '');
  if (!safe) return;
  await Promise.all(
    widths.map((w) =>
      unlink(join(env.uploadsDir, `${safe}-${w}.webp`)).catch(() => {}),
    ),
  );
}

/** Lit un rendu pour le servir. Refuse toute sortie du dossier. */
export async function readRendition(
  name: string,
): Promise<{ body: Buffer; bytes: number } | null> {
  if (!/^[a-z0-9-]+\.webp$/i.test(name)) return null;
  const path = join(env.uploadsDir, basename(name));
  try {
    const info = await stat(path);
    if (!info.isFile()) return null;
    return { body: await readFile(path), bytes: info.size };
  } catch {
    return null;
  }
}

/** URL publique d'un rendu. */
export function imageUrl(filename: string, width: number): string {
  return `/media/${filename}-${width}.webp`;
}

/** Attribut srcset complet. */
export function imageSrcset(filename: string, widths: number[]): string {
  return widths.map((w) => `${imageUrl(filename, w)} ${w}w`).join(', ');
}

/* ---------- Rapprochement photo ↔ produit ---------- */

export type FilenameMatch = {
  /** Le nom de fichier entier lu comme une référence. */
  exact: string;
  /** Lecture alternative : une référence suivie d'un rang de photo. */
  ranked: { sku: string; position: number } | null;
};

/**
 * Lit le nom d'un fichier pour retrouver le produit auquel la photo
 * appartient. C'est ce qui permet de déposer deux cents photos d'un
 * coup et de les voir se ranger seules.
 *
 * Deux lectures sont renvoyées, car elles sont parfois en concurrence :
 * une référence peut elle-même finir par un chiffre.
 *
 * « RIZ-25KG.jpg »   → exact RIZ-25KG            · pas de rang
 * « riz-25kg-2.jpg » → exact RIZ-25KG-2          · ou RIZ-25KG, photo 2
 * « RIZ-25KG_3.JPG » → exact RIZ-25KG-3          · ou RIZ-25KG, photo 3
 * « IMG_4821.jpg »   → exact IMG-4821            · pas de rang
 *
 * L'appelant essaie `exact` d'abord : si une référence existe telle
 * quelle dans le catalogue, elle gagne. Sinon il retombe sur `ranked`.
 */
export function matchFilename(name: string): FilenameMatch {
  const stem = basename(name, extname(name)).trim();
  const exact = skuify(stem);

  // Un rang en fin de nom, séparé par un tiret, un souligné,
  // une espace ou une parenthèse.
  const m = stem.match(/^(.*[^\s_(-])[\s_(-]+(\d{1,2})\s*\)?$/);
  if (m) {
    const sku = skuify(m[1]);
    const position = Number.parseInt(m[2], 10);
    if (sku && position >= 1 && position <= 20) {
      return { exact, ranked: { sku, position } };
    }
  }

  return { exact, ranked: null };
}
