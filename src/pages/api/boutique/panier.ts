export const prerender = false;

import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '../../../lib/db';
import { products } from '../../../lib/db/schema';
import {
  readCart, writeCart, addToCart, setQuantity, removeFromCart, cartCount, cartDetails,
} from '../../../lib/cart';
import { readBody, asString, asNumber, ok, fail } from '../../../lib/api';
import { formatShort } from '../../../lib/money';
import { getSettings } from '../../../lib/settings';

/**
 * Panier : ajouter, changer une quantité, retirer.
 * Les prix ne viennent jamais du navigateur — seuls l'identifiant
 * et la quantité transitent.
 */
export const POST: APIRoute = async (context) => {
  const body = await readBody(context.request);
  const action = asString(body.action) || 'ajouter';
  const id = asString(body.id);

  let cart = readCart(context.cookies);

  if (action === 'ajouter') {
    if (!id) return fail('Article introuvable.');

    const found = await db.select().from(products).where(eq(products.id, id)).limit(1);
    const product = found[0];

    if (!product || product.status !== 'published') {
      return fail('Cet article n’est plus disponible.');
    }

    const config = getSettings();
    if (!config.open) return fail(config.closedMessage);

    const asked = Math.max(1, Math.round(asNumber(body.quantity, 1) ?? 1));
    const quantity = Math.max(asked, product.minQuantity);

    if (product.trackStock && product.stock <= 0) {
      return fail(`${product.name} est épuisé pour le moment.`);
    }

    const already = cart.lines.find((l) => l.id === id)?.qty ?? 0;
    if (product.trackStock && already + quantity > product.stock) {
      const left = Math.max(0, product.stock - already);
      return fail(
        left === 0
          ? `Vous avez déjà tout le stock disponible de ${product.name} dans votre panier.`
          : `Il ne reste que ${left} ${product.unit} de ${product.name}.`,
      );
    }

    cart = addToCart(cart, id, quantity);
    writeCart(context.cookies, cart);

    return ok({
      count: cartCount(cart),
      message: `${product.name} ajouté au panier.`,
    });
  }

  if (action === 'quantite') {
    const quantity = Math.round(asNumber(body.quantity, 1) ?? 1);
    cart = setQuantity(cart, id, quantity);
    writeCart(context.cookies, cart);

    const details = await cartDetails(cart);
    const line = details.items.find((i) => i.id === id);

    return ok({
      count: details.count,
      subtotal: details.subtotal,
      subtotalLabel: formatShort(details.subtotal),
      lineTotal: line ? formatShort(line.lineTotal) : null,
      quantity: line?.quantity ?? 0,
      problem: line?.problem ?? null,
    });
  }

  if (action === 'retirer') {
    cart = removeFromCart(cart, id);
    writeCart(context.cookies, cart);

    const details = await cartDetails(cart);
    return ok({
      count: details.count,
      subtotal: details.subtotal,
      subtotalLabel: formatShort(details.subtotal),
      message: 'Article retiré du panier.',
    });
  }

  if (action === 'vider') {
    writeCart(context.cookies, { lines: [] });
    return ok({ count: 0, message: 'Panier vidé.' });
  }

  return fail('Action inconnue.');
};

/** Contenu du panier, pour le compteur de l'en-tête. */
export const GET: APIRoute = async (context) => {
  const details = await cartDetails(readCart(context.cookies));
  return ok({
    count: details.count,
    subtotal: details.subtotal,
    subtotalLabel: formatShort(details.subtotal),
  });
};
