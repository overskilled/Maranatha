export const prerender = false;

import type { APIRoute } from 'astro';
import { readRendition } from '../../lib/images';
import { storage } from '../../lib/storage';
import { env } from '../../lib/env';

/**
 * Sert les photos produits.
 *
 * Trois cas, dans cet ordre :
 *   — photos sur R2 avec un domaine public : on renvoie vers lui,
 *     pour que l'image parte du réseau de Cloudflare. Les anciens
 *     liens /media continuent donc de fonctionner.
 *   — photos sur R2 sans domaine public : on relaie le contenu.
 *   — photos sur le disque : nginx les sert en production et
 *     n'arrive jamais ici ; cette route couvre le développement.
 */
export const GET: APIRoute = async ({ params }) => {
  const name = Array.isArray(params.file) ? params.file.join('/') : (params.file ?? '');

  // Un seul segment, un seul rendu : aucune sortie du dossier possible.
  if (!/^[a-z0-9-]+\.webp$/i.test(name)) {
    return new Response('Photo introuvable', { status: 404 });
  }

  if (storage.driver === 'r2' && env.r2.publicUrl) {
    return new Response(null, {
      status: 301,
      headers: {
        Location: storage.url(name),
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }

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
