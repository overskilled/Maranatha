/* ============================================================
   Saisie rapide.
   Le curseur ne quitte jamais le clavier : Entrée enregistre et
   revient au nom. Rayon et unité restent d'une ligne à l'autre.
   ============================================================ */

declare global {
  interface Window {
    toast?: (message: string, kind?: 'info' | 'success' | 'danger', ms?: number) => void;
  }
}

const form = document.querySelector<HTMLFormElement>('[data-quick]');

if (form) {
  const logCard = document.querySelector<HTMLElement>('[data-log-card]');
  const log = document.querySelector<HTMLElement>('[data-log]');
  const counter = document.querySelector<HTMLElement>('[data-log-count]');
  const publish = document.querySelector<HTMLInputElement>('[data-publish]');
  const division = document.querySelector<HTMLSelectElement>('[data-division]');

  const nameField = form.elements.namedItem('name') as HTMLInputElement;
  const priceField = form.elements.namedItem('price') as HTMLInputElement;
  const stockField = form.elements.namedItem('stock') as HTMLInputElement;

  let added = 0;
  let busy = false;

  function addRow(product: {
    id: string;
    sku: string;
    name: string;
    priceLabel: string;
    stock: number;
    unit: string;
    status: string;
  }): void {
    if (!log) return;

    const row = document.createElement('div');
    row.className = 'quick-log__item';

    const tag = document.createElement('span');
    tag.className = `tag tag--${product.status === 'published' ? 'published' : 'draft'}`;
    tag.textContent = product.status === 'published' ? 'En ligne' : 'Brouillon';

    const body = document.createElement('div');
    body.style.cssText = 'flex:1;min-width:0';

    const title = document.createElement('a');
    title.href = `/admin/produits/${product.id}`;
    title.textContent = product.name;
    title.style.cssText = 'font-weight:500;text-decoration:none;display:block';

    const meta = document.createElement('span');
    meta.className = 'cell-main__meta';
    meta.textContent = `${product.sku} · ${product.stock} ${product.unit}`;

    body.append(title, meta);

    const price = document.createElement('span');
    price.className = 'money';
    price.style.cssText = 'white-space:nowrap';
    price.textContent = product.priceLabel;

    row.append(tag, body, price);
    log.prepend(row);

    added += 1;
    if (counter) counter.textContent = String(added);
    if (logCard) logCard.style.display = 'block';
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;

    const name = nameField.value.trim();
    if (!name) {
      nameField.focus();
      return;
    }

    busy = true;
    const submit = form.querySelector<HTMLButtonElement>('button[type=submit]');
    if (submit) submit.disabled = true;

    const data = new FormData(form);
    const payload = {
      name,
      categoryName: String(data.get('categoryName') ?? ''),
      price: String(data.get('price') ?? ''),
      stock: String(data.get('stock') ?? ''),
      unit: String(data.get('unit') ?? ''),
      division: division?.value ?? '',
      status: publish?.checked ? 'published' : 'draft',
    };

    try {
      const response = await fetch('/api/admin/produits/rapide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        ok: boolean;
        product?: Parameters<typeof addRow>[0];
        error?: string;
      };

      if (!result.ok || !result.product) {
        window.toast?.(result.error ?? 'Création impossible.', 'danger');
        return;
      }

      addRow(result.product);

      // Le nom, le prix et le stock se vident ; le rayon et l'unité restent.
      nameField.value = '';
      priceField.value = '';
      stockField.value = '';
      nameField.focus();
    } catch {
      window.toast?.('Connexion interrompue. L’article n’a pas été créé.', 'danger');
    } finally {
      busy = false;
      if (submit) submit.disabled = false;
    }
  });

  /* Entrée depuis n'importe quel champ enregistre la ligne. */
  for (const field of form.querySelectorAll<HTMLInputElement>('input')) {
    field.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        form.requestSubmit();
      }
    });
  }
}
