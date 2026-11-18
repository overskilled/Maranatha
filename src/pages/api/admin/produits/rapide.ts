export const prerender = false;

import type { APIRoute } from 'astro';
import { createProduct, findOrCreateCategory } from '../../../../lib/repo/products';
import { requireUser, readBody, asString, ok, fail } from '../../../../lib/api';
import { parseAmount, parseQuantity, formatShort } from '../../../../lib/money';

/**
 * Saisie rapide : une ligne, un article.
 * Pensée pour enchaîner — on répond vite et on renvoie de quoi
 * afficher la ligne qui vient d'être créée.
 */
export const POST: APIRoute = async (context) => {
  const { response } = requireUser(context);
  if (response) return response;

  const body = await readBody(context.request);

  const name = asString(body.name).trim();
  if (!name) return fail('Le nom est obligatoire.');

  const priceRaw = asString(body.price).trim();
  const price = priceRaw ? parseAmount(priceRaw) : 0;
  if (price === null) return fail(`« ${priceRaw} » n’est pas un montant.`);

  const stockRaw = asString(body.stock).trim();
  const stock = stockRaw ? parseQuantity(stockRaw) : 0;
  if (stock === null) return fail(`« ${stockRaw} » n’est pas une quantité.`);

  // Le rayon peut être un identifiant existant ou un nom à créer.
  let categoryId: string | null = asString(body.categoryId) || null;
  const categoryName = asString(body.categoryName).trim();
  if (!categoryId && categoryName) {
    categoryId = findOrCreateCategory(categoryName, asString(body.division) || null);
  }

  try {
    const product = createProduct({
      name,
      sku: asString(body.sku).trim() || undefined,
      price: Math.max(0, price),
      stock: Math.max(0, stock),
      unit: asString(body.unit).trim() || 'pièce',
      categoryId,
      division: asString(body.division) || null,
      status: asString(body.status) === 'published' ? 'published' : 'draft',
    });

    return ok({
      product: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        price: product.price,
        priceLabel: formatShort(product.price),
        stock: product.stock,
        unit: product.unit,
        status: product.status,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return fail(`Création impossible : ${message}`, 500);
  }
};
