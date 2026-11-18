/* ============================================================
   Panier.
   Stocké dans un cookie : ni compte à créer, ni session serveur.
   Seuls les identifiants et les quantités y sont gardés — les
   prix sont toujours relus en base au moment de commander.
   ============================================================ */

import type { AstroCookies } from 'astro';
import { inArray } from 'drizzle-orm';
import { db } from './db';
import { products, productImages } from './db/schema';
import { env } from './env';
import { deliveryFeeFor } from './settings';

export const CART_COOKIE = 'maranatha_panier';
const MAX_LINES = 60;

export type CartLine = { id: string; qty: number };
export type Cart = { lines: CartLine[] };

export const EMPTY_CART: Cart = { lines: [] };

export function readCart(cookies: AstroCookies): Cart {
  const raw = cookies.get(CART_COOKIE)?.value;
  if (!raw) return EMPTY_CART;

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as unknown;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as Cart).lines)) {
      return EMPTY_CART;
    }
    const lines = (parsed as Cart).lines
      .filter((l) => l && typeof l.id === 'string' && Number.isFinite(l.qty))
      .map((l) => ({ id: l.id.slice(0, 40), qty: Math.max(1, Math.min(9999, Math.round(l.qty))) }))
      .slice(0, MAX_LINES);
    return { lines };
  } catch {
    return EMPTY_CART;
  }
}

export function writeCart(cookies: AstroCookies, cart: Cart): void {
  if (!cart.lines.length) {
    cookies.delete(CART_COOKIE, { path: '/' });
    return;
  }
  cookies.set(CART_COOKIE, encodeURIComponent(JSON.stringify(cart)), {
    path: '/',
    httpOnly: false, // le compteur d'articles est mis à jour côté navigateur
    sameSite: 'lax',
    secure: env.production,
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function addToCart(cart: Cart, id: string, qty = 1): Cart {
  const lines = [...cart.lines];
  const found = lines.find((l) => l.id === id);
  if (found) {
    found.qty = Math.min(9999, found.qty + qty);
  } else if (lines.length < MAX_LINES) {
    lines.push({ id, qty: Math.max(1, qty) });
  }
  return { lines };
}

export function setQuantity(cart: Cart, id: string, qty: number): Cart {
  if (qty <= 0) return removeFromCart(cart, id);
  return {
    lines: cart.lines.map((l) => (l.id === id ? { ...l, qty: Math.min(9999, Math.round(qty)) } : l)),
  };
}

export function removeFromCart(cart: Cart, id: string): Cart {
  return { lines: cart.lines.filter((l) => l.id !== id) };
}

export function cartCount(cart: Cart): number {
  return cart.lines.reduce((sum, l) => sum + l.qty, 0);
}

/* ---------- Panier détaillé ---------- */

export type CartItem = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  unit: string;
  price: number;
  quantity: number;
  lineTotal: number;
  minQuantity: number;
  /** Stock réellement disponible, ou null si non suivi. */
  available: number | null;
  image: { filename: string; widths: number[]; placeholder: string | null } | null;
  /** Renseigné si la ligne doit être corrigée avant de commander. */
  problem: string | null;
};

export type CartDetails = {
  items: CartItem[];
  subtotal: number;
  count: number;
  /** Lignes retirées parce que l'article n'existe plus. */
  dropped: number;
  hasProblems: boolean;
};

/** Relit le panier en base : prix à jour, stock à jour. */
export async function cartDetails(cart: Cart): Promise<CartDetails> {
  if (!cart.lines.length) {
    return { items: [], subtotal: 0, count: 0, dropped: 0, hasProblems: false };
  }

  const ids = cart.lines.map((l) => l.id);
  const rows = await db.select().from(products).where(inArray(products.id, ids));
  const images = await db
    .select()
    .from(productImages)
    .where(inArray(productImages.productId, ids));

  const coverFor = new Map<string, { filename: string; widths: number[]; placeholder: string | null }>();
  for (const image of images.sort((a, b) => a.position - b.position)) {
    if (!coverFor.has(image.productId)) {
      let widths: number[] = [400];
      try {
        widths = typeof image.widths === 'string' ? JSON.parse(image.widths) : (image.widths as number[]);
      } catch {
        widths = [400];
      }
      coverFor.set(image.productId, {
        filename: image.filename,
        widths,
        placeholder: image.placeholder,
      });
    }
  }

  const byId = new Map(rows.map((r) => [r.id, r]));
  const items: CartItem[] = [];
  let dropped = 0;

  for (const line of cart.lines) {
    const product = byId.get(line.id);
    if (!product || product.status !== 'published') {
      dropped += 1;
      continue;
    }

    const available = product.trackStock ? Math.max(0, product.stock) : null;
    let quantity = line.qty;
    let problem: string | null = null;

    if (quantity < product.minQuantity) {
      quantity = product.minQuantity;
      problem = `Commande par ${product.minQuantity} ${product.unit} minimum.`;
    }
    if (available !== null && quantity > available) {
      problem = available === 0
        ? 'Épuisé pour le moment.'
        : `Il ne reste que ${available} ${product.unit}.`;
    }

    items.push({
      id: product.id,
      sku: product.sku,
      slug: product.slug,
      name: product.name,
      unit: product.unit,
      price: product.price,
      quantity,
      lineTotal: product.price * quantity,
      minQuantity: product.minQuantity,
      available,
      image: coverFor.get(product.id) ?? null,
      problem,
    });
  }

  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);

  return {
    items,
    subtotal,
    count: items.reduce((sum, i) => sum + i.quantity, 0),
    dropped,
    hasProblems: items.some((i) => i.problem !== null),
  };
}

/** Total à payer, livraison comprise. */
export function cartTotals(subtotal: number, city?: string | null) {
  const deliveryFee = deliveryFeeFor(city, subtotal);
  return { subtotal, deliveryFee, total: subtotal + deliveryFee };
}
