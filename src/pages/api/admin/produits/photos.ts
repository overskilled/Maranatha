export const prerender = false;

import type { APIRoute } from 'astro';
import { eq, asc, sql, inArray } from 'drizzle-orm';
import { db } from '../../../../lib/db';
import { products, productImages } from '../../../../lib/db/schema';
import { processImage, deleteImage, isAcceptedImage, matchFilename, imageUrl } from '../../../../lib/images';
import { newId } from '../../../../lib/ids';
import { requireUser, readBody, asString, asNumber, ok, fail, json } from '../../../../lib/api';
import { skuify } from '../../../../lib/text';

/**
 * Dépôt de photos.
 *
 * Deux usages :
 *   — une fiche précise, avec « productId » ;
 *   — un dépôt en lot, où le nom du fichier porte la référence.
 *
 * Les fichiers arrivent par petits paquets envoyés depuis le
 * navigateur : chaque photo est traitée et rangée immédiatement,
 * de sorte qu'une coupure réseau ne perd que le paquet en cours.
 */
export const POST: APIRoute = async (context) => {
  const { response } = requireUser(context);
  if (response) return response;

  let form: FormData;
  try {
    form = await context.request.formData();
  } catch {
    return fail('Les photos n’ont pas pu être reçues.');
  }

  const files = form.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return fail('Aucune photo reçue.');

  const targetId = asString(form.get('productId'));

  type Outcome = {
    file: string;
    ok: boolean;
    sku?: string;
    productName?: string;
    url?: string;
    reason?: string;
  };
  const results: Outcome[] = [];

  for (const file of files) {
    if (!isAcceptedImage(file)) {
      results.push({ file: file.name, ok: false, reason: 'Format non reconnu (JPEG, PNG, WebP ou HEIC).' });
      continue;
    }

    /* Trouver la fiche à laquelle rattacher la photo. */
    let product: typeof products.$inferSelect | undefined;
    let position = 0;

    if (targetId) {
      const found = await db.select().from(products).where(eq(products.id, targetId)).limit(1);
      product = found[0];
      if (!product) {
        results.push({ file: file.name, ok: false, reason: 'Article introuvable.' });
        continue;
      }
    } else {
      // Le nom du fichier porte la référence : « RIZ-25KG-2.jpg ».
      const match = matchFilename(file.name);

      const exact = await db
        .select()
        .from(products)
        .where(eq(products.sku, match.exact))
        .limit(1);
      product = exact[0];

      if (!product && match.ranked) {
        const ranked = await db
          .select()
          .from(products)
          .where(eq(products.sku, match.ranked.sku))
          .limit(1);
        product = ranked[0];
        if (product) position = match.ranked.position - 1;
      }

      if (!product) {
        results.push({
          file: file.name,
          ok: false,
          sku: match.exact,
          reason: `Aucun article avec la référence ${match.exact}.`,
        });
        continue;
      }
    }

    /* Traiter et ranger. */
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const processed = await processImage(buffer, product.sku);

      // Placer après les photos existantes si aucun rang n'est donné.
      if (position === 0) {
        const last = await db
          .select({ n: sql<number>`coalesce(max(${productImages.position}), -1)` })
          .from(productImages)
          .where(eq(productImages.productId, product.id));
        position = Number(last[0]?.n ?? -1) + 1;
      }

      await db.insert(productImages).values({
        id: newId(),
        productId: product.id,
        filename: processed.filename,
        width: processed.width,
        height: processed.height,
        widths: processed.widths,
        placeholder: processed.placeholder,
        alt: product.name,
        position,
      });

      await db
        .update(products)
        .set({ updatedAt: Math.floor(Date.now() / 1000) })
        .where(eq(products.id, product.id));

      results.push({
        file: file.name,
        ok: true,
        sku: product.sku,
        productName: product.name,
        url: imageUrl(processed.filename, processed.widths[0]),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ file: file.name, ok: false, reason: message });
    }
  }

  return json({
    ok: true,
    results,
    matched: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
  });
};

/** Supprime une photo, ou réordonne celles d'une fiche. */
export const PATCH: APIRoute = async (context) => {
  const { response } = requireUser(context);
  if (response) return response;

  const body = await readBody(context.request);
  const action = asString(body.action);

  if (action === 'supprimer') {
    const id = asString(body.id);
    const found = await db.select().from(productImages).where(eq(productImages.id, id)).limit(1);
    const image = found[0];
    if (!image) return fail('Photo introuvable.', 404);

    await db.delete(productImages).where(eq(productImages.id, id));

    let widths: number[] = [400, 800, 1600];
    try {
      widths = typeof image.widths === 'string' ? JSON.parse(image.widths) : (image.widths as number[]);
    } catch {
      /* on supprimera les largeurs habituelles */
    }
    await deleteImage(image.filename, widths);

    return ok({ message: 'Photo supprimée.' });
  }

  if (action === 'couverture') {
    // Mettre une photo en premier : elle devient la vignette.
    const id = asString(body.id);
    const found = await db.select().from(productImages).where(eq(productImages.id, id)).limit(1);
    const image = found[0];
    if (!image) return fail('Photo introuvable.', 404);

    const siblings = await db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, image.productId))
      .orderBy(asc(productImages.position));

    const reordered = [image, ...siblings.filter((s) => s.id !== id)];
    for (const [index, item] of reordered.entries()) {
      await db.update(productImages).set({ position: index }).where(eq(productImages.id, item.id));
    }

    return ok({ message: 'Photo mise en couverture.' });
  }

  if (action === 'ordre') {
    const ids = Array.isArray(body.ids) ? body.ids.map((v) => String(v)) : [];
    if (!ids.length) return fail('Aucun ordre fourni.');
    for (const [index, id] of ids.entries()) {
      await db.update(productImages).set({ position: index }).where(eq(productImages.id, id));
    }
    return ok({ message: 'Ordre enregistré.' });
  }

  if (action === 'texte') {
    const id = asString(body.id);
    const alt = asString(body.alt).slice(0, 300);
    await db.update(productImages).set({ alt }).where(eq(productImages.id, id));
    return ok({ message: 'Description enregistrée.' });
  }

  return fail('Action inconnue.');
};
