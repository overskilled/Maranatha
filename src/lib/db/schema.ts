/* ============================================================
   Maranatha Le Juste Prix — schéma de la base
   SQLite via Drizzle. Les montants sont des entiers en francs
   CFA (XAF n'a pas de sous-unité en pratique).
   ============================================================ */

import { sql, relations } from 'drizzle-orm';
import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

const now = sql`(unixepoch())`;

/* ---------- Comptes et sessions ---------- */

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    passwordHash: text('password_hash').notNull(),
    role: text('role', { enum: ['owner', 'staff'] })
      .notNull()
      .default('staff'),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    mustChangePassword: integer('must_change_password', { mode: 'boolean' })
      .notNull()
      .default(false),
    createdAt: integer('created_at').notNull().default(now),
    lastLoginAt: integer('last_login_at'),
  },
  (t) => [uniqueIndex('users_email_idx').on(t.email)],
);

export const sessions = sqliteTable(
  'sessions',
  {
    // On stocke le hash du jeton, jamais le jeton lui-même.
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: integer('expires_at').notNull(),
    createdAt: integer('created_at').notNull().default(now),
    userAgent: text('user_agent'),
    ip: text('ip'),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
);

export const loginAttempts = sqliteTable(
  'login_attempts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    identifier: text('identifier').notNull(),
    success: integer('success', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at').notNull().default(now),
  },
  (t) => [index('login_attempts_idx').on(t.identifier, t.createdAt)],
);

/* ---------- Catalogue ---------- */

export const categories = sqliteTable(
  'categories',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    // Rattachement à l'une des six activités de la maison.
    division: text('division'),
    parentId: text('parent_id'),
    position: integer('position').notNull().default(0),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at').notNull().default(now),
  },
  (t) => [
    uniqueIndex('categories_slug_idx').on(t.slug),
    index('categories_parent_idx').on(t.parentId),
  ],
);

export const products = sqliteTable(
  'products',
  {
    id: text('id').primaryKey(),
    /** Référence interne, clé de rapprochement des imports et des photos. */
    sku: text('sku').notNull(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    categoryId: text('category_id').references(() => categories.id, {
      onDelete: 'set null',
    }),
    division: text('division'),

    price: integer('price').notNull().default(0),
    /** Prix barré, uniquement s'il a réellement été pratiqué. */
    comparePrice: integer('compare_price'),
    /** Coût d'achat — sert à la marge, jamais affiché au public. */
    cost: integer('cost'),

    unit: text('unit').notNull().default('pièce'),
    /** Quantité minimale de commande (vente en gros). */
    minQuantity: integer('min_quantity').notNull().default(1),

    trackStock: integer('track_stock', { mode: 'boolean' })
      .notNull()
      .default(true),
    stock: integer('stock').notNull().default(0),
    lowStockThreshold: integer('low_stock_threshold').notNull().default(5),

    status: text('status', { enum: ['draft', 'published', 'archived'] })
      .notNull()
      .default('draft'),
    featured: integer('featured', { mode: 'boolean' }).notNull().default(false),

    brand: text('brand'),
    origin: text('origin'),
    barcode: text('barcode'),
    weightGrams: integer('weight_grams'),
    tags: text('tags', { mode: 'json' }).$type<string[]>(),

    position: integer('position').notNull().default(0),
    /** Nom + sku + marque + tags, en minuscules sans accents, pour la recherche. */
    searchText: text('search_text').notNull().default(''),

    createdAt: integer('created_at').notNull().default(now),
    updatedAt: integer('updated_at').notNull().default(now),
    publishedAt: integer('published_at'),
  },
  (t) => [
    uniqueIndex('products_sku_idx').on(t.sku),
    uniqueIndex('products_slug_idx').on(t.slug),
    index('products_status_idx').on(t.status),
    index('products_category_idx').on(t.categoryId),
    index('products_division_idx').on(t.division),
    index('products_search_idx').on(t.searchText),
    index('products_updated_idx').on(t.updatedAt),
  ],
);

export const productImages = sqliteTable(
  'product_images',
  {
    id: text('id').primaryKey(),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    /** Nom de base du fichier, sans largeur ni extension. */
    filename: text('filename').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    /** Largeurs générées, pour construire le srcset. */
    widths: text('widths', { mode: 'json' }).$type<number[]>().notNull(),
    /** Micro-aperçu en base64 affiché pendant le chargement. */
    placeholder: text('placeholder'),
    alt: text('alt'),
    position: integer('position').notNull().default(0),
    createdAt: integer('created_at').notNull().default(now),
  },
  (t) => [index('product_images_product_idx').on(t.productId, t.position)],
);

/* ---------- Clients et commandes ---------- */

export const customers = sqliteTable(
  'customers',
  {
    id: text('id').primaryKey(),
    /** Le téléphone est l'identité réelle du client ici. */
    phone: text('phone').notNull(),
    name: text('name').notNull(),
    email: text('email'),
    city: text('city'),
    quarter: text('quarter'),
    note: text('note'),
    ordersCount: integer('orders_count').notNull().default(0),
    totalSpent: integer('total_spent').notNull().default(0),
    createdAt: integer('created_at').notNull().default(now),
    lastOrderAt: integer('last_order_at'),
  },
  (t) => [uniqueIndex('customers_phone_idx').on(t.phone)],
);

export const orders = sqliteTable(
  'orders',
  {
    id: text('id').primaryKey(),
    /** Référence lisible donnée au client : CMD-2026-0001. */
    reference: text('reference').notNull(),

    status: text('status', {
      enum: ['nouvelle', 'confirmee', 'preparee', 'expediee', 'livree', 'annulee'],
    })
      .notNull()
      .default('nouvelle'),
    paymentStatus: text('payment_status', {
      enum: ['en_attente', 'paye', 'echoue', 'rembourse'],
    })
      .notNull()
      .default('en_attente'),
    paymentMethod: text('payment_method').notNull().default('livraison'),

    customerId: text('customer_id').references(() => customers.id, {
      onDelete: 'set null',
    }),
    customerName: text('customer_name').notNull(),
    customerPhone: text('customer_phone').notNull(),
    customerEmail: text('customer_email'),

    deliveryMode: text('delivery_mode', { enum: ['livraison', 'retrait'] })
      .notNull()
      .default('livraison'),
    address: text('address'),
    city: text('city'),
    quarter: text('quarter'),
    note: text('note'),
    /** Note interne, invisible du client. */
    internalNote: text('internal_note'),

    subtotal: integer('subtotal').notNull().default(0),
    deliveryFee: integer('delivery_fee').notNull().default(0),
    discount: integer('discount').notNull().default(0),
    total: integer('total').notNull().default(0),

    /** D'où vient la commande : le site, WhatsApp, la boutique, le téléphone. */
    channel: text('channel', {
      enum: ['web', 'whatsapp', 'boutique', 'telephone'],
    })
      .notNull()
      .default('web'),

    providerRef: text('provider_ref'),
    providerPayload: text('provider_payload', { mode: 'json' }),
    /** Vrai une fois le stock décrémenté, pour ne jamais le faire deux fois. */
    stockApplied: integer('stock_applied', { mode: 'boolean' })
      .notNull()
      .default(false),

    createdAt: integer('created_at').notNull().default(now),
    updatedAt: integer('updated_at').notNull().default(now),
    confirmedAt: integer('confirmed_at'),
    deliveredAt: integer('delivered_at'),
  },
  (t) => [
    uniqueIndex('orders_reference_idx').on(t.reference),
    index('orders_status_idx').on(t.status),
    index('orders_created_idx').on(t.createdAt),
    index('orders_customer_idx').on(t.customerId),
  ],
);

export const orderItems = sqliteTable(
  'order_items',
  {
    id: text('id').primaryKey(),
    orderId: text('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    /** Le produit peut disparaître ; la ligne de commande reste intacte. */
    productId: text('product_id').references(() => products.id, {
      onDelete: 'set null',
    }),
    sku: text('sku').notNull(),
    name: text('name').notNull(),
    unit: text('unit').notNull().default('pièce'),
    unitPrice: integer('unit_price').notNull(),
    quantity: integer('quantity').notNull(),
    lineTotal: integer('line_total').notNull(),
  },
  (t) => [
    index('order_items_order_idx').on(t.orderId),
    index('order_items_product_idx').on(t.productId),
  ],
);

export const stockMovements = sqliteTable(
  'stock_movements',
  {
    id: text('id').primaryKey(),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    delta: integer('delta').notNull(),
    stockAfter: integer('stock_after').notNull(),
    reason: text('reason', {
      enum: ['vente', 'import', 'ajustement', 'retour', 'perte', 'reception'],
    }).notNull(),
    orderId: text('order_id'),
    userId: text('user_id'),
    note: text('note'),
    createdAt: integer('created_at').notNull().default(now),
  },
  (t) => [
    index('stock_movements_product_idx').on(t.productId, t.createdAt),
    index('stock_movements_created_idx').on(t.createdAt),
  ],
);

/* ---------- Publication en lot ---------- */

export const importJobs = sqliteTable(
  'import_jobs',
  {
    id: text('id').primaryKey(),
    filename: text('filename').notNull(),
    /** Fichier déposé sur disque, le temps de l'import. */
    storedPath: text('stored_path'),
    status: text('status', {
      enum: ['analyse', 'pret', 'en_cours', 'termine', 'echoue', 'annule'],
    })
      .notNull()
      .default('analyse'),

    /** En-têtes détectés et correspondance colonne → champ produit. */
    headers: text('headers', { mode: 'json' }).$type<string[]>(),
    mapping: text('mapping', { mode: 'json' }).$type<Record<string, string>>(),
    options: text('options', { mode: 'json' }).$type<Record<string, unknown>>(),

    totalRows: integer('total_rows').notNull().default(0),
    processedRows: integer('processed_rows').notNull().default(0),
    createdCount: integer('created_count').notNull().default(0),
    updatedCount: integer('updated_count').notNull().default(0),
    skippedCount: integer('skipped_count').notNull().default(0),
    errorCount: integer('error_count').notNull().default(0),

    /** Erreurs ligne à ligne, pour le rapport téléchargeable. */
    errors: text('errors', { mode: 'json' }).$type<
      { row: number; sku?: string; messages: string[] }[]
    >(),
    message: text('message'),

    createdBy: text('created_by'),
    createdAt: integer('created_at').notNull().default(now),
    startedAt: integer('started_at'),
    finishedAt: integer('finished_at'),
  },
  (t) => [index('import_jobs_created_idx').on(t.createdAt)],
);

/** Les fournisseurs renvoient le même format chaque mois : on s'en souvient. */
export const importProfiles = sqliteTable(
  'import_profiles',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    mapping: text('mapping', { mode: 'json' })
      .$type<Record<string, string>>()
      .notNull(),
    options: text('options', { mode: 'json' }).$type<Record<string, unknown>>(),
    usedCount: integer('used_count').notNull().default(0),
    createdAt: integer('created_at').notNull().default(now),
    lastUsedAt: integer('last_used_at'),
  },
  (t) => [uniqueIndex('import_profiles_name_idx').on(t.name)],
);

/* ---------- Réglages ---------- */

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }),
  updatedAt: integer('updated_at').notNull().default(now),
});

/* ---------- Relations ---------- */

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  images: many(productImages),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  items: many(orderItems),
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

/* ---------- Types ---------- */

export type User = typeof users.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductImage = typeof productImages.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type StockMovement = typeof stockMovements.$inferSelect;
export type ImportJob = typeof importJobs.$inferSelect;
export type ImportProfile = typeof importProfiles.$inferSelect;

export type OrderStatus = Order['status'];
export type PaymentStatus = Order['paymentStatus'];
export type ProductStatus = Product['status'];
