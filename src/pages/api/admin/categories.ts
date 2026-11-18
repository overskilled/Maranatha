export const prerender = false;

import type { APIRoute } from 'astro';
import { createCategory, updateCategory, deleteCategory } from '../../../lib/repo/products';
import { requireUser, readBody, asString, asNumber, asBoolean, ok, fail } from '../../../lib/api';

/** Rayons de la boutique. */
export const POST: APIRoute = async (context) => {
  const { response } = requireUser(context);
  if (response) return response;

  const body = await readBody(context.request);
  const action = asString(body.action) || 'creer';

  if (action === 'creer') {
    const name = asString(body.name).trim();
    if (!name) return fail('Donnez un nom au rayon.');
    if (name.length > 120) return fail('Ce nom est trop long.');

    const category = await createCategory({
      name,
      description: asString(body.description) || null,
      division: asString(body.division) || null,
    });
    return ok({ category, message: `Rayon « ${category.name} » créé.` });
  }

  if (action === 'modifier') {
    const id = asString(body.id);
    if (!id) return fail('Rayon introuvable.');

    await updateCategory(id, {
      name: body.name !== undefined ? asString(body.name) : undefined,
      description: body.description !== undefined ? asString(body.description) : undefined,
      division: body.division !== undefined ? asString(body.division) : undefined,
      active: body.active !== undefined ? asBoolean(body.active) : undefined,
      position: body.position !== undefined ? (asNumber(body.position) ?? undefined) : undefined,
    });
    return ok({ message: 'Rayon modifié.' });
  }

  if (action === 'supprimer') {
    const id = asString(body.id);
    if (!id) return fail('Rayon introuvable.');

    // Les articles ne sont pas supprimés : ils perdent seulement leur rayon.
    await deleteCategory(id);
    return ok({ message: 'Rayon supprimé. Les articles sont conservés, sans rayon.' });
  }

  return fail('Action inconnue.');
};
