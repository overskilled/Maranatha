/* ============================================================
   Accès au catalogue.
   Toutes les opérations en lot passent par ici : elles tournent
   dans une seule transaction, ce qui rend une modification de
   3 000 articles aussi rapide qu'une seule.
   ============================================================ */

import {
  and, or, eq, ne, like, desc, asc, sql, inArray, lte, gt, isNull, count,
} from 'drizzle-orm';
import { db, transact, raw } from '../db';
import {
  products, productImages, categories, stockMovements,
  type Product, type ProductStatus,
} from '../db/schema';
import { newId } from '../ids';
import { slugify, searchTextFor, normalize, skuify, parseTags } from '../text';

/* ---------- Filtres ---------- */

export type StockFilter = 'all' | 'in' | 'low' | 'out';
export type ProductSort =
  | 'recent' | 'oldest' | 'name' | 'name-desc'
  | 'price' | 'price-desc' | 'stock' | 'stock-desc';

export type ProductFilters = {
  search?: string;
  status?: ProductStatus | 'all';
  categoryId?: string;
  division?: string;
  stock?: StockFilter;
  noImage?: boolean;
  noPrice?: boolean;
  sort?: ProductSort;
  page?: number;
  perPage?: number;
};

function conditions(f: ProductFilters) {
  const parts = [];

  if (f.status && f.status !== 'all') parts.push(eq(products.status, f.status));
  if (f.categoryId) parts.push(eq(products.categoryId, f.categoryId));
  if (f.division) parts.push(eq(products.division, f.division));

  const q = normalize(f.search ?? '');
  if (q) {
    // Chaque mot doit apparaître : « riz 25 » trouve « Riz parfumé 25 kg ».
    for (const word of q.split(/\s+/).filter(Boolean).slice(0, 6)) {
      const term = `%${word.replace(/[%_]/g, '')}%`;
      parts.push(
        or(like(products.searchText, term), like(sql`lower(${products.sku})`, term)),
      );
    }
  }

  if (f.stock === 'out') {
    parts.push(and(eq(products.trackStock, true), lte(products.stock, 0)));
  } else if (f.stock === 'low') {
    parts.push(
      and(
        eq(products.trackStock, true),
        gt(products.stock, 0),
        sql`${products.stock} <= ${products.lowStockThreshold}`,
      ),
    );
  } else if (f.stock === 'in') {
    parts.push(or(eq(products.trackStock, false), gt(products.stock, 0)));
  }

  if (f.noPrice) parts.push(lte(products.price, 0));

  if (f.noImage) {
    // Idem : la sous-requête corrélée doit nommer ses tables elle-même.
    parts.push(
      sql`not exists (select 1 from product_images pi where pi.product_id = products.id)`,
    );
  }

  return parts.length ? and(...parts) : undefined;
}

function ordering(sort: ProductSort = 'recent') {
  switch (sort) {
    case 'oldest': return [asc(products.updatedAt)];
    case 'name': return [asc(products.name)];
    case 'name-desc': return [desc(products.name)];
    case 'price': return [asc(products.price)];
    case 'price-desc': return [desc(products.price)];
    case 'stock': return [asc(products.stock)];
    case 'stock-desc': return [desc(products.stock)];
    default: return [desc(products.updatedAt)];
  }
}

/* ---------- Lecture ---------- */

export type ProductRow = Product & {
  categoryName: string | null;
  imageFilename: string | null;
  imageWidths: number[] | null;
  imagePlaceholder: string | null;
  imageCount: number;
};

export async function listProducts(f: ProductFilters = {}): Promise<{
  rows: ProductRow[];
  total: number;
  page: number;
  perPage: number;
  pages: number;
}> {
  const perPage = Math.min(Math.max(f.perPage ?? 50, 1), 500);
  const page = Math.max(f.page ?? 1, 1);
  const where = conditions(f);

  const totalRows = await db
    .select({ n: sql<number>`count(*)` })
    .from(products)
    .where(where);
  const total = Number(totalRows[0]?.n ?? 0);

  const rows = await db
    .select({ product: products, categoryName: categories.name })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(where)
    .orderBy(...ordering(f.sort))
    .limit(perPage)
    .offset((page - 1) * perPage);

  // Les photos de la page en une requête, puis on garde la première
  // de chaque produit — celle dont la position est la plus basse.
  const ids = rows.map((r) => r.product.id);
  const covers = new Map<
    string,
    { filename: string; widths: number[]; placeholder: string | null; count: number }
  >();

  if (ids.length) {
    const imageRows = await db
      .select({
        productId: productImages.productId,
        filename: productImages.filename,
        widths: productImages.widths,
        placeholder: productImages.placeholder,
        position: productImages.position,
        createdAt: productImages.createdAt,
      })
      .from(productImages)
      .where(inArray(productImages.productId, ids))
      .orderBy(asc(productImages.position), asc(productImages.createdAt));

    for (const image of imageRows) {
      const seen = covers.get(image.productId);
      if (seen) {
        seen.count += 1;
        continue;
      }
      covers.set(image.productId, {
        filename: image.filename,
        widths: safeJson<number[]>(image.widths) ?? [400],
        placeholder: image.placeholder,
        count: 1,
      });
    }
  }

  return {
    rows: rows.map((r) => {
      const cover = covers.get(r.product.id);
      return {
        ...r.product,
        categoryName: r.categoryName ?? null,
        imageFilename: cover?.filename ?? null,
        imageWidths: cover?.widths ?? null,
        imagePlaceholder: cover?.placeholder ?? null,
        imageCount: cover?.count ?? 0,
      };
    }),
    total,
    page,
    perPage,
    pages: Math.max(1, Math.ceil(total / perPage)),
  };
}

function safeJson<T>(value: unknown): T | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/** Identifiants correspondant au filtre — pour « tout sélectionner ». */
export async function productIdsMatching(f: ProductFilters): Promise<string[]> {
  const rows = await db
    .select({ id: products.id })
    .from(products)
    .where(conditions(f))
    .limit(20000);
  return rows.map((r) => r.id);
}

/** Compteurs affichés sur les onglets de filtre. */
export async function productCounts(): Promise<{
  total: number; draft: number; published: number; archived: number;
  out: number; low: number; noImage: number; noPrice: number;
}> {
  const row = raw()
    .prepare(
      `select
         count(*) as n_total,
         sum(case when status = 'draft' then 1 else 0 end) as n_draft,
         sum(case when status = 'published' then 1 else 0 end) as n_published,
         sum(case when status = 'archived' then 1 else 0 end) as n_archived,
         sum(case when track_stock = 1 and stock <= 0 then 1 else 0 end) as n_out,
         sum(case when track_stock = 1 and stock > 0 and stock <= low_stock_threshold then 1 else 0 end) as n_low,
         sum(case when not exists (
           select 1 from product_images pi where pi.product_id = products.id
         ) then 1 else 0 end) as n_no_image,
         sum(case when price <= 0 then 1 else 0 end) as n_no_price
       from products`,
    )
    .get() as Record<string, number | null> | undefined;

  return {
    total: Number(row?.n_total ?? 0),
    draft: Number(row?.n_draft ?? 0),
    published: Number(row?.n_published ?? 0),
    archived: Number(row?.n_archived ?? 0),
    out: Number(row?.n_out ?? 0),
    low: Number(row?.n_low ?? 0),
    noImage: Number(row?.n_no_image ?? 0),
    noPrice: Number(row?.n_no_price ?? 0),
  };
}

export type ProductWithImages = Product & {
  images: { id: string; filename: string; widths: number[]; placeholder: string | null; alt: string | null; position: number }[];
  categoryName: string | null;
};

export async function getProduct(id: string): Promise<ProductWithImages | null> {
  const found = await db.select().from(products).where(eq(products.id, id)).limit(1);
  const product = found[0];
  if (!product) return null;
  return withImages(product);
}

export async function getProductBySlug(slug: string): Promise<ProductWithImages | null> {
  const found = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  const product = found[0];
  if (!product) return null;
  return withImages(product);
}

export async function getProductBySku(sku: string): Promise<Product | null> {
  const found = await db
    .select()
    .from(products)
    .where(eq(products.sku, skuify(sku)))
    .limit(1);
  return found[0] ?? null;
}

async function withImages(product: Product): Promise<ProductWithImages> {
  const images = await db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, product.id))
    .orderBy(asc(productImages.position), asc(productImages.createdAt));

  const category = product.categoryId
    ? await db
        .select({ name: categories.name })
        .from(categories)
        .where(eq(categories.id, product.categoryId))
        .limit(1)
    : [];

  return {
    ...product,
    categoryName: category[0]?.name ?? null,
    images: images.map((i) => ({
      id: i.id,
      filename: i.filename,
      widths: safeJson<number[]>(i.widths) ?? [400],
      placeholder: i.placeholder,
      alt: i.alt,
      position: i.position,
    })),
  };
}

/* ---------- Écriture ---------- */

export type ProductInput = {
  sku?: string;
  name: string;
  description?: string | null;
  categoryId?: string | null;
  division?: string | null;
  price?: number;
  comparePrice?: number | null;
  cost?: number | null;
  unit?: string;
  minQuantity?: number;
  trackStock?: boolean;
  stock?: number;
  lowStockThreshold?: number;
  status?: ProductStatus;
  featured?: boolean;
  brand?: string | null;
  origin?: string | null;
  barcode?: string | null;
  weightGrams?: number | null;
  tags?: string[] | string | null;
};

/** Trouve un slug libre : « riz-25kg », puis « riz-25kg-2 ». */
function uniqueSlug(base: string, exceptId?: string): string {
  const sqlite = raw();
  const root = slugify(base);
  let candidate = root;
  let n = 1;

  const stmt = sqlite.prepare(
    'select id from products where slug = ? and (? is null or id != ?) limit 1',
  );
  while (stmt.get(candidate, exceptId ?? null, exceptId ?? null)) {
    n += 1;
    candidate = `${root}-${n}`;
    if (n > 500) {
      candidate = `${root}-${newId().slice(-6)}`;
      break;
    }
  }
  return candidate;
}

/** Trouve une référence libre quand le fichier importé n'en donne pas. */
function uniqueSku(base: string, exceptId?: string): string {
  const sqlite = raw();
  const root = skuify(base) || 'ARTICLE';
  let candidate = root;
  let n = 1;

  const stmt = sqlite.prepare(
    'select id from products where sku = ? and (? is null or id != ?) limit 1',
  );
  while (stmt.get(candidate, exceptId ?? null, exceptId ?? null)) {
    n += 1;
    candidate = `${root}-${n}`;
    if (n > 500) {
      candidate = `${root}-${newId().slice(-6)}`;
      break;
    }
  }
  return candidate;
}

function searchFor(input: {
  name: string; sku: string; brand?: string | null;
  tags?: string[] | null; description?: string | null;
}): string {
  return searchTextFor([
    input.name,
    input.sku,
    input.brand,
    ...(input.tags ?? []),
    (input.description ?? '').slice(0, 200),
  ]);
}

export function createProduct(input: ProductInput): Product {
  return transact(() => {
    const sqlite = raw();
    const id = newId();
    const sku = uniqueSku(input.sku || input.name);
    const slug = uniqueSlug(input.name || sku);
    const tags = parseTags(input.tags);
    const nowSec = Math.floor(Date.now() / 1000);
    const status = input.status ?? 'draft';

    sqlite
      .prepare(
        `insert into products (
          id, sku, slug, name, description, category_id, division,
          price, compare_price, cost, unit, min_quantity,
          track_stock, stock, low_stock_threshold,
          status, featured, brand, origin, barcode, weight_grams, tags,
          position, search_text, created_at, updated_at, published_at
        ) values (
          @id, @sku, @slug, @name, @description, @category_id, @division,
          @price, @compare_price, @cost, @unit, @min_quantity,
          @track_stock, @stock, @low_stock_threshold,
          @status, @featured, @brand, @origin, @barcode, @weight_grams, @tags,
          @position, @search_text, @created_at, @updated_at, @published_at
        )`,
      )
      .run({
        id,
        sku,
        slug,
        name: input.name.trim(),
        description: input.description ?? null,
        category_id: input.categoryId ?? null,
        division: input.division ?? null,
        price: Math.max(0, Math.round(input.price ?? 0)),
        compare_price: input.comparePrice ?? null,
        cost: input.cost ?? null,
        unit: input.unit || 'pièce',
        min_quantity: Math.max(1, input.minQuantity ?? 1),
        track_stock: input.trackStock === false ? 0 : 1,
        stock: Math.round(input.stock ?? 0),
        low_stock_threshold: Math.max(0, input.lowStockThreshold ?? 5),
        status,
        featured: input.featured ? 1 : 0,
        brand: input.brand ?? null,
        origin: input.origin ?? null,
        barcode: input.barcode ?? null,
        weight_grams: input.weightGrams ?? null,
        tags: JSON.stringify(tags),
        position: 0,
        search_text: searchFor({ name: input.name, sku, brand: input.brand, tags, description: input.description }),
        created_at: nowSec,
        updated_at: nowSec,
        published_at: status === 'published' ? nowSec : null,
      });

    if ((input.stock ?? 0) !== 0) {
      recordMovement(id, Math.round(input.stock ?? 0), Math.round(input.stock ?? 0), 'reception', { note: 'Stock initial' });
    }

    return sqlite.prepare('select * from products where id = ?').get(id) as Product;
  });
}

export async function updateProduct(
  id: string,
  input: Partial<ProductInput> & { slug?: string },
): Promise<Product | null> {
  const existing = await db.select().from(products).where(eq(products.id, id)).limit(1);
  const before = existing[0];
  if (!before) return null;

  return transact(() => {
    const sqlite = raw();
    const name = input.name?.trim() ?? before.name;
    const sku = input.sku !== undefined ? uniqueSku(input.sku, id) : before.sku;
    const slug = input.slug !== undefined
      ? uniqueSlug(input.slug, id)
      : input.name !== undefined && slugify(before.name) === before.slug
        ? uniqueSlug(name, id)
        : before.slug;

    const tags = input.tags !== undefined ? parseTags(input.tags) : (safeJson<string[]>(before.tags) ?? []);
    const status = input.status ?? before.status;
    const nowSec = Math.floor(Date.now() / 1000);
    const brand = input.brand !== undefined ? input.brand : before.brand;
    const description = input.description !== undefined ? input.description : before.description;

    const nextStock = input.stock !== undefined ? Math.round(input.stock) : before.stock;

    sqlite
      .prepare(
        `update products set
          sku = @sku, slug = @slug, name = @name, description = @description,
          category_id = @category_id, division = @division,
          price = @price, compare_price = @compare_price, cost = @cost,
          unit = @unit, min_quantity = @min_quantity,
          track_stock = @track_stock, stock = @stock,
          low_stock_threshold = @low_stock_threshold,
          status = @status, featured = @featured,
          brand = @brand, origin = @origin, barcode = @barcode,
          weight_grams = @weight_grams, tags = @tags,
          search_text = @search_text, updated_at = @updated_at,
          published_at = @published_at
        where id = @id`,
      )
      .run({
        id,
        sku,
        slug,
        name,
        description,
        category_id: input.categoryId !== undefined ? input.categoryId : before.categoryId,
        division: input.division !== undefined ? input.division : before.division,
        price: input.price !== undefined ? Math.max(0, Math.round(input.price)) : before.price,
        compare_price: input.comparePrice !== undefined ? input.comparePrice : before.comparePrice,
        cost: input.cost !== undefined ? input.cost : before.cost,
        unit: input.unit ?? before.unit,
        min_quantity: input.minQuantity !== undefined ? Math.max(1, input.minQuantity) : before.minQuantity,
        track_stock: (input.trackStock !== undefined ? input.trackStock : before.trackStock) ? 1 : 0,
        stock: nextStock,
        low_stock_threshold: input.lowStockThreshold !== undefined
          ? Math.max(0, input.lowStockThreshold)
          : before.lowStockThreshold,
        status,
        featured: (input.featured !== undefined ? input.featured : before.featured) ? 1 : 0,
        brand,
        origin: input.origin !== undefined ? input.origin : before.origin,
        barcode: input.barcode !== undefined ? input.barcode : before.barcode,
        weight_grams: input.weightGrams !== undefined ? input.weightGrams : before.weightGrams,
        tags: JSON.stringify(tags),
        search_text: searchFor({ name, sku, brand, tags, description }),
        updated_at: nowSec,
        published_at: status === 'published' ? (before.publishedAt ?? nowSec) : before.publishedAt,
      });

    if (input.stock !== undefined && nextStock !== before.stock) {
      recordMovement(id, nextStock - before.stock, nextStock, 'ajustement', {
        note: 'Modification de la fiche',
      });
    }

    return sqlite.prepare('select * from products where id = ?').get(id) as Product;
  });
}

/** Duplique une fiche : base de travail pour une variante. */
export async function duplicateProduct(id: string): Promise<Product | null> {
  const source = await getProduct(id);
  if (!source) return null;

  return createProduct({
    sku: `${source.sku}-COPIE`,
    name: `${source.name} (copie)`,
    description: source.description,
    categoryId: source.categoryId,
    division: source.division,
    price: source.price,
    comparePrice: source.comparePrice,
    cost: source.cost,
    unit: source.unit,
    minQuantity: source.minQuantity,
    trackStock: source.trackStock,
    stock: 0,
    lowStockThreshold: source.lowStockThreshold,
    status: 'draft',
    brand: source.brand,
    origin: source.origin,
    weightGrams: source.weightGrams,
    tags: safeJson<string[]>(source.tags) ?? [],
  });
}

/* ---------- Opérations en lot ---------- */

/** Découpe en paquets : SQLite limite le nombre de paramètres liés. */
function chunks<T>(items: T[], size = 400): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export function bulkSetStatus(ids: string[], status: ProductStatus): number {
  if (!ids.length) return 0;
  return transact(() => {
    const sqlite = raw();
    const nowSec = Math.floor(Date.now() / 1000);
    let touched = 0;
    for (const group of chunks(ids)) {
      const marks = group.map(() => '?').join(',');
      const result = sqlite
        .prepare(
          `update products set status = ?, updated_at = ?,
             published_at = case when ? = 'published' and published_at is null then ? else published_at end
           where id in (${marks})`,
        )
        .run(status, nowSec, status, nowSec, ...group);
      touched += result.changes;
    }
    return touched;
  });
}

export function bulkSetCategory(ids: string[], categoryId: string | null, division: string | null): number {
  if (!ids.length) return 0;
  return transact(() => {
    const sqlite = raw();
    const nowSec = Math.floor(Date.now() / 1000);
    let touched = 0;
    for (const group of chunks(ids)) {
      const marks = group.map(() => '?').join(',');
      touched += sqlite
        .prepare(
          `update products set category_id = ?, division = ?, updated_at = ? where id in (${marks})`,
        )
        .run(categoryId, division, nowSec, ...group).changes;
    }
    return touched;
  });
}

export type PriceChange =
  | { mode: 'percent'; value: number }
  | { mode: 'amount'; value: number }
  | { mode: 'set'; value: number }
  | { mode: 'round'; value: number };

/**
 * Change les prix d'une sélection. « Le juste prix » reste la règle :
 * on arrondit toujours au franc, jamais vers le haut en silence.
 */
export function bulkAdjustPrice(ids: string[], change: PriceChange): number {
  if (!ids.length) return 0;
  return transact(() => {
    const sqlite = raw();
    const nowSec = Math.floor(Date.now() / 1000);
    let touched = 0;

    const expression =
      change.mode === 'percent'
        ? `max(0, cast(round(price * (1 + (? / 100.0))) as integer))`
        : change.mode === 'amount'
          ? `max(0, price + ?)`
          : change.mode === 'set'
            ? `max(0, ?)`
            // Arrondi au multiple le plus proche : 12 480 → 12 500.
            : `max(0, cast(round(price / (? * 1.0)) * ? as integer))`;

    for (const group of chunks(ids)) {
      const marks = group.map(() => '?').join(',');
      const args: unknown[] =
        change.mode === 'round'
          ? [change.value, change.value, nowSec, ...group]
          : [change.value, nowSec, ...group];
      touched += sqlite
        .prepare(`update products set price = ${expression}, updated_at = ? where id in (${marks})`)
        .run(...(args as never[])).changes;
    }
    return touched;
  });
}

export type StockChange =
  | { mode: 'set'; value: number }
  | { mode: 'adjust'; value: number };

export function bulkSetStock(
  ids: string[],
  change: StockChange,
  meta: { userId?: string; note?: string } = {},
): number {
  if (!ids.length) return 0;
  return transact(() => {
    const sqlite = raw();
    const nowSec = Math.floor(Date.now() / 1000);
    let touched = 0;

    for (const group of chunks(ids)) {
      const marks = group.map(() => '?').join(',');
      const before = sqlite
        .prepare(`select id, stock from products where id in (${marks})`)
        .all(...group) as { id: string; stock: number }[];

      sqlite
        .prepare(
          change.mode === 'set'
            ? `update products set stock = ?, updated_at = ? where id in (${marks})`
            : `update products set stock = stock + ?, updated_at = ? where id in (${marks})`,
        )
        .run(change.value, nowSec, ...group);

      for (const row of before) {
        const after = change.mode === 'set' ? change.value : row.stock + change.value;
        if (after !== row.stock) {
          recordMovement(row.id, after - row.stock, after, 'ajustement', {
            userId: meta.userId,
            note: meta.note ?? 'Modification en lot',
          });
        }
      }
      touched += before.length;
    }
    return touched;
  });
}

export async function deleteProducts(ids: string[]): Promise<{
  deleted: number;
  images: { filename: string; widths: number[] }[];
}> {
  if (!ids.length) return { deleted: 0, images: [] };

  // Les fichiers sont supprimés par l'appelant, après la transaction.
  const images: { filename: string; widths: number[] }[] = [];
  for (const group of chunks(ids)) {
    const rows = await db
      .select({ filename: productImages.filename, widths: productImages.widths })
      .from(productImages)
      .where(inArray(productImages.productId, group));
    for (const row of rows) {
      images.push({ filename: row.filename, widths: safeJson<number[]>(row.widths) ?? [400, 800, 1600] });
    }
  }

  const deleted = transact(() => {
    const sqlite = raw();
    let n = 0;
    for (const group of chunks(ids)) {
      const marks = group.map(() => '?').join(',');
      n += sqlite.prepare(`delete from products where id in (${marks})`).run(...group).changes;
    }
    return n;
  });

  return { deleted, images };
}

/* ---------- Stock ---------- */

/** À appeler dans une transaction déjà ouverte. */
export function recordMovement(
  productId: string,
  delta: number,
  stockAfter: number,
  reason: 'vente' | 'import' | 'ajustement' | 'retour' | 'perte' | 'reception',
  meta: { orderId?: string; userId?: string; note?: string } = {},
): void {
  raw()
    .prepare(
      `insert into stock_movements (id, product_id, delta, stock_after, reason, order_id, user_id, note, created_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      newId(), productId, delta, stockAfter, reason,
      meta.orderId ?? null, meta.userId ?? null, meta.note ?? null,
      Math.floor(Date.now() / 1000),
    );
}

export async function stockHistory(productId: string, limit = 50) {
  return db
    .select()
    .from(stockMovements)
    .where(eq(stockMovements.productId, productId))
    .orderBy(desc(stockMovements.createdAt))
    .limit(limit);
}

export async function lowStockProducts(limit = 20): Promise<Product[]> {
  return db
    .select()
    .from(products)
    .where(
      and(
        eq(products.trackStock, true),
        ne(products.status, 'archived'),
        sql`${products.stock} <= ${products.lowStockThreshold}`,
      ),
    )
    .orderBy(asc(products.stock))
    .limit(limit);
}

/* ---------- Catégories ---------- */

export async function listCategories(): Promise<
  (typeof categories.$inferSelect & { productCount: number })[]
> {
  const rows = await db
    .select({
      category: categories,
      n: sql<number>`count(${products.id})`,
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.position), asc(categories.name));

  return rows.map((r) => ({ ...r.category, productCount: Number(r.n ?? 0) }));
}

export async function createCategory(input: {
  name: string;
  description?: string | null;
  division?: string | null;
  parentId?: string | null;
}): Promise<typeof categories.$inferSelect> {
  const id = newId();
  const sqlite = raw();
  const root = slugify(input.name);
  let slug = root;
  let n = 1;
  while (sqlite.prepare('select id from categories where slug = ?').get(slug)) {
    n += 1;
    slug = `${root}-${n}`;
  }

  await db.insert(categories).values({
    id,
    slug,
    name: input.name.trim(),
    description: input.description ?? null,
    division: input.division ?? null,
    parentId: input.parentId ?? null,
  });

  const found = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return found[0];
}

/** Trouve une catégorie par nom, ou la crée. Utilisé par l'import. */
export function findOrCreateCategory(name: string, division?: string | null): string | null {
  const clean = name.trim();
  if (!clean) return null;

  const sqlite = raw();
  const slug = slugify(clean);

  const existing = sqlite
    .prepare('select id from categories where slug = ? or lower(name) = ? limit 1')
    .get(slug, normalize(clean)) as { id: string } | undefined;
  if (existing) return existing.id;

  const id = newId();
  let candidate = slug;
  let n = 1;
  while (sqlite.prepare('select id from categories where slug = ?').get(candidate)) {
    n += 1;
    candidate = `${slug}-${n}`;
  }

  sqlite
    .prepare(
      `insert into categories (id, slug, name, division, position, active, created_at)
       values (?, ?, ?, ?, 0, 1, ?)`,
    )
    .run(id, candidate, clean, division ?? null, Math.floor(Date.now() / 1000));

  return id;
}

export async function updateCategory(
  id: string,
  input: { name?: string; description?: string | null; division?: string | null; active?: boolean; position?: number },
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.description !== undefined) patch.description = input.description;
  if (input.division !== undefined) patch.division = input.division;
  if (input.active !== undefined) patch.active = input.active;
  if (input.position !== undefined) patch.position = input.position;
  if (!Object.keys(patch).length) return;
  await db.update(categories).set(patch).where(eq(categories.id, id));
}

export async function deleteCategory(id: string): Promise<void> {
  // Les produits ne sont pas supprimés : ils perdent seulement leur rayon.
  await db.update(products).set({ categoryId: null }).where(eq(products.categoryId, id));
  await db.delete(categories).where(eq(categories.id, id));
}

export { safeJson };
