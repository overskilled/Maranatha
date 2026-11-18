/* ============================================================
   Commandes.
   Le stock est décrémenté une fois, dans la même transaction que
   la commande, et remis en place si la commande est annulée.
   ============================================================ */

import { and, or, eq, like, desc, asc, sql, inArray, gte, lte } from 'drizzle-orm';
import { db, raw, transact } from '../db';
import {
  orders, orderItems, products, customers, stockMovements,
  type Order, type OrderItem, type OrderStatus, type PaymentStatus,
} from '../db/schema';
import { newId } from '../ids';
import { normalize, normalizePhone } from '../text';

/* ---------- Libellés ---------- */

export const STATUS_LABEL: Record<OrderStatus, string> = {
  nouvelle: 'Nouvelle',
  confirmee: 'Confirmée',
  preparee: 'Préparée',
  expediee: 'En livraison',
  livree: 'Livrée',
  annulee: 'Annulée',
};

export const STATUS_ORDER: OrderStatus[] = [
  'nouvelle', 'confirmee', 'preparee', 'expediee', 'livree', 'annulee',
];

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  en_attente: 'En attente',
  paye: 'Payée',
  echoue: 'Échouée',
  rembourse: 'Remboursée',
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  livraison: 'À la livraison',
  boutique: 'En boutique',
  momo: 'Mobile Money',
  om: 'Orange Money',
  virement: 'Virement',
  especes: 'Espèces',
};

/** Étapes suivantes proposées depuis un statut donné. */
export function nextStatuses(status: OrderStatus): OrderStatus[] {
  switch (status) {
    case 'nouvelle': return ['confirmee', 'annulee'];
    case 'confirmee': return ['preparee', 'annulee'];
    case 'preparee': return ['expediee', 'livree', 'annulee'];
    case 'expediee': return ['livree', 'annulee'];
    case 'livree': return [];
    case 'annulee': return ['nouvelle'];
    default: return [];
  }
}

/* ---------- Lignes brutes ---------- */

/**
 * better-sqlite3 rend les colonnes telles qu'elles sont en base,
 * en minuscules séparées par des traits bas. Les types de Drizzle,
 * eux, sont en casse mixte. On traduit explicitement plutôt que de
 * supposer : une faute ici passerait inaperçue et ferait, par
 * exemple, qu'un stock ne se décrémente jamais.
 */
type RawProduct = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  price: number;
  status: string;
  stock: number;
  track_stock: number;
  min_quantity: number;
};

type SaleLine = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  price: number;
  status: string;
  stock: number;
  trackStock: boolean;
  minQuantity: number;
};

function toSaleLine(row: RawProduct): SaleLine {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    unit: row.unit,
    price: row.price,
    status: row.status,
    stock: row.stock,
    trackStock: row.track_stock === 1,
    minQuantity: row.min_quantity,
  };
}

/* ---------- Création ---------- */

export type OrderLineInput = {
  productId: string;
  quantity: number;
};

export type OrderInput = {
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  deliveryMode: 'livraison' | 'retrait';
  address?: string | null;
  city?: string | null;
  quarter?: string | null;
  note?: string | null;
  paymentMethod?: string;
  channel?: Order['channel'];
  deliveryFee?: number;
  discount?: number;
  lines: OrderLineInput[];
};

export type CreateOrderResult =
  | { ok: true; order: Order; items: OrderItem[] }
  | { ok: false; error: string; unavailable?: { name: string; available: number }[] };

/** Référence lisible, unique, remise à zéro chaque année : CMD-2026-0001. */
function nextReference(): string {
  const year = new Date().getFullYear();
  const prefix = `CMD-${year}-`;
  const row = raw()
    .prepare('select reference from orders where reference like ? order by reference desc limit 1')
    .get(`${prefix}%`) as { reference: string } | undefined;

  const last = row ? Number.parseInt(row.reference.slice(prefix.length), 10) : 0;
  const next = (Number.isFinite(last) ? last : 0) + 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

/**
 * Enregistre une commande.
 * Les prix sont relus en base — jamais ceux envoyés par le navigateur.
 */
export function createOrder(input: OrderInput): CreateOrderResult {
  if (!input.lines.length) {
    return { ok: false, error: 'Le panier est vide.' };
  }

  const phone = normalizePhone(input.customerPhone);
  if (!phone) {
    return { ok: false, error: 'Le numéro de téléphone n’est pas valide.' };
  }
  if (!input.customerName.trim()) {
    return { ok: false, error: 'Le nom est obligatoire.' };
  }
  if (input.deliveryMode === 'livraison' && !input.address?.trim()) {
    return { ok: false, error: 'L’adresse de livraison est obligatoire.' };
  }

  return transact(() => {
    const sqlite = raw();

    // Regrouper les lignes en double.
    const quantities = new Map<string, number>();
    for (const line of input.lines) {
      const qty = Math.max(0, Math.round(line.quantity));
      if (qty > 0) quantities.set(line.productId, (quantities.get(line.productId) ?? 0) + qty);
    }
    if (!quantities.size) return { ok: false as const, error: 'Le panier est vide.' };

    const ids = [...quantities.keys()];
    const marks = ids.map(() => '?').join(',');
    const rows = sqlite
      .prepare(
        `select id, sku, name, unit, price, status, stock, track_stock, min_quantity
         from products where id in (${marks})`,
      )
      .all(...ids) as RawProduct[];

    const found = new Map(rows.map((r) => [r.id, toSaleLine(r)]));
    const unavailable: { name: string; available: number }[] = [];
    const lines: { product: SaleLine; quantity: number; lineTotal: number }[] = [];

    for (const [productId, quantity] of quantities) {
      const product = found.get(productId);
      if (!product || product.status !== 'published') {
        unavailable.push({ name: product?.name ?? 'Article retiré', available: 0 });
        continue;
      }
      if (product.trackStock && product.stock < quantity) {
        unavailable.push({ name: product.name, available: Math.max(0, product.stock) });
        continue;
      }
      if (quantity < product.minQuantity) {
        return {
          ok: false as const,
          error: `${product.name} se commande par ${product.minQuantity} au minimum.`,
        };
      }
      lines.push({ product, quantity, lineTotal: product.price * quantity });
    }

    if (unavailable.length) {
      return {
        ok: false as const,
        error: 'Certains articles ne sont plus disponibles dans cette quantité.',
        unavailable,
      };
    }

    const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
    const deliveryFee = Math.max(0, Math.round(input.deliveryFee ?? 0));
    const discount = Math.max(0, Math.round(input.discount ?? 0));
    const total = Math.max(0, subtotal + deliveryFee - discount);

    const nowSec = Math.floor(Date.now() / 1000);

    /* Client : créé ou mis à jour, identifié par son téléphone. */
    const existingCustomer = sqlite
      .prepare('select * from customers where phone = ? limit 1')
      .get(phone) as (typeof customers.$inferSelect) | undefined;

    let customerId: string;
    if (existingCustomer) {
      customerId = existingCustomer.id;
      sqlite
        .prepare(
          `update customers set
             name = ?, email = coalesce(?, email), city = coalesce(?, city),
             quarter = coalesce(?, quarter),
             orders_count = orders_count + 1, total_spent = total_spent + ?,
             last_order_at = ?
           where id = ?`,
        )
        .run(
          input.customerName.trim(), input.customerEmail ?? null,
          input.city ?? null, input.quarter ?? null,
          total, nowSec, customerId,
        );
    } else {
      customerId = newId();
      sqlite
        .prepare(
          `insert into customers (id, phone, name, email, city, quarter, orders_count, total_spent, created_at, last_order_at)
           values (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
        )
        .run(
          customerId, phone, input.customerName.trim(), input.customerEmail ?? null,
          input.city ?? null, input.quarter ?? null, total, nowSec, nowSec,
        );
    }

    /* Commande */
    const orderId = newId();
    const reference = nextReference();

    sqlite
      .prepare(
        `insert into orders (
          id, reference, status, payment_status, payment_method,
          customer_id, customer_name, customer_phone, customer_email,
          delivery_mode, address, city, quarter, note,
          subtotal, delivery_fee, discount, total,
          channel, stock_applied, created_at, updated_at
        ) values (
          @id, @reference, 'nouvelle', 'en_attente', @payment_method,
          @customer_id, @customer_name, @customer_phone, @customer_email,
          @delivery_mode, @address, @city, @quarter, @note,
          @subtotal, @delivery_fee, @discount, @total,
          @channel, 1, @created_at, @created_at
        )`,
      )
      .run({
        id: orderId,
        reference,
        payment_method: input.paymentMethod ?? 'livraison',
        customer_id: customerId,
        customer_name: input.customerName.trim(),
        customer_phone: phone,
        customer_email: input.customerEmail ?? null,
        delivery_mode: input.deliveryMode,
        address: input.address ?? null,
        city: input.city ?? null,
        quarter: input.quarter ?? null,
        note: input.note ?? null,
        subtotal,
        delivery_fee: deliveryFee,
        discount,
        total,
        channel: input.channel ?? 'web',
        created_at: nowSec,
      });

    /* Lignes et stock */
    const insertItem = sqlite.prepare(
      `insert into order_items (id, order_id, product_id, sku, name, unit, unit_price, quantity, line_total)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const decrement = sqlite.prepare(
      'update products set stock = stock - ?, updated_at = ? where id = ?',
    );
    const movement = sqlite.prepare(
      `insert into stock_movements (id, product_id, delta, stock_after, reason, order_id, user_id, note, created_at)
       values (?, ?, ?, ?, 'vente', ?, null, ?, ?)`,
    );

    for (const line of lines) {
      insertItem.run(
        newId(), orderId, line.product.id, line.product.sku, line.product.name,
        line.product.unit, line.product.price, line.quantity, line.lineTotal,
      );

      if (line.product.trackStock) {
        decrement.run(line.quantity, nowSec, line.product.id);
        movement.run(
          newId(), line.product.id, -line.quantity,
          line.product.stock - line.quantity, orderId, reference, nowSec,
        );
      }
    }

    const order = sqlite.prepare('select * from orders where id = ?').get(orderId) as Order;
    const items = sqlite
      .prepare('select * from order_items where order_id = ?')
      .all(orderId) as OrderItem[];

    return { ok: true as const, order, items };
  });
}

/* ---------- Lecture ---------- */

export type OrderFilters = {
  search?: string;
  status?: OrderStatus | 'all' | 'ouvertes';
  paymentStatus?: PaymentStatus | 'all';
  channel?: Order['channel'] | 'all';
  from?: number;
  to?: number;
  page?: number;
  perPage?: number;
};

function orderConditions(f: OrderFilters) {
  const parts = [];

  if (f.status === 'ouvertes') {
    parts.push(inArray(orders.status, ['nouvelle', 'confirmee', 'preparee', 'expediee']));
  } else if (f.status && f.status !== 'all') {
    parts.push(eq(orders.status, f.status));
  }

  if (f.paymentStatus && f.paymentStatus !== 'all') {
    parts.push(eq(orders.paymentStatus, f.paymentStatus));
  }
  if (f.channel && f.channel !== 'all') parts.push(eq(orders.channel, f.channel));
  if (f.from) parts.push(gte(orders.createdAt, f.from));
  if (f.to) parts.push(lte(orders.createdAt, f.to));

  const q = (f.search ?? '').trim();
  if (q) {
    const term = `%${normalize(q).replace(/[%_]/g, '')}%`;
    const digits = q.replace(/\D/g, '');
    parts.push(
      or(
        like(sql`lower(${orders.reference})`, term),
        like(sql`lower(${orders.customerName})`, term),
        digits ? like(orders.customerPhone, `%${digits}%`) : undefined,
      ),
    );
  }

  return parts.length ? and(...parts) : undefined;
}

export async function listOrders(f: OrderFilters = {}): Promise<{
  rows: (Order & { itemCount: number })[];
  total: number;
  page: number;
  pages: number;
}> {
  const perPage = Math.min(Math.max(f.perPage ?? 40, 1), 200);
  const page = Math.max(f.page ?? 1, 1);
  const where = orderConditions(f);

  const totalRows = await db.select({ n: sql<number>`count(*)` }).from(orders).where(where);
  const total = Number(totalRows[0]?.n ?? 0);

  const rows = await db
    .select({
      order: orders,
      // Noms de tables écrits en toutes lettres : dans une sous-requête
      // corrélée, le constructeur ne qualifie pas les colonnes et la
      // comparaison se ferait à l'intérieur de la même table.
      itemCount: sql<number>`(
        select coalesce(sum(oi.quantity), 0)
        from order_items oi
        where oi.order_id = orders.id
      )`,
    })
    .from(orders)
    .where(where)
    .orderBy(desc(orders.createdAt))
    .limit(perPage)
    .offset((page - 1) * perPage);

  return {
    rows: rows.map((r) => ({ ...r.order, itemCount: Number(r.itemCount ?? 0) })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function getOrder(
  id: string,
): Promise<(Order & { items: OrderItem[] }) | null> {
  const found = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  const order = found[0];
  if (!order) return null;
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, id))
    .orderBy(asc(orderItems.name));
  return { ...order, items };
}

export async function getOrderByReference(
  reference: string,
): Promise<(Order & { items: OrderItem[] }) | null> {
  const found = await db
    .select()
    .from(orders)
    .where(eq(orders.reference, reference.trim().toUpperCase()))
    .limit(1);
  const order = found[0];
  if (!order) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  return { ...order, items };
}

export async function orderCounts(): Promise<Record<OrderStatus | 'total' | 'ouvertes', number>> {
  const row = raw()
    .prepare(
      `select
         count(*) as n_total,
         sum(case when status = 'nouvelle' then 1 else 0 end) as n_nouvelle,
         sum(case when status = 'confirmee' then 1 else 0 end) as n_confirmee,
         sum(case when status = 'preparee' then 1 else 0 end) as n_preparee,
         sum(case when status = 'expediee' then 1 else 0 end) as n_expediee,
         sum(case when status = 'livree' then 1 else 0 end) as n_livree,
         sum(case when status = 'annulee' then 1 else 0 end) as n_annulee
       from orders`,
    )
    .get() as Record<string, number | null> | undefined;

  const counts = {
    total: Number(row?.n_total ?? 0),
    nouvelle: Number(row?.n_nouvelle ?? 0),
    confirmee: Number(row?.n_confirmee ?? 0),
    preparee: Number(row?.n_preparee ?? 0),
    expediee: Number(row?.n_expediee ?? 0),
    livree: Number(row?.n_livree ?? 0),
    annulee: Number(row?.n_annulee ?? 0),
    ouvertes: 0,
  };
  counts.ouvertes = counts.nouvelle + counts.confirmee + counts.preparee + counts.expediee;
  return counts;
}

/* ---------- Changements d'état ---------- */

/**
 * Change le statut d'une commande.
 * Une annulation remet le stock en place — une seule fois.
 */
export function setOrderStatus(
  id: string,
  status: OrderStatus,
  meta: { userId?: string } = {},
): { ok: true; order: Order } | { ok: false; error: string } {
  return transact(() => {
    const sqlite = raw();
    const order = sqlite.prepare('select * from orders where id = ?').get(id) as
      | (Order & { stock_applied: number })
      | undefined;
    if (!order) return { ok: false as const, error: 'Commande introuvable.' };
    if (order.status === status) return { ok: true as const, order };

    // Colonne brute : « stock_applied », pas « stockApplied ».
    const stockApplied = order.stock_applied === 1;

    const nowSec = Math.floor(Date.now() / 1000);

    // Annulation : on rend le stock.
    if (status === 'annulee' && stockApplied) {
      const items = sqlite
        .prepare(
          'select id, product_id as productId, sku, quantity from order_items where order_id = ?',
        )
        .all(id) as { id: string; productId: string | null; sku: string; quantity: number }[];
      const restore = sqlite.prepare(
        'update products set stock = stock + ?, updated_at = ? where id = ? and track_stock = 1',
      );
      const readStock = sqlite.prepare('select stock, track_stock from products where id = ?');
      const movement = sqlite.prepare(
        `insert into stock_movements (id, product_id, delta, stock_after, reason, order_id, user_id, note, created_at)
         values (?, ?, ?, ?, 'retour', ?, ?, ?, ?)`,
      );

      for (const item of items) {
        if (!item.productId) continue;
        const before = readStock.get(item.productId) as
          | { stock: number; track_stock: number }
          | undefined;
        if (!before || !before.track_stock) continue;
        restore.run(item.quantity, nowSec, item.productId);
        movement.run(
          newId(), item.productId, item.quantity, before.stock + item.quantity,
          id, meta.userId ?? null, `Annulation ${order.reference}`, nowSec,
        );
      }
      sqlite.prepare('update orders set stock_applied = 0 where id = ?').run(id);
    }

    // Réouverture d'une commande annulée : on reprend le stock.
    if (order.status === 'annulee' && status !== 'annulee' && !stockApplied) {
      const items = sqlite
        .prepare(
          'select id, product_id as productId, sku, quantity from order_items where order_id = ?',
        )
        .all(id) as { id: string; productId: string | null; sku: string; quantity: number }[];
      const take = sqlite.prepare(
        'update products set stock = stock - ?, updated_at = ? where id = ? and track_stock = 1',
      );
      const readStock = sqlite.prepare('select stock, track_stock from products where id = ?');
      const movement = sqlite.prepare(
        `insert into stock_movements (id, product_id, delta, stock_after, reason, order_id, user_id, note, created_at)
         values (?, ?, ?, ?, 'vente', ?, ?, ?, ?)`,
      );

      for (const item of items) {
        if (!item.productId) continue;
        const before = readStock.get(item.productId) as
          | { stock: number; track_stock: number }
          | undefined;
        if (!before || !before.track_stock) continue;
        take.run(item.quantity, nowSec, item.productId);
        movement.run(
          newId(), item.productId, -item.quantity, before.stock - item.quantity,
          id, meta.userId ?? null, `Réouverture ${order.reference}`, nowSec,
        );
      }
      sqlite.prepare('update orders set stock_applied = 1 where id = ?').run(id);
    }

    sqlite
      .prepare(
        `update orders set status = ?, updated_at = ?,
           confirmed_at = case when ? in ('confirmee','preparee','expediee','livree') and confirmed_at is null then ? else confirmed_at end,
           delivered_at = case when ? = 'livree' then ? else delivered_at end
         where id = ?`,
      )
      .run(status, nowSec, status, nowSec, status, nowSec, id);

    const updated = sqlite.prepare('select * from orders where id = ?').get(id) as Order;
    return { ok: true as const, order: updated };
  });
}

export async function setPaymentStatus(id: string, paymentStatus: PaymentStatus): Promise<void> {
  await db
    .update(orders)
    .set({ paymentStatus, updatedAt: Math.floor(Date.now() / 1000) })
    .where(eq(orders.id, id));
}

export async function setInternalNote(id: string, note: string): Promise<void> {
  await db
    .update(orders)
    .set({ internalNote: note.slice(0, 2000), updatedAt: Math.floor(Date.now() / 1000) })
    .where(eq(orders.id, id));
}

/* ---------- Export ---------- */

/** Export CSV des commandes, lisible directement dans Excel. */
export async function ordersCsv(f: OrderFilters = {}): Promise<string> {
  const where = orderConditions(f);
  const rows = await db
    .select()
    .from(orders)
    .where(where)
    .orderBy(desc(orders.createdAt))
    .limit(10000);

  const header = [
    'Référence', 'Date', 'Statut', 'Paiement', 'Mode de paiement',
    'Client', 'Téléphone', 'Ville', 'Quartier', 'Mode', 'Adresse',
    'Sous-total', 'Livraison', 'Remise', 'Total', 'Canal',
  ];

  const escape = (value: unknown): string => {
    const s = value === null || value === undefined ? '' : String(value);
    return s.includes(';') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const lines = [header.join(';')];
  for (const o of rows) {
    lines.push(
      [
        o.reference,
        new Date(o.createdAt * 1000).toISOString().slice(0, 16).replace('T', ' '),
        STATUS_LABEL[o.status],
        PAYMENT_LABEL[o.paymentStatus],
        PAYMENT_METHOD_LABEL[o.paymentMethod] ?? o.paymentMethod,
        o.customerName,
        o.customerPhone,
        o.city, o.quarter,
        o.deliveryMode === 'livraison' ? 'Livraison' : 'Retrait',
        o.address,
        o.subtotal, o.deliveryFee, o.discount, o.total,
        o.channel,
      ].map(escape).join(';'),
    );
  }

  return `﻿${lines.join('\r\n')}\r\n`;
}

export async function listCustomers(search = '', limit = 100) {
  const term = `%${normalize(search).replace(/[%_]/g, '')}%`;
  const digits = search.replace(/\D/g, '');
  const where = search.trim()
    ? or(
        like(sql`lower(${customers.name})`, term),
        digits ? like(customers.phone, `%${digits}%`) : undefined,
      )
    : undefined;

  return db
    .select()
    .from(customers)
    .where(where)
    .orderBy(desc(customers.lastOrderAt))
    .limit(limit);
}
