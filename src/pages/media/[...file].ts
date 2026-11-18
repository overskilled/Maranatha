export const prerender = false;

import type { APIRoute } from 'astro';
import { readRendition } from '../../lib/images';

/**
 * Sert les photos produits depuis le volume de données.
 *
 * En production, nginx sert ce dossier directement et n'arrive
 * jamais jusqu'ici ; cette route garantit que tout fonctionne
 * aussi en développement et si la configuration du proxy change.
 */
export const GET: APIRoute = async ({ params }) => {
  const name = Array.isArray(params.file) ? params.file.join('/') : (params.file ?? '');

  const found = await readRendition(name);
  if (!found) {
    return new Response('Photo introuvable', { status: 404 });
  }

  return new Response(found.body, {
    headers: {
      'Content-Type': 'image/webp',
      'Content-Length': String(found.bytes),
      // Le nom de fichier porte un suffixe unique : le cache peut durer.
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
