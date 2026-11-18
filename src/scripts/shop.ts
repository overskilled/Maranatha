/* ============================================================
   Boutique côté client : compteur du panier, quantités, ajout.
   Tout fonctionne sans JavaScript côté serveur ; ce fichier ne
   fait qu'éviter les rechargements de page.
   ============================================================ */

/* ---------- Compteur du panier ---------- */

/**
 * Le compteur se lit dans le cookie du panier, pour rester juste
 * même sur les pages du site qui sont servies depuis le cache.
 */
function countFromCookie(): number {
  const raw = document.cookie
    .split('; ')
    .find((part) => part.startsWith('maranatha_panier='))
    ?.slice('maranatha_panier='.length);

  if (!raw) return 0;

  try {
    const cart = JSON.parse(decodeURIComponent(decodeURIComponent(raw))) as {
      lines?: { qty?: number }[];
    };
    return (cart.lines ?? []).reduce((sum, line) => sum + (Number(line.qty) || 0), 0);
  } catch {
    return 0;
  }
}

export function refreshCartCount(value?: number): void {
  const count = value ?? countFromCookie();
  for (const badge of document.querySelectorAll<HTMLElement>('[data-cart-count]')) {
    badge.textContent = String(count);
    badge.hidden = count === 0;
  }
}

refreshCartCount();

/* ---------- Galerie ---------- */

const mainView = document.getElementById('vue') as HTMLImageElement | null;

for (const thumb of document.querySelectorAll<HTMLButtonElement>('[data-vue]')) {
  thumb.addEventListener('click', () => {
    if (!mainView) return;
    mainView.src = thumb.dataset.vue!;
    if (thumb.dataset.srcset) mainView.srcset = thumb.dataset.srcset;

    for (const other of document.querySelectorAll('.gallery__thumb')) {
      other.classList.toggle('is-active', other === thumb);
    }
  });
}

/* ---------- Quantité et ajout au panier ---------- */

const panel = document.querySelector<HTMLElement>('[data-product]');

if (panel) {
  const productId = panel.dataset.product!;
  const min = Number(panel.dataset.min ?? '1') || 1;
  const max = Number(panel.dataset.max ?? '9999') || 9999;
  const field = panel.querySelector<HTMLInputElement>('[data-qty]');

  function current(): number {
    const n = Number((field?.value ?? '').replace(/[^\d]/g, ''));
    return Number.isFinite(n) && n > 0 ? n : min;
  }

  function setQty(value: number): void {
    const clamped = Math.max(min, Math.min(max, value));
    if (field) field.value = String(clamped);
  }

  for (const button of panel.querySelectorAll<HTMLButtonElement>('[data-step]')) {
    button.addEventListener('click', () => {
      const step = Number(button.dataset.step) || 1;
      // On avance par paliers du minimum : vente par 10, on va de 10 en 10.
      setQty(current() + step * (min > 1 ? min : 1));
    });
  }

  field?.addEventListener('blur', () => setQty(current()));

  const addButton = panel.querySelector<HTMLButtonElement>('[data-add]');

  addButton?.addEventListener('click', async () => {
    addButton.disabled = true;
    const label = addButton.innerHTML;
    addButton.textContent = 'Un instant…';

    try {
      const response = await fetch('/api/boutique/panier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ajouter', id: productId, quantity: current() }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        count?: number;
        message?: string;
        error?: string;
      };

      if (!data.ok) {
        addButton.innerHTML = label;
        addButton.disabled = false;
        notify(data.error ?? 'Ajout impossible.', 'error');
        return;
      }

      refreshCartCount(data.count);
      addButton.textContent = 'Ajouté au panier';
      notify(data.message ?? 'Ajouté au panier.', 'success');

      setTimeout(() => {
        addButton.innerHTML = label;
        addButton.disabled = false;
      }, 2200);
    } catch {
      addButton.innerHTML = label;
      addButton.disabled = false;
      notify('Connexion interrompue. Réessayez.', 'error');
    }
  });
}

/* ---------- Petit message discret ---------- */

function notify(message: string, kind: 'success' | 'error'): void {
  let host = document.querySelector<HTMLElement>('[data-shop-notice]');

  if (!host) {
    host = document.createElement('div');
    host.setAttribute('data-shop-notice', '');
    host.setAttribute('role', 'status');
    host.style.cssText =
      'position:fixed;left:50%;bottom:1.5rem;transform:translateX(-50%);z-index:900;' +
      'max-width:min(28rem,calc(100vw - 2rem));padding:0.75rem 1.125rem;' +
      'font-family:var(--font-text);font-size:var(--step--1);line-height:1.5;' +
      'box-shadow:0 12px 40px rgba(11,21,38,0.22);opacity:0;transition:opacity .25s,transform .25s';
    document.body.append(host);
  }

  host.textContent = message;
  host.style.background = kind === 'error' ? '#7b3123' : '#0b1526';
  host.style.color = '#f6f0e2';

  requestAnimationFrame(() => {
    host!.style.opacity = '1';
    host!.style.transform = 'translateX(-50%) translateY(-0.25rem)';
  });

  window.clearTimeout(Number(host.dataset.timer));
  host.dataset.timer = String(
    window.setTimeout(() => {
      host!.style.opacity = '0';
      host!.style.transform = 'translateX(-50%)';
    }, 3400),
  );
}

export { notify };
