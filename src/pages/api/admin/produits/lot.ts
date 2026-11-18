export const prerender = false;

import type { APIRoute } from 'astro';
import {
  bulkSetStatus, bulkSetCategory, bulkAdjustPrice, bulkSetStock,
  deleteProducts, productIdsMatching, duplicateProduct,
  type ProductFilters, type StockFilter, type ProductSort,
} from '../../../../lib/repo/products';
import { deleteImage } from '../../../../lib/images';
import {
  requireUser, readBody, asString, asNumber, asStringArray, ok, fail,
} from '../../../../lib/api';
import { plural } from '../../../../lib/text';

/**
 * Actions en lot sur les articles.
 *
 * La sélection arrive soit comme une liste d'identifiants, soit comme
 * un filtre — « tous les articles qui correspondent à ma recherche ».
 * Le second cas permet d'agir sur 3 000 fiches sans les cocher.
 */
export const POST: APIRoute = async (context) => {
  const { user, response } = requireUser(context);
  if (response) return response;

  const body = await readBody(context.request);
  const action = asString(body.action);

  let ids = asStringArray(body.ids);

  // Sélection par filtre.
  if (!ids.length && body.filter && typeof body.filter === 'object') {
    const f = body.filter as Record<string, unknown>;
    const filters: ProductFilters = {
      search: asString(f.search) || undefined,
      status: (asString(f.status) || 'all') as ProductFilters['status'],
      categoryId: asString(f.categoryId) || undefined,
      division: asString(f.division) || undefined,
      stock: (asString(f.stock) || 'all') as StockFilter,
      noImage: f.noImage === true || f.noImage === 'true',
      noPrice: f.noPrice === true || f.noPrice === 'true',
      sort: (asString(f.sort) || 'recent') as ProductSort,
    };
    ids = await productIdsMatching(filters);
  }

  if (!ids.length) return fail('Aucun article sélectionné.');

  try {
    switch (action) {
      case 'publier': {
        const n = bulkSetStatus(ids, 'published');
        return ok({ count: n, message: `${plural(n, 'article')} publié${n > 1 ? 's' : ''}.` });
      }
      case 'brouillon': {
        const n = bulkSetStatus(ids, 'draft');
        return ok({ count: n, message: `${plural(n, 'article')} repassé${n > 1 ? 's' : ''} en brouillon.` });
      }
      case 'archiver': {
        const n = bulkSetStatus(ids, 'archived');
        return ok({ count: n, message: `${plural(n, 'article')} archivé${n > 1 ? 's' : ''}.` });
      }

      case 'rayon': {
        const categoryId = asString(body.categoryId) || null;
        const division = asString(body.division) || null;
        const n = bulkSetCategory(ids, categoryId, division);
        return ok({ count: n, message: `Rayon appliqué à ${plural(n, 'article')}.` });
      }

      case 'prix': {
        const mode = asString(body.mode) as 'percent' | 'amount' | 'set' | 'round';
        const value = asNumber(body.value);
        if (value === null) return fail('Indiquez une valeur.');
        if (!['percent', 'amount', 'set', 'round'].includes(mode)) return fail('Mode de calcul inconnu.');
        if (mode === 'round' && value <= 0) return fail('L’arrondi doit être supérieur à zéro.');
        if (mode === 'percent' && value <= -100) return fail('Une baisse de 100 % mettrait tous les prix à zéro.');

        const n = bulkAdjustPrice(ids, { mode, value } as never);
        const label =
          mode === 'percent' ? `${value > 0 ? '+' : ''}${value} %`
          : mode === 'amount' ? `${value > 0 ? '+' : ''}${value} FCFA`
          : mode === 'set' ? `${value} FCFA`
          : `arrondi au multiple de ${value}`;
        return ok({ count: n, message: `Prix mis à jour (${label}) sur ${plural(n, 'article')}.` });
      }

      case 'stock': {
        const mode = asString(body.mode) === 'adjust' ? 'adjust' : 'set';
        const value = asNumber(body.value);
        if (value === null) return fail('Indiquez une quantité.');
        const n = bulkSetStock(ids, { mode, value } as never, {
          userId: user!.id,
          note: 'Modification en lot',
        });
        return ok({ count: n, message: `Stock mis à jour sur ${plural(n, 'article')}.` });
      }

      case 'dupliquer': {
        if (ids.length > 50) return fail('Dupliquez 50 articles au maximum à la fois.');
        let n = 0;
        for (const id of ids) {
          const copy = await duplicateProduct(id);
          if (copy) n += 1;
        }
        return ok({ count: n, message: `${plural(n, 'copie')} créée${n > 1 ? 's' : ''} en brouillon.` });
      }

      case 'supprimer': {
        const result = await deleteProducts(ids);
        // Les fichiers partent après la base : une erreur disque ne
        // laisse pas la base dans un état incohérent.
        await Promise.all(result.images.map((i) => deleteImage(i.filename, i.widths)));
        return ok({
          count: result.deleted,
          message: `${plural(result.deleted, 'article')} supprimé${result.deleted > 1 ? 's' : ''} définitivement.`,
        });
      }

      default:
        return fail('Action inconnue.');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[lot]', error);
    return fail(`L’opération a échoué : ${message}`, 500);
  }
};
