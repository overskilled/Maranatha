export const prerender = false;

import type { APIRoute } from 'astro';
import { listCategories } from '../../../../lib/repo/products';
import { requireUser } from '../../../../lib/api';
import { TEMPLATE_HEADERS } from '../../../../lib/import/columns';

/**
 * Modèle de fichier, prérempli avec ses propres rayons et deux
 * lignes d'exemple. Séparateur point-virgule et marque UTF-8 :
 * Excel l'ouvre en colonnes avec les accents corrects.
 */
export const GET: APIRoute = async (context) => {
  const { response } = requireUser(context);
  if (response) return response;

  const categories = await listCategories();
  const sample = categories[0]?.name ?? 'Épicerie';
  const other = categories[1]?.name ?? 'Quincaillerie';

  const rows = [
    [...TEMPLATE_HEADERS],
    [
      'RIZ-25KG', 'Riz parfumé 25 kg', sample, '18500', '40', 'sac', '15000',
      'Riz long grain, sac de 25 kg.', 'Marque exemple', 'Thaïlande', '1', '5',
      'publié', 'riz, gros, sac',
    ],
    [
      'CIM-50KG', 'Ciment 50 kg', other, '6500', '120', 'sac', '5800',
      'Ciment CPJ 35, sac de 50 kg.', '', 'Cameroun', '10', '20',
      'publié', 'ciment, chantier',
    ],
  ];

  const escape = (value: string) =>
    value.includes(';') || value.includes('"') || value.includes('\n')
      ? `"${value.replace(/"/g, '""')}"`
      : value;

  const csv = `﻿${rows.map((r) => r.map(escape).join(';')).join('\r\n')}\r\n`;

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="modele-articles-maranatha.csv"',
      'Cache-Control': 'no-store',
    },
  });
};
