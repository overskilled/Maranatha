/* ============================================================
   Moteur de publication en lot.

   Trois temps, volontairement séparés :
     1. lire le fichier et proposer une correspondance de colonnes ;
     2. résoudre chaque ligne et montrer ce qui va se passer,
        sans rien écrire ;
     3. écrire, par paquets, dans des transactions courtes.

   Rien n'est modifié avant l'étape 3 : elle voit le résultat
   avant de s'engager.
   ============================================================ */

import { readFile } from 'node:fs/promises';
import { eq, sql } from 'drizzle-orm';
import { db, raw, transact } from '../db';
import { importJobs, type ImportJob } from '../db/schema';
import { parseFile, type ParsedFile } from './parse';
import { FIELD_BY_KEY, type FieldKey } from './columns';
import { parseAmount, parseQuantity } from '../money';
import {
  slugify, skuify, normalize, parseTags, parseBoolean, searchTextFor,
} from '../text';
import { newId } from '../ids';

/* ---------- Réglages d'un import ---------- */

export type ImportOptions = {
  /** upsert : créer ou mettre à jour. create : ignorer l'existant. update : ne toucher qu'à l'existant. */
  mode: 'upsert' | 'create' | 'update';
  /** Statut des fiches créées. Brouillon par défaut : on relit avant de publier. */
  defaultStatus: 'draft' | 'published';
  defaultCategoryId?: string | null;
  defaultDivision?: string | null;
  /** Créer les catégories absentes au lieu de refuser la ligne. */
  createCategories: boolean;
  /** Le fichier n'a que des prix d'achat : appliquer cette marge. */
  marginPercent?: number | null;
  /** Ne pas écraser un prix déjà saisi dans le back-office. */
  keepExistingPrice?: boolean;
  /** Ne pas écraser le stock existant (utile pour un import de tarifs). */
  keepExistingStock?: boolean;
  /** Laisser de côté les lignes sans prix plutôt que de créer à 0. */
  skipWithoutPrice?: boolean;
};

export const DEFAULT_OPTIONS: ImportOptions = {
  mode: 'upsert',
  defaultStatus: 'draft',
  defaultCategoryId: null,
  defaultDivision: null,
  createCategories: true,
  marginPercent: null,
  keepExistingPrice: false,
  keepExistingStock: false,
  skipWithoutPrice: false,
};

export function normalizeOptions(input: unknown): ImportOptions {
  const o = (input ?? {}) as Record<string, unknown>;
  const mode = o.mode === 'create' || o.mode === 'update' ? o.mode : 'upsert';
  const margin = Number(o.marginPercent);
  return {
    mode,
    defaultStatus: o.defaultStatus === 'published' ? 'published' : 'draft',
    defaultCategoryId: typeof o.defaultCategoryId === 'string' && o.defaultCategoryId ? o.defaultCategoryId : null,
    defaultDivision: typeof o.defaultDivision === 'string' && o.defaultDivision ? o.defaultDivision : null,
    createCategories: o.createCategories !== false,
    marginPercent: Number.isFinite(margin) && margin > 0 ? Math.min(margin, 1000) : null,
    keepExistingPrice: o.keepExistingPrice === true,
    keepExistingStock: o.keepExistingStock === true,
    skipWithoutPrice: o.skipWithoutPrice === true,
  };
}

/* ---------- Résolution ligne à ligne ---------- */

export type RowIssue = { level: 'error' | 'warning'; message: string };

export type ResolvedRow = {
  /** Numéro de ligne tel qu'affiché dans le tableur (en-tête = 1). */
  line: number;
  action: 'create' | 'update' | 'skip' | 'error';
  existingId: string | null;
  sku: string;
  values: Record<string, unknown>;
  categoryName: string | null;
  issues: RowIssue[];
};

export type ResolveResult = {
  rows: ResolvedRow[];
  summary: {
    total: number;
    create: number;
    update: number;
    skip: number;
    error: number;
    warnings: number;
    /** Catégories qui seront créées par l'import. */
    newCategories: string[];
    /** Champs reconnus dans le fichier. */
    mappedFields: FieldKey[];
    missingName: boolean;
  };
};

type ExistingIndex = {
  bySku: Map<string, { id: string; price: number; stock: number; name: string }>;
  categoriesByName: Map<string, string>;
};

function loadIndex(): ExistingIndex {
  const sqlite = raw();

  const bySku = new Map<string, { id: string; price: number; stock: number; name: string }>();
  for (const row of sqlite
    .prepare('select id, sku, price, stock, name from products')
    .iterate() as Iterable<{ id: string; sku: string; price: number; stock: number; name: string }>) {
    bySku.set(row.sku, { id: row.id, price: row.price, stock: row.stock, name: row.name });
  }

  const categoriesByName = new Map<string, string>();
  for (const row of sqlite
    .prepare('select id, name, slug from categories')
    .iterate() as Iterable<{ id: string; name: string; slug: string }>) {
    categoriesByName.set(normalize(row.name), row.id);
    categoriesByName.set(row.slug, row.id);
  }

  return { bySku, categoriesByName };
}

function readStatus(value: string): 'draft' | 'published' | 'archived' | null {
  const v = normalize(value);
  if (!v) return null;
  if (['publie', 'publié', 'actif', 'active', 'published', 'oui', 'en ligne', 'visible', '1', 'vrai'].includes(v)) {
    return 'published';
  }
  if (['brouillon', 'draft', 'non', 'inactif', 'masque', 'masqué', '0', 'faux'].includes(v)) {
    return 'draft';
  }
  if (['archive', 'archivé', 'archived', 'supprime', 'supprimé'].includes(v)) return 'archived';
  return null;
}

/**
 * Transforme les lignes brutes en intentions d'écriture.
 * Aucune écriture ici : c'est ce qui alimente l'aperçu.
 */
export function resolveRows(
  parsed: ParsedFile,
  mapping: Record<string, string>,
  options: ImportOptions,
): ResolveResult {
  const index = loadIndex();
  const rows: ResolvedRow[] = [];

  // Champs effectivement reconnus.
  const mappedFields = [...new Set(Object.values(mapping).filter(Boolean))] as FieldKey[];
  const hasName = mappedFields.includes('name');

  // Colonne → champ, inversé une fois pour toutes.
  const columnsFor = new Map<FieldKey, string[]>();
  for (const [column, field] of Object.entries(mapping)) {
    if (!field) continue;
    const list = columnsFor.get(field as FieldKey) ?? [];
    list.push(column);
    columnsFor.set(field as FieldKey, list);
  }

  const get = (row: Record<string, string>, field: FieldKey): string => {
    const columns = columnsFor.get(field);
    if (!columns) return '';
    for (const column of columns) {
      const value = (row[column] ?? '').trim();
      if (value) return value;
    }
    return '';
  };

  const newCategories = new Set<string>();
  const seenSku = new Map<string, number>();
  const summary = {
    total: parsed.rows.length,
    create: 0, update: 0, skip: 0, error: 0, warnings: 0,
    newCategories: [] as string[],
    mappedFields,
    missingName: !hasName,
  };

  parsed.rows.forEach((raw_, i) => {
    const line = i + 2; // +1 pour l'en-tête, +1 car les tableurs comptent à partir de 1
    const issues: RowIssue[] = [];
    const values: Record<string, unknown> = {};

    const name = get(raw_, 'name');
    const skuRaw = get(raw_, 'sku');
    const sku = skuify(skuRaw) || (name ? skuify(name) : '');

    if (!sku) {
      issues.push({
        level: 'error',
        message: hasName
          ? 'Ni nom ni référence : impossible d’identifier l’article.'
          : 'Aucune colonne « Nom de l’article » n’est associée.',
      });
    }

    const existing = sku ? index.bySku.get(sku) : undefined;

    // Doublon à l'intérieur du fichier.
    if (sku) {
      const first = seenSku.get(sku);
      if (first !== undefined) {
        issues.push({
          level: 'warning',
          message: `Référence ${sku} déjà présente ligne ${first}. Cette ligne écrasera la précédente.`,
        });
      }
      seenSku.set(sku, line);
    }

    if (name) values.name = name.slice(0, 300);
    if (!name && !existing) {
      issues.push({ level: 'error', message: 'Le nom est obligatoire pour créer un article.' });
    }

    /* Prix */
    const priceRaw = get(raw_, 'price');
    let price: number | null = null;
    if (priceRaw) {
      price = parseAmount(priceRaw);
      if (price === null) {
        issues.push({ level: 'error', message: `Prix illisible : « ${priceRaw} ».` });
      } else if (price < 0) {
        issues.push({ level: 'error', message: 'Le prix ne peut pas être négatif.' });
        price = null;
      }
    }

    /* Prix d'achat */
    const costRaw = get(raw_, 'cost');
    let cost: number | null = null;
    if (costRaw) {
      cost = parseAmount(costRaw);
      if (cost === null) {
        issues.push({ level: 'warning', message: `Prix d’achat illisible : « ${costRaw} », laissé vide.` });
      } else {
        values.cost = cost;
      }
    }

    // Pas de prix de vente mais un prix d'achat et une marge : on calcule.
    if (price === null && cost !== null && options.marginPercent) {
      price = Math.round(cost * (1 + options.marginPercent / 100));
      issues.push({
        level: 'warning',
        message: `Prix de vente calculé depuis le prix d’achat (+${options.marginPercent} %) : ${price}.`,
      });
    }

    if (price !== null) values.price = price;

    const noPrice = price === null && (!existing || existing.price <= 0);
    if (noPrice) {
      if (options.skipWithoutPrice) {
        issues.push({ level: 'warning', message: 'Aucun prix : ligne ignorée (réglage actif).' });
      } else {
        issues.push({ level: 'warning', message: 'Aucun prix : l’article restera à 0 et ne pourra pas être publié.' });
      }
    }

    /* Ancien prix */
    const compareRaw = get(raw_, 'comparePrice');
    if (compareRaw) {
      const compare = parseAmount(compareRaw);
      if (compare === null) {
        issues.push({ level: 'warning', message: `Ancien prix illisible : « ${compareRaw} », laissé vide.` });
      } else if (price !== null && compare <= price) {
        issues.push({
          level: 'warning',
          message: 'L’ancien prix n’est pas supérieur au prix de vente : il ne sera pas affiché.',
        });
      } else {
        values.comparePrice = compare;
      }
    }

    /* Stock */
    const stockRaw = get(raw_, 'stock');
    if (stockRaw) {
      const stock = parseQuantity(stockRaw);
      if (stock === null) {
        issues.push({ level: 'error', message: `Stock illisible : « ${stockRaw} ».` });
      } else if (stock < 0) {
        issues.push({ level: 'warning', message: 'Stock négatif ramené à 0.' });
        values.stock = 0;
      } else {
        values.stock = stock;
      }
    }

    /* Nombres simples */
    for (const field of ['minQuantity', 'lowStockThreshold', 'weightGrams'] as const) {
      const rawValue = get(raw_, field);
      if (!rawValue) continue;
      const n = parseQuantity(rawValue);
      if (n === null) {
        issues.push({
          level: 'warning',
          message: `${FIELD_BY_KEY.get(field)?.label ?? field} illisible : « ${rawValue} », ignoré.`,
        });
      } else {
        values[field] = Math.max(0, n);
      }
    }

    /* Textes */
    for (const field of ['description', 'unit', 'brand', 'origin', 'barcode'] as const) {
      const value = get(raw_, field);
      if (value) values[field] = value.slice(0, field === 'description' ? 5000 : 120);
    }

    /* Mots-clés */
    const tagsRaw = get(raw_, 'tags');
    if (tagsRaw) values.tags = parseTags(tagsRaw);

    /* Booléens */
    for (const field of ['featured', 'trackStock'] as const) {
      const rawValue = get(raw_, field);
      if (!rawValue) continue;
      const parsedBool = parseBoolean(rawValue);
      if (parsedBool === null) {
        issues.push({ level: 'warning', message: `« ${rawValue} » n’est ni oui ni non, valeur ignorée.` });
      } else {
        values[field] = parsedBool;
      }
    }

    /* Statut */
    const statusRaw = get(raw_, 'status');
    if (statusRaw) {
      const status = readStatus(statusRaw);
      if (!status) {
        issues.push({ level: 'warning', message: `Statut « ${statusRaw} » non reconnu, le réglage d’import s’applique.` });
      } else {
        values.status = status;
      }
    }

    /* Catégorie */
    let categoryName: string | null = null;
    const categoryRaw = get(raw_, 'category');
    if (categoryRaw) {
      categoryName = categoryRaw.slice(0, 120);
      const found = index.categoriesByName.get(normalize(categoryName)) ?? index.categoriesByName.get(slugify(categoryName));
      if (found) {
        values.categoryId = found;
      } else if (options.createCategories) {
        newCategories.add(categoryName);
        values.categoryName = categoryName;
      } else {
        issues.push({
          level: 'warning',
          message: `La catégorie « ${categoryName} » n’existe pas et la création automatique est désactivée.`,
        });
      }
    }

    /* Activité */
    const divisionRaw = get(raw_, 'division');
    if (divisionRaw) values.division = slugify(divisionRaw);

    /* Décision */
    let action: ResolvedRow['action'];
    const hasError = issues.some((it) => it.level === 'error');

    if (hasError) {
      action = 'error';
    } else if (noPrice && options.skipWithoutPrice) {
      action = 'skip';
    } else if (existing) {
      if (options.mode === 'create') {
        action = 'skip';
        issues.push({ level: 'warning', message: `La référence ${sku} existe déjà ; mode « création seule ».` });
      } else {
        action = 'update';
      }
    } else if (options.mode === 'update') {
      action = 'skip';
      issues.push({ level: 'warning', message: `La référence ${sku} n’existe pas ; mode « mise à jour seule ».` });
    } else {
      action = 'create';
    }

    summary[action] += 1;
    summary.warnings += issues.filter((it) => it.level === 'warning').length;

    rows.push({
      line,
      action,
      existingId: existing?.id ?? null,
      sku,
      values,
      categoryName,
      issues,
    });
  });

  summary.newCategories = [...newCategories];
  return { rows, summary };
}

/* ---------- Écriture ---------- */

type Statements = ReturnType<typeof prepareStatements>;

function prepareStatements() {
  const sqlite = raw();
  return {
    sqlite,
    insert: sqlite.prepare(
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
    ),
    slugTaken: sqlite.prepare('select 1 from products where slug = ? limit 1'),
    selectBySku: sqlite.prepare('select * from products where sku = ? limit 1'),
    movement: sqlite.prepare(
      `insert into stock_movements (id, product_id, delta, stock_after, reason, order_id, user_id, note, created_at)
       values (?, ?, ?, ?, 'import', null, ?, ?, ?)`,
    ),
    categoryBySlug: sqlite.prepare('select id from categories where slug = ? limit 1'),
    categoryByName: sqlite.prepare(
      'select id from categories where slug = ? or lower(name) = ? limit 1',
    ),
    insertCategory: sqlite.prepare(
      `insert into categories (id, slug, name, division, position, active, created_at)
       values (?, ?, ?, ?, 0, 1, ?)`,
    ),
  };
}

function freeSlug(stmts: Statements, base: string): string {
  const root = slugify(base);
  let candidate = root;
  let n = 1;
  while (stmts.slugTaken.get(candidate)) {
    n += 1;
    candidate = `${root}-${n}`;
    if (n > 200) return `${root}-${newId().slice(-6)}`;
  }
  return candidate;
}

function ensureCategory(
  stmts: Statements,
  name: string,
  division: string | null,
  cache: Map<string, string>,
): string {
  const key = normalize(name);
  const cached = cache.get(key);
  if (cached) return cached;

  const root = slugify(name);

  // Déjà en base, sous ce nom ou ce slug : on la réutilise.
  const existing = stmts.categoryByName.get(root, key) as { id: string } | undefined;
  if (existing) {
    cache.set(key, existing.id);
    return existing.id;
  }

  // Sinon on en crée une, avec un slug libre.
  let slug = root;
  let n = 1;
  while (stmts.categoryBySlug.get(slug)) {
    n += 1;
    slug = `${root}-${n}`;
    if (n > 200) {
      slug = `${root}-${newId().slice(-6)}`;
      break;
    }
  }

  const id = newId();
  stmts.insertCategory.run(id, slug, name.trim(), division, Math.floor(Date.now() / 1000));
  cache.set(key, id);
  return id;
}

/** Écrit un paquet de lignes. Appelé dans une transaction. */
function applyChunk(
  stmts: Statements,
  chunk: ResolvedRow[],
  options: ImportOptions,
  categoryCache: Map<string, string>,
  userId: string | null,
): { created: number; updated: number; skipped: number } {
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const nowSec = Math.floor(Date.now() / 1000);

  for (const row of chunk) {
    if (row.action === 'skip' || row.action === 'error') {
      skipped += 1;
      continue;
    }

    const v = row.values;

    // Catégorie à créer à la volée.
    let categoryId = (v.categoryId as string | undefined) ?? null;
    if (!categoryId && typeof v.categoryName === 'string' && options.createCategories) {
      categoryId = ensureCategory(
        stmts,
        v.categoryName,
        (v.division as string | undefined) ?? options.defaultDivision ?? null,
        categoryCache,
      );
    }
    if (!categoryId) categoryId = options.defaultCategoryId ?? null;

    const division = (v.division as string | undefined) ?? options.defaultDivision ?? null;
    const tags = Array.isArray(v.tags) ? (v.tags as string[]) : null;

    if (row.action === 'create') {
      const name = String(v.name ?? row.sku);
      const status = (v.status as string | undefined) ?? options.defaultStatus;
      const stock = Number(v.stock ?? 0);

      const id = newId();
      stmts.insert.run({
        id,
        sku: row.sku,
        slug: freeSlug(stmts, name || row.sku),
        name,
        description: (v.description as string | undefined) ?? null,
        category_id: categoryId,
        division,
        price: Math.max(0, Number(v.price ?? 0)),
        compare_price: v.comparePrice !== undefined ? Number(v.comparePrice) : null,
        cost: v.cost !== undefined ? Number(v.cost) : null,
        unit: (v.unit as string | undefined) || 'pièce',
        min_quantity: Math.max(1, Number(v.minQuantity ?? 1)),
        track_stock: v.trackStock === false ? 0 : 1,
        stock,
        low_stock_threshold: Math.max(0, Number(v.lowStockThreshold ?? 5)),
        status,
        featured: v.featured === true ? 1 : 0,
        brand: (v.brand as string | undefined) ?? null,
        origin: (v.origin as string | undefined) ?? null,
        barcode: (v.barcode as string | undefined) ?? null,
        weight_grams: v.weightGrams !== undefined ? Number(v.weightGrams) : null,
        tags: JSON.stringify(tags ?? []),
        position: 0,
        search_text: searchTextFor([
          name, row.sku, (v.brand as string) ?? null,
          ...(tags ?? []), String(v.description ?? '').slice(0, 200),
        ]),
        created_at: nowSec,
        updated_at: nowSec,
        published_at: status === 'published' ? nowSec : null,
      });

      if (stock !== 0) {
        stmts.movement.run(newId(), id, stock, stock, userId, 'Import de fichier', nowSec);
      }
      created += 1;
      continue;
    }

    /* Mise à jour : on ne touche qu'aux colonnes présentes dans le fichier. */
    const before = stmts.selectBySku.get(row.sku) as
      | { id: string; name: string; slug: string; stock: number; price: number; published_at: number | null; status: string; brand: string | null; description: string | null; tags: string | null }
      | undefined;
    if (!before) {
      skipped += 1;
      continue;
    }

    const patch: Record<string, unknown> = {};
    const assign = (column: string, value: unknown) => {
      patch[column] = value;
    };

    if (v.name !== undefined) assign('name', v.name);
    if (v.description !== undefined) assign('description', v.description);
    if (categoryId !== null) assign('category_id', categoryId);
    if (division !== null) assign('division', division);

    if (v.price !== undefined && !options.keepExistingPrice) assign('price', Math.max(0, Number(v.price)));
    if (v.comparePrice !== undefined) assign('compare_price', Number(v.comparePrice));
    if (v.cost !== undefined) assign('cost', Number(v.cost));
    if (v.unit !== undefined) assign('unit', v.unit);
    if (v.minQuantity !== undefined) assign('min_quantity', Math.max(1, Number(v.minQuantity)));
    if (v.lowStockThreshold !== undefined) assign('low_stock_threshold', Math.max(0, Number(v.lowStockThreshold)));
    if (v.trackStock !== undefined) assign('track_stock', v.trackStock ? 1 : 0);
    if (v.featured !== undefined) assign('featured', v.featured ? 1 : 0);
    if (v.brand !== undefined) assign('brand', v.brand);
    if (v.origin !== undefined) assign('origin', v.origin);
    if (v.barcode !== undefined) assign('barcode', v.barcode);
    if (v.weightGrams !== undefined) assign('weight_grams', Number(v.weightGrams));
    if (tags !== null) assign('tags', JSON.stringify(tags));

    if (v.status !== undefined) {
      assign('status', v.status);
      if (v.status === 'published' && !before.published_at) assign('published_at', nowSec);
    }

    let stockDelta = 0;
    let stockAfter = before.stock;
    if (v.stock !== undefined && !options.keepExistingStock) {
      stockAfter = Number(v.stock);
      stockDelta = stockAfter - before.stock;
      assign('stock', stockAfter);
    }

    if (!Object.keys(patch).length) {
      skipped += 1;
      continue;
    }

    assign('updated_at', nowSec);
    assign(
      'search_text',
      searchTextFor([
        String(patch.name ?? before.name),
        row.sku,
        String(patch.brand ?? before.brand ?? ''),
        ...(tags ?? (() => {
          try {
            return JSON.parse(before.tags ?? '[]') as string[];
          } catch {
            return [];
          }
        })()),
        String(patch.description ?? before.description ?? '').slice(0, 200),
      ]),
    );

    const columns = Object.keys(patch);
    stmts.sqlite
      .prepare(`update products set ${columns.map((c) => `${c} = @${c}`).join(', ')} where id = @id`)
      .run({ ...patch, id: before.id });

    if (stockDelta !== 0) {
      stmts.movement.run(newId(), before.id, stockDelta, stockAfter, userId, 'Import de fichier', nowSec);
    }
    updated += 1;
  }

  return { created, updated, skipped };
}

/* ---------- Déroulé d'un import ---------- */

const CHUNK = 250;

/** Imports en cours, pour éviter de lancer deux fois le même. */
const running = new Set<string>();

export function isRunning(jobId: string): boolean {
  return running.has(jobId);
}

/**
 * Exécute l'import enregistré. Avance par paquets de 250 lignes, et
 * rend la main au serveur entre deux paquets : la boutique reste
 * servie pendant qu'un fichier de 5 000 articles se publie.
 */
export async function runImport(jobId: string, userId: string | null = null): Promise<void> {
  if (running.has(jobId)) return;
  running.add(jobId);

  const started = Math.floor(Date.now() / 1000);

  try {
    const found = await db.select().from(importJobs).where(eq(importJobs.id, jobId)).limit(1);
    const job = found[0];
    if (!job) throw new Error('Import introuvable.');
    if (!job.storedPath) throw new Error('Le fichier déposé est introuvable.');
    if (job.status === 'en_cours') return;

    await db
      .update(importJobs)
      .set({ status: 'en_cours', startedAt: started, processedRows: 0, message: null })
      .where(eq(importJobs.id, jobId));

    const buffer = await readFile(job.storedPath);
    const parsed = await parseFile(buffer, job.filename);
    const options = normalizeOptions(job.options);
    const mapping = (job.mapping ?? {}) as Record<string, string>;

    const resolved = resolveRows(parsed, mapping, options);

    const stmts = prepareStatements();
    const categoryCache = new Map<string, string>();

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let processed = 0;

    const errors = resolved.rows
      .filter((r) => r.issues.length)
      .slice(0, 2000)
      .map((r) => ({
        row: r.line,
        sku: r.sku || undefined,
        messages: r.issues.map((it) => `${it.level === 'error' ? 'Erreur' : 'Avertissement'} : ${it.message}`),
      }));

    const errorCount = resolved.summary.error;

    await db
      .update(importJobs)
      .set({ totalRows: resolved.rows.length, errorCount, errors })
      .where(eq(importJobs.id, jobId));

    for (let i = 0; i < resolved.rows.length; i += CHUNK) {
      const chunk = resolved.rows.slice(i, i + CHUNK);

      const result = transact(() => applyChunk(stmts, chunk, options, categoryCache, userId));

      created += result.created;
      updated += result.updated;
      skipped += result.skipped;
      processed += chunk.length;

      await db
        .update(importJobs)
        .set({
          processedRows: processed,
          createdCount: created,
          updatedCount: updated,
          skippedCount: skipped,
        })
        .where(eq(importJobs.id, jobId));

      // Laisser respirer le serveur entre deux paquets.
      await new Promise((resolve) => setImmediate(resolve));
    }

    await db
      .update(importJobs)
      .set({
        status: 'termine',
        finishedAt: Math.floor(Date.now() / 1000),
        processedRows: processed,
        createdCount: created,
        updatedCount: updated,
        skippedCount: skipped,
        message: `${created} article(s) créé(s), ${updated} mis à jour, ${skipped} ignoré(s).`,
      })
      .where(eq(importJobs.id, jobId));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db
      .update(importJobs)
      .set({
        status: 'echoue',
        finishedAt: Math.floor(Date.now() / 1000),
        message: `L’import s’est arrêté : ${message}`,
      })
      .where(eq(importJobs.id, jobId));
    console.error('[import] échec', error);
  } finally {
    running.delete(jobId);
  }
}

/** Rapport d'erreurs en CSV, pour corriger et redéposer. */
export function errorReportCsv(job: ImportJob): string {
  const lines = ['Ligne;Référence;Problèmes'];
  for (const error of job.errors ?? []) {
    const messages = error.messages.join(' | ').replace(/"/g, '""');
    lines.push(`${error.row};${error.sku ?? ''};"${messages}"`);
  }
  // Marque UTF-8 pour qu'Excel affiche correctement les accents.
  return `﻿${lines.join('\r\n')}\r\n`;
}
