/* ============================================================
   Chiffres du tableau de bord.
   Les commandes annulées ne comptent jamais dans le chiffre
   d'affaires : ce qui est affiché doit être vrai.
   ============================================================ */

import { raw } from '../db';

/** Minuit local, en secondes. Les journées se comptent à Bafoussam. */
function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

function daysAgo(n: number): number {
  return startOfToday() - n * 86400;
}

export type Kpi = {
  revenue: number;
  orders: number;
  items: number;
  averageBasket: number;
};

function kpiBetween(from: number, to?: number): Kpi {
  const row = raw()
    .prepare(
      `select
         coalesce(sum(o.total), 0) as revenue,
         count(*) as orders,
         coalesce((
           select sum(oi.quantity) from order_items oi
           join orders o2 on o2.id = oi.order_id
           where o2.status != 'annulee'
             and o2.created_at >= @from
             and (@to is null or o2.created_at < @to)
         ), 0) as items
       from orders o
       where o.status != 'annulee'
         and o.created_at >= @from
         and (@to is null or o.created_at < @to)`,
    )
    .get({ from, to: to ?? null }) as
    | { revenue: number; orders: number; items: number }
    | undefined;

  const revenue = Number(row?.revenue ?? 0);
  const ordersCount = Number(row?.orders ?? 0);

  return {
    revenue,
    orders: ordersCount,
    items: Number(row?.items ?? 0),
    averageBasket: ordersCount ? Math.round(revenue / ordersCount) : 0,
  };
}

export type Dashboard = {
  today: Kpi;
  yesterday: Kpi;
  week: Kpi;
  month: Kpi;
  previousMonth: Kpi;
  allTime: Kpi;
  pending: number;
  unpaid: number;
  customers: number;
  newCustomers: number;
  catalogue: { published: number; draft: number; outOfStock: number; lowStock: number; noImage: number };
  /** Variation du mois en cours par rapport au précédent, en pourcentage. */
  monthChange: number | null;
};

export function dashboard(): Dashboard {
  const sqlite = raw();

  const today = kpiBetween(startOfToday());
  const yesterday = kpiBetween(daysAgo(1), startOfToday());
  const week = kpiBetween(daysAgo(6));
  const month = kpiBetween(daysAgo(29));
  const previousMonth = kpiBetween(daysAgo(59), daysAgo(29));
  const allTime = kpiBetween(0);

  const pendingRow = sqlite
    .prepare(
      `select
         sum(case when status in ('nouvelle','confirmee','preparee','expediee') then 1 else 0 end) as pending,
         sum(case when payment_status = 'en_attente' and status != 'annulee' then 1 else 0 end) as unpaid
       from orders`,
    )
    .get() as { pending: number | null; unpaid: number | null } | undefined;

  const customerRow = sqlite
    .prepare(
      `select
         count(*) as total,
         sum(case when created_at >= ? then 1 else 0 end) as recent
       from customers`,
    )
    .get(daysAgo(29)) as { total: number | null; recent: number | null } | undefined;

  const catalogueRow = sqlite
    .prepare(
      `select
         sum(case when status = 'published' then 1 else 0 end) as published,
         sum(case when status = 'draft' then 1 else 0 end) as draft,
         sum(case when status != 'archived' and track_stock = 1 and stock <= 0 then 1 else 0 end) as out_of_stock,
         sum(case when status != 'archived' and track_stock = 1 and stock > 0 and stock <= low_stock_threshold then 1 else 0 end) as low_stock,
         sum(case when status = 'published' and not exists (
           select 1 from product_images pi where pi.product_id = products.id
         ) then 1 else 0 end) as no_image
       from products`,
    )
    .get() as Record<string, number | null> | undefined;

  const monthChange =
    previousMonth.revenue > 0
      ? Math.round(((month.revenue - previousMonth.revenue) / previousMonth.revenue) * 100)
      : null;

  return {
    today,
    yesterday,
    week,
    month,
    previousMonth,
    allTime,
    pending: Number(pendingRow?.pending ?? 0),
    unpaid: Number(pendingRow?.unpaid ?? 0),
    customers: Number(customerRow?.total ?? 0),
    newCustomers: Number(customerRow?.recent ?? 0),
    catalogue: {
      published: Number(catalogueRow?.published ?? 0),
      draft: Number(catalogueRow?.draft ?? 0),
      outOfStock: Number(catalogueRow?.out_of_stock ?? 0),
      lowStock: Number(catalogueRow?.low_stock ?? 0),
      noImage: Number(catalogueRow?.no_image ?? 0),
    },
    monthChange,
  };
}

/* ---------- Séries ---------- */

export type DayPoint = { date: string; label: string; revenue: number; orders: number };

const WEEKDAYS = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];

/** Ventes jour par jour, y compris les jours à zéro. */
export function revenueSeries(days = 30): DayPoint[] {
  const from = daysAgo(days - 1);

  const rows = raw()
    .prepare(
      `select
         date(created_at, 'unixepoch', 'localtime') as day,
         coalesce(sum(total), 0) as revenue,
         count(*) as orders
       from orders
       where status != 'annulee' and created_at >= ?
       group by day`,
    )
    .all(from) as { day: string; revenue: number; orders: number }[];

  const byDay = new Map(rows.map((r) => [r.day, r]));
  const out: DayPoint[] = [];

  for (let i = 0; i < days; i += 1) {
    const d = new Date((from + i * 86400) * 1000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const row = byDay.get(key);
    out.push({
      date: key,
      label: days <= 14 ? `${WEEKDAYS[d.getDay()]} ${d.getDate()}` : String(d.getDate()),
      revenue: Number(row?.revenue ?? 0),
      orders: Number(row?.orders ?? 0),
    });
  }

  return out;
}

export type TopProduct = {
  productId: string | null;
  sku: string;
  name: string;
  quantity: number;
  revenue: number;
};

export function topProducts(days = 30, limit = 10): TopProduct[] {
  return raw()
    .prepare(
      `select
         oi.product_id as productId,
         oi.sku as sku,
         oi.name as name,
         sum(oi.quantity) as quantity,
         sum(oi.line_total) as revenue
       from order_items oi
       join orders o on o.id = oi.order_id
       where o.status != 'annulee' and o.created_at >= ?
       group by oi.sku
       order by revenue desc
       limit ?`,
    )
    .all(daysAgo(days - 1), limit) as TopProduct[];
}

/** Répartition du chiffre d'affaires par rayon. */
export function revenueByCategory(days = 30, limit = 8) {
  return raw()
    .prepare(
      `select
         coalesce(c.name, 'Sans rayon') as name,
         sum(oi.line_total) as revenue,
         sum(oi.quantity) as quantity
       from order_items oi
       join orders o on o.id = oi.order_id
       left join products p on p.id = oi.product_id
       left join categories c on c.id = p.category_id
       where o.status != 'annulee' and o.created_at >= ?
       group by coalesce(c.name, 'Sans rayon')
       order by revenue desc
       limit ?`,
    )
    .all(daysAgo(days - 1), limit) as { name: string; revenue: number; quantity: number }[];
}

/** Articles qui se vendent mais dont le stock ne suivra pas. */
export function stockAlerts(limit = 8) {
  return raw()
    .prepare(
      `select
         p.id, p.sku, p.name, p.stock, p.low_stock_threshold as threshold, p.unit,
         coalesce((
           select sum(oi.quantity) from order_items oi
           join orders o on o.id = oi.order_id
           where oi.product_id = p.id and o.status != 'annulee' and o.created_at >= ?
         ), 0) as sold30
       from products p
       where p.status = 'published' and p.track_stock = 1
         and p.stock <= p.low_stock_threshold
       order by sold30 desc, p.stock asc
       limit ?`,
    )
    .all(daysAgo(29), limit) as {
    id: string; sku: string; name: string; stock: number;
    threshold: number; unit: string; sold30: number;
  }[];
}
