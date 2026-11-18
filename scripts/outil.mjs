#!/usr/bin/env node
/* ============================================================
   Outil en ligne de commande — Maranatha Le Juste Prix

     node scripts/outil.mjs compte <email> <nom> <motdepasse> [proprietaire|equipe]
     node scripts/outil.mjs demo              jeu d'essai (catalogue + commandes)
     node scripts/outil.mjs vider-demo        retire le jeu d'essai
     node scripts/outil.mjs sauvegarde [chemin]
     node scripts/outil.mjs photos-vers-r2 [--vrai]
     node scripts/outil.mjs etat

   Volontairement sans dépendance au code de l'application : cet
   outil doit fonctionner même si le serveur ne démarre pas.
   ============================================================ */

import Database from 'better-sqlite3';
import { scryptSync, randomBytes } from 'node:crypto';
import { mkdirSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';

const DATA_DIR = resolve(process.env.DATA_DIR ?? './data');
const DB_PATH = resolve(process.env.DATABASE_PATH ?? join(DATA_DIR, 'maranatha.db'));

/* ---------- Base ---------- */

function open() {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

/** Applique les migrations du dossier drizzle/ si besoin. */
function migrate(db) {
  const folder = resolve('./drizzle');
  if (!existsSync(folder)) {
    console.error('Dossier drizzle/ introuvable. Lancez d’abord « npx drizzle-kit generate ».');
    process.exit(1);
  }

  db.exec(`create table if not exists __drizzle_migrations (
    id integer primary key autoincrement,
    hash text not null,
    created_at numeric
  )`);

  const done = new Set(
    db.prepare('select hash from __drizzle_migrations').all().map((r) => r.hash),
  );

  const files = readdirSync(folder).filter((f) => f.endsWith('.sql')).sort();
  let applied = 0;

  for (const file of files) {
    if (done.has(file)) continue;
    const sql = readFileSync(join(folder, file), 'utf8');
    db.exec('begin');
    try {
      for (const statement of sql.split('--> statement-breakpoint')) {
        const trimmed = statement.trim();
        if (trimmed) db.exec(trimmed);
      }
      db.prepare('insert into __drizzle_migrations (hash, created_at) values (?, ?)').run(
        file,
        Date.now(),
      );
      db.exec('commit');
      applied += 1;
    } catch (error) {
      db.exec('rollback');
      // Les tables existent déjà : la base a été migrée par le serveur.
      if (String(error.message).includes('already exists')) {
        db.prepare('insert into __drizzle_migrations (hash, created_at) values (?, ?)').run(
          file,
          Date.now(),
        );
        continue;
      }
      throw error;
    }
  }

  if (applied) console.log(`${applied} migration(s) appliquée(s).`);
}

/* ---------- Aides ---------- */

const ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz';

function newId() {
  let time = Date.now();
  let head = '';
  for (let i = 0; i < 8; i += 1) {
    head = ALPHABET[time % 32] + head;
    time = Math.floor(time / 32);
  }
  const bytes = randomBytes(12);
  let tail = '';
  for (let i = 0; i < 12; i += 1) tail += ALPHABET[bytes[i] % 32];
  return head + tail;
}

/** Même format que src/lib/auth.ts. */
function hashPassword(password) {
  const N = 16384;
  const r = 8;
  const p = 1;
  const salt = randomBytes(16);
  const key = scryptSync(password.normalize('NFKC'), salt, 64, { N, r, p });
  return ['scrypt', N, r, p, salt.toString('base64url'), key.toString('base64url')].join('$');
}

const normalize = (s) =>
  (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const slugify = (s) =>
  normalize(s).replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

const now = () => Math.floor(Date.now() / 1000);

/* ---------- Commandes ---------- */

function createAccount(db, [email, name, password, role = 'proprietaire']) {
  if (!email || !name || !password) {
    console.error('Usage : node scripts/outil.mjs compte <email> <nom> <motdepasse> [proprietaire|equipe]');
    process.exit(1);
  }
  if (password.length < 10) {
    console.error('Le mot de passe doit faire au moins 10 caractères.');
    process.exit(1);
  }

  const clean = normalize(email);
  const dbRole = role === 'equipe' ? 'staff' : 'owner';

  const existing = db.prepare('select id from users where email = ?').get(clean);
  if (existing) {
    db.prepare('update users set name = ?, password_hash = ?, role = ?, active = 1, must_change_password = 0 where id = ?')
      .run(name, hashPassword(password), dbRole, existing.id);
    console.log(`Compte mis à jour : ${clean} (${dbRole === 'owner' ? 'propriétaire' : 'équipe'}).`);
    return;
  }

  db.prepare(
    `insert into users (id, email, name, password_hash, role, active, must_change_password, created_at)
     values (?, ?, ?, ?, ?, 1, 0, ?)`,
  ).run(newId(), clean, name, hashPassword(password), dbRole, now());

  console.log(`Compte créé : ${clean} (${dbRole === 'owner' ? 'propriétaire' : 'équipe'}).`);
  console.log('Connexion : /admin/connexion');
}

const DEMO_CATEGORIES = [
  ['Épicerie', 'commerce'],
  ['Quincaillerie', 'commerce'],
  ['Textiles', 'commerce'],
  ['Matériaux de construction', 'btp'],
  ['Intrants agricoles', 'agriculture-elevage'],
];

const DEMO_PRODUCTS = [
  ['RIZ-25KG', 'Riz parfumé 25 kg', 'Épicerie', 18500, 15000, 'sac', 40, 'Riz long grain, sac de 25 kg.'],
  ['RIZ-5KG', 'Riz parfumé 5 kg', 'Épicerie', 4200, 3400, 'sac', 120, 'Riz long grain, sac de 5 kg.'],
  ['HUILE-5L', 'Huile de palme raffinée 5 L', 'Épicerie', 7500, 6200, 'bidon', 60, 'Bidon de 5 litres.'],
  ['SUCRE-50KG', 'Sucre en poudre 50 kg', 'Épicerie', 34000, 29500, 'sac', 12, 'Sac de 50 kg.'],
  ['SAVON-CARTON', 'Savon de ménage, carton de 24', 'Épicerie', 9800, 8100, 'carton', 35, 'Carton de 24 pains.'],
  ['LAIT-BOITE', 'Lait en poudre 400 g', 'Épicerie', 2600, 2050, 'boîte', 200, ''],
  ['CIM-50KG', 'Ciment CPJ 35, sac de 50 kg', 'Matériaux de construction', 6500, 5800, 'sac', 320, 'Sac de 50 kg.'],
  ['FER-8', 'Fer à béton 8 mm, barre de 12 m', 'Matériaux de construction', 4200, 3700, 'barre', 180, ''],
  ['FER-12', 'Fer à béton 12 mm, barre de 12 m', 'Matériaux de construction', 9400, 8300, 'barre', 95, ''],
  ['TOLE-BAC', 'Tôle bac alu, 2 m', 'Matériaux de construction', 12500, 10800, 'feuille', 48, ''],
  ['CLOU-5KG', 'Clous de charpente, 5 kg', 'Quincaillerie', 4800, 3900, 'paquet', 60, ''],
  ['MARTEAU', 'Marteau de charpentier', 'Quincaillerie', 3500, 2400, 'pièce', 25, ''],
  ['PEINTURE-20L', 'Peinture à eau blanche 20 L', 'Quincaillerie', 23000, 19000, 'seau', 18, ''],
  ['CADENAS-M', 'Cadenas laiton moyen', 'Quincaillerie', 2200, 1500, 'pièce', 80, ''],
  ['PAGNE-6Y', 'Pagne imprimé 6 yards', 'Textiles', 11000, 8500, 'pièce', 45, ''],
  ['DRAP-2P', 'Drap deux places', 'Textiles', 8500, 6400, 'pièce', 30, ''],
  ['ENGRAIS-50', 'Engrais NPK 20-10-10, 50 kg', 'Intrants agricoles', 28000, 24000, 'sac', 64, ''],
  ['MAIS-SEM', 'Semence de maïs améliorée 5 kg', 'Intrants agricoles', 6800, 5500, 'sac', 90, ''],
  ['PROVENDE-50', 'Provende poulet de chair 50 kg', 'Intrants agricoles', 19500, 16800, 'sac', 52, ''],
  ['ARROSOIR', 'Arrosoir 10 L', 'Intrants agricoles', 3200, 2300, 'pièce', 40, ''],
];

function seedDemo(db) {
  const stamp = now();
  const categoryIds = new Map();

  const insertCategory = db.prepare(
    `insert into categories (id, slug, name, division, position, active, created_at)
     values (?, ?, ?, ?, ?, 1, ?)`,
  );

  DEMO_CATEGORIES.forEach(([name, division], i) => {
    const slug = slugify(name);
    const existing = db.prepare('select id from categories where slug = ?').get(slug);
    if (existing) {
      categoryIds.set(name, existing.id);
      return;
    }
    const id = newId();
    insertCategory.run(id, slug, name, division, i, stamp);
    categoryIds.set(name, id);
  });

  const insertProduct = db.prepare(
    `insert into products (
      id, sku, slug, name, description, category_id, division,
      price, compare_price, cost, unit, min_quantity,
      track_stock, stock, low_stock_threshold, status, featured,
      brand, origin, barcode, weight_grams, tags,
      position, search_text, created_at, updated_at, published_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, null, ?, ?, 1, 1, ?, 5, 'published', ?, null, 'Cameroun', null, null, ?, 0, ?, ?, ?, ?)`,
  );

  const divisionFor = Object.fromEntries(DEMO_CATEGORIES);
  const productIds = [];
  let created = 0;

  for (const [sku, name, category, price, cost, unit, stock, description] of DEMO_PRODUCTS) {
    const existing = db.prepare('select id from products where sku = ?').get(sku);
    if (existing) {
      productIds.push({ id: existing.id, sku, name, price, unit });
      continue;
    }

    const id = newId();
    insertProduct.run(
      id, sku, slugify(name), name, description || null,
      categoryIds.get(category) ?? null, divisionFor[category] ?? 'commerce',
      price, cost, unit, stock, created < 4 ? 1 : 0,
      JSON.stringify([]), normalize(`${name} ${sku}`), stamp, stamp, stamp,
    );
    productIds.push({ id, sku, name, price, unit });
    created += 1;
  }

  /* Quelques commandes réparties sur un mois, pour que le tableau
     de bord montre quelque chose de crédible. */
  const customers = [
    ['237677123456', 'Mme Ngono Élise', 'Bafoussam centre', 'Famla'],
    ['237699234567', 'M. Kamdem Paul', 'Bafoussam centre', 'Tamdja'],
    ['237655345678', 'Boutique Le Relais', 'Bafoussam périphérie', 'Djeleng'],
    ['237678456789', 'M. Tchoupo André', 'Bafoussam centre', 'Kamkop'],
    ['237691567890', 'Mme Fotso Clarisse', 'Autre ville', 'Dschang'],
  ];

  const insertCustomer = db.prepare(
    `insert into customers (id, phone, name, email, city, quarter, orders_count, total_spent, created_at, last_order_at)
     values (?, ?, ?, null, ?, ?, 0, 0, ?, ?)`,
  );
  const customerIds = new Map();

  for (const [phone, name, city, quarter] of customers) {
    const existing = db.prepare('select id from customers where phone = ?').get(phone);
    if (existing) {
      customerIds.set(phone, existing.id);
      continue;
    }
    const id = newId();
    insertCustomer.run(id, phone, name, city, quarter, stamp - 86400 * 40, stamp);
    customerIds.set(phone, id);
  }

  const insertOrder = db.prepare(
    `insert into orders (
      id, reference, status, payment_status, payment_method,
      customer_id, customer_name, customer_phone, customer_email,
      delivery_mode, address, city, quarter, note, internal_note,
      subtotal, delivery_fee, discount, total, channel, stock_applied,
      created_at, updated_at, confirmed_at, delivered_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, null, ?, ?, ?, ?, null, null, ?, ?, 0, ?, ?, 1, ?, ?, ?, ?)`,
  );
  const insertItem = db.prepare(
    `insert into order_items (id, order_id, product_id, sku, name, unit, unit_price, quantity, line_total)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const statuses = [
    ['livree', 'paye'], ['livree', 'paye'], ['livree', 'paye'],
    ['expediee', 'en_attente'], ['preparee', 'en_attente'],
    ['confirmee', 'en_attente'], ['nouvelle', 'en_attente'],
    ['annulee', 'en_attente'],
  ];

  const year = new Date().getFullYear();
  const lastRef = db
    .prepare("select reference from orders where reference like ? order by reference desc limit 1")
    .get(`CMD-${year}-%`);
  let counter = lastRef ? Number.parseInt(lastRef.reference.slice(-4), 10) : 0;

  let orders = 0;
  if (productIds.length) {
    for (let i = 0; i < 26; i += 1) {
      const [phone, name, city, quarter] = customers[i % customers.length];
      const [status, payment] = statuses[i % statuses.length];
      const createdAt = stamp - Math.floor(Math.random() * 86400 * 29) - 3600;

      const lineCount = 1 + Math.floor(Math.random() * 3);
      const picked = [];
      for (let k = 0; k < lineCount; k += 1) {
        const product = productIds[Math.floor(Math.random() * productIds.length)];
        if (!picked.some((p) => p.id === product.id)) picked.push(product);
      }

      const lines = picked.map((product) => {
        const quantity = 1 + Math.floor(Math.random() * 6);
        return { product, quantity, total: product.price * quantity };
      });

      const subtotal = lines.reduce((sum, l) => sum + l.total, 0);
      const fee = city === 'Autre ville' ? 5000 : city.includes('périphérie') ? 2000 : 1000;
      const delivery = subtotal >= 50000 ? 0 : fee;

      counter += 1;
      const orderId = newId();
      insertOrder.run(
        orderId, `CMD-${year}-${String(counter).padStart(4, '0')}`,
        status, payment, i % 3 === 0 ? 'momo' : 'livraison',
        customerIds.get(phone), name, phone,
        i % 5 === 0 ? 'retrait' : 'livraison',
        i % 5 === 0 ? null : `Quartier ${quarter}`, city, quarter,
        subtotal, delivery, subtotal + delivery,
        i % 7 === 0 ? 'whatsapp' : 'web',
        createdAt, createdAt,
        status === 'nouvelle' ? null : createdAt + 1800,
        status === 'livree' ? createdAt + 86400 : null,
      );

      for (const line of lines) {
        insertItem.run(
          newId(), orderId, line.product.id, line.product.sku, line.product.name,
          line.product.unit, line.product.price, line.quantity, line.total,
        );
      }
      orders += 1;
    }

    // Remettre les compteurs clients d'aplomb.
    db.exec(`
      update customers set
        orders_count = (select count(*) from orders where orders.customer_id = customers.id and status != 'annulee'),
        total_spent = (select coalesce(sum(total), 0) from orders where orders.customer_id = customers.id and status != 'annulee'),
        last_order_at = (select max(created_at) from orders where orders.customer_id = customers.id)
    `);
  }

  console.log(`Jeu d'essai : ${created} article(s) et ${orders} commande(s) ajoutés.`);
  console.log('Les articles portent des références reconnaissables (RIZ-25KG, CIM-50KG…).');
  console.log('Pour les retirer : node scripts/outil.mjs vider-demo');
}

function clearDemo(db) {
  const skus = DEMO_PRODUCTS.map(([sku]) => sku);
  const marks = skus.map(() => '?').join(',');

  const ids = db.prepare(`select id from products where sku in (${marks})`).all(...skus).map((r) => r.id);

  db.exec('begin');
  try {
    if (ids.length) {
      const idMarks = ids.map(() => '?').join(',');
      db.prepare(`delete from order_items where product_id in (${idMarks})`).run(...ids);
      db.prepare(`delete from products where id in (${idMarks})`).run(...ids);
    }
    // Commandes devenues vides.
    db.exec(`delete from orders where not exists (
      select 1 from order_items where order_items.order_id = orders.id
    )`);
    db.exec('delete from customers where orders_count = 0 or not exists (select 1 from orders where orders.customer_id = customers.id)');
    db.exec('commit');
  } catch (error) {
    db.exec('rollback');
    throw error;
  }

  console.log(`${ids.length} article(s) du jeu d'essai supprimés, ainsi que les commandes associées.`);
}

async function backup(db, [target]) {
  const path = target ?? join(DATA_DIR, `sauvegardes/maranatha-${new Date().toISOString().slice(0, 10)}.db`);
  mkdirSync(dirname(resolve(path)), { recursive: true });
  await db.backup(resolve(path));
  console.log(`Sauvegarde écrite : ${resolve(path)}`);
  console.log('Pensez à copier aussi le dossier des photos (data/uploads).');
}

/**
 * Envoie vers R2 les rendus encore rangés sur le disque.
 *
 * À lancer une fois, après avoir renseigné les variables R2 : sans
 * cela, les photos déjà en base pointeraient vers un bucket où elles
 * n'existent pas. Rien n'est supprimé du disque — on vérifie d'abord
 * que tout est en ligne.
 */
async function photosVersR2(db, args) {
  const apply = args.includes('--vrai');

  // Lire la configuration sans dépendre du code de l'application.
  const env = {};
  for (const file of ['.env', '.env.local']) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#') || !t.includes('=')) continue;
      const [k, ...rest] = t.split('=');
      const key = k.trim();
      if (env[key] === undefined) env[key] = rest.join('=').trim().replace(/^["']|["']$/g, '');
    }
  }
  for (const key of Object.keys(env)) {
    if (process.env[key] !== undefined) env[key] = process.env[key];
  }

  if (!env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_BUCKET) {
    console.error('R2 n\'est pas configuré : renseignez R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY et R2_BUCKET dans .env.');
    process.exit(1);
  }

  const uploadsDir = resolve(env.UPLOADS_DIR ?? join(DATA_DIR, 'uploads'));
  const prefix = (env.R2_PREFIX ?? 'maranatha').replace(/^\/+|\/+$/g, '');

  const { S3Client, PutObjectCommand, HeadObjectCommand } = await import('@aws-sdk/client-s3');
  const s3 = new S3Client({
    region: 'auto',
    endpoint: env.R2_ENDPOINT || `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });

  const rows = db.prepare('select filename, widths from product_images').all();
  const wanted = [];
  for (const row of rows) {
    let widths = [400, 800, 1600];
    try {
      widths = JSON.parse(row.widths);
    } catch {
      /* largeurs par défaut */
    }
    for (const w of widths) wanted.push(`${row.filename}-${w}.webp`);
  }

  console.log(`${rows.length} photo(s) en base, ${wanted.length} rendu(s) attendus.`);
  if (!apply) console.log('Essai à blanc. Ajoutez --vrai pour envoyer réellement.\n');

  let sent = 0;
  let already = 0;
  let absent = 0;

  for (const name of wanted) {
    const key = prefix ? `${prefix}/${name}` : name;

    // Déjà en ligne ? On n'y touche pas.
    try {
      await s3.send(new HeadObjectCommand({ Bucket: env.R2_BUCKET, Key: key }));
      already += 1;
      continue;
    } catch {
      /* absent du bucket, on continue */
    }

    const path = join(uploadsDir, name);
    if (!existsSync(path)) {
      absent += 1;
      console.log(`  manquant des deux côtés : ${name}`);
      continue;
    }

    if (apply) {
      await s3.send(
        new PutObjectCommand({
          Bucket: env.R2_BUCKET,
          Key: key,
          Body: readFileSync(path),
          ContentType: 'image/webp',
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
    }
    sent += 1;
  }

  console.log(`\n${apply ? 'Envoyés' : 'À envoyer'} : ${sent}`);
  console.log(`Déjà sur R2    : ${already}`);
  if (absent) console.log(`Introuvables   : ${absent}  (ces fiches resteront sans photo)`);

  if (apply && sent > 0) {
    console.log('\nVérifiez la boutique, puis le dossier local peut être archivé.');
  }
}

function status(db) {
  const one = (sql) => Object.values(db.prepare(sql).get() ?? {})[0] ?? 0;

  console.log(`Base          : ${DB_PATH}`);
  console.log(`Comptes       : ${one('select count(*) as n from users')}`);
  console.log(`Articles      : ${one('select count(*) as n from products')} ` +
    `(${one("select count(*) as n from products where status = 'published'")} en ligne)`);
  console.log(`Rayons        : ${one('select count(*) as n from categories')}`);
  console.log(`Photos        : ${one('select count(*) as n from product_images')}`);
  console.log(`Commandes     : ${one('select count(*) as n from orders')}`);
  console.log(`Clients       : ${one('select count(*) as n from customers')}`);
  console.log(`Chiffre total : ${one("select coalesce(sum(total), 0) as n from orders where status != 'annulee'")} FCFA`);
}

/* ---------- Entrée ---------- */

const [command, ...args] = process.argv.slice(2);
const db = open();
migrate(db);

try {
  switch (command) {
    case 'compte': createAccount(db, args); break;
    case 'demo': seedDemo(db); break;
    case 'vider-demo': clearDemo(db); break;
    case 'sauvegarde': await backup(db, args); break;
    case 'photos-vers-r2': await photosVersR2(db, args); break;
    case 'etat': status(db); break;
    default:
      console.log(`Outil Maranatha Le Juste Prix

  compte <email> <nom> <motdepasse> [proprietaire|equipe]
      Crée ou met à jour un accès au back-office.

  demo
      Ajoute un catalogue et des commandes d'essai.

  vider-demo
      Retire le jeu d'essai.

  sauvegarde [chemin]
      Copie la base à chaud, sans arrêter le serveur.

  photos-vers-r2 [--vrai]
      Envoie vers Cloudflare R2 les photos encore sur le disque.
      Sans --vrai, montre seulement ce qui serait envoyé.

  etat
      Résumé de ce que contient la base.
`);
  }
} finally {
  db.close();
}
