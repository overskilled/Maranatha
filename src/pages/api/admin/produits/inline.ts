export const prerender = false;

import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '../../../../lib/db';
import { products } from '../../../../lib/db/schema';
import { updateProduct } from '../../../../lib/repo/products';
import { requireUser, readBody, asString, ok, fail } from '../../../../lib/api';
import { parseAmount, parseQuantity, formatShort } from '../../../../lib/money';

/** Champs modifiables directement dans le tableau. */
const EDITABLE = new Set([
  'price', 'stock', 'name', 'sku', 'comparePrice', 'cost', 'lowStockThreshold', 'unit',
]);

/**
 * Enregistre une seule cellule du tableau des articles.
 * Appelé à chaque sortie de champ ; la réponse renvoie la valeur
 * telle qu'elle a été comprise, pour la réafficher proprement.
 */
export const POST: APIRoute = async (context) => {
  const { response } = requireUser(context);
  if (response) return response;

  const body = await readBody(context.request);
  const id = asString(body.id);
  const field = asString(body.field);
  const rawValue = asString(body.value);

  if (!id || !EDITABLE.has(field)) {
    return fail('Champ non modifiable ici.');
  }

  const existing = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!existing.length) return fail('Article introuvable.', 404);

  const patch: Record<string, unknown> = {};

  switch (field) {
    case 'price':
    case 'comparePrice':
    case 'cost': {
      if (!rawValue.trim()) {
        if (field === 'price') return fail('Le prix ne peut pas être vide.');
        patch[field] = null;
        break;
      }
      const amount = parseAmount(rawValue);
      if (amount === null) return fail(`« ${rawValue} » n’est pas un montant.`);
      if (amount < 0) return fail('Le montant ne peut pas être négatif.');
      patch[field] = amount;
      break;
    }
    case 'stock':
    case 'lowStockThreshold': {
      const quantity = parseQuantity(rawValue || '0');
      if (quantity === null) return fail(`« ${rawValue} » n’est pas un nombre.`);
      patch[field] = Math.max(0, quantity);
      break;
    }
    case 'name': {
      if (!rawValue.trim()) return fail('Le nom ne peut pas être vide.');
      patch.name = rawValue.trim().slice(0, 300);
      break;
    }
    case 'sku': {
      if (!rawValue.trim()) return fail('La référence ne peut pas être vide.');
      patch.sku = rawValue.trim();
      break;
    }
    case 'unit': {
      patch.unit = rawValue.trim().slice(0, 40) || 'pièce';
      break;
    }
    default:
      return fail('Champ non modifiable ici.');
  }

  const updated = await updateProduct(id, patch);
  if (!updated) return fail('Enregistrement impossible.');

  return ok({
    product: {
      id: updated.id,
      sku: updated.sku,
      name: updated.name,
      price: updated.price,
      priceLabel: formatShort(updated.price),
      stock: updated.stock,
      unit: updated.unit,
      status: updated.status,
    },
  });
};
