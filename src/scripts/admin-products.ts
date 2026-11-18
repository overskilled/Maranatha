/* ============================================================
   Tableau des articles : sélection, édition directe, actions
   en lot. Pensé pour la main sur le clavier — on saisit un prix,
   Entrée, et on est déjà sur la ligne suivante.
   ============================================================ */

type Toast = (message: string, kind?: 'info' | 'success' | 'danger', ms?: number) => void;

declare global {
  interface Window {
    toast?: Toast;
  }
}

function say(message: string, kind: 'info' | 'success' | 'danger' = 'info'): void {
  if (window.toast) window.toast(message, kind);
  else if (kind === 'danger') alert(message);
}

const list = document.querySelector<HTMLElement>('[data-list]');
if (list) {
  const filterPayload = JSON.parse(list.dataset.filter || '{}') as Record<string, unknown>;
  const totalMatching = Number(list.dataset.total || '0');

  const bulkbar = document.querySelector<HTMLElement>('[data-bulkbar]');
  const countEl = document.querySelector<HTMLElement>('[data-bulk-count]');
  const wordEl = document.querySelector<HTMLElement>('[data-bulk-word]');
  const hint = document.querySelector<HTMLElement>('[data-select-all-hint]');
  const checkAll = document.querySelector<HTMLInputElement>('[data-check-all]');
  const checks = () => [...document.querySelectorAll<HTMLInputElement>('[data-check]')];

  /** Vrai quand la sélection porte sur tout le filtre, pas sur la page. */
  let wholeFilter = false;

  /* ---------- Sélection ---------- */

  function selectedIds(): string[] {
    return checks().filter((c) => c.checked).map((c) => c.value);
  }

  function selectionSize(): number {
    return wholeFilter ? totalMatching : selectedIds().length;
  }

  function refresh(): void {
    const n = selectionSize();
    const onPage = selectedIds().length;

    if (countEl) countEl.textContent = n.toLocaleString('fr-FR');
    if (wordEl) {
      wordEl.textContent = wholeFilter
        ? n > 1 ? 'articles du filtre' : 'article du filtre'
        : n > 1 ? 'sélectionnés' : 'sélectionné';
    }

    bulkbar?.classList.toggle('is-open', n > 0);

    for (const check of checks()) {
      check.closest('tr')?.classList.toggle('is-selected', check.checked);
    }

    if (checkAll) {
      const all = checks();
      checkAll.checked = all.length > 0 && onPage === all.length;
      checkAll.indeterminate = onPage > 0 && onPage < all.length;
    }

    // On ne propose d'étendre au filtre que si la page entière est cochée
    // et qu'il reste des articles au-delà.
    const canExtend =
      !wholeFilter && onPage > 0 && onPage === checks().length && totalMatching > checks().length;
    if (hint) hint.style.display = canExtend ? 'inline' : 'none';

    for (const echo of document.querySelectorAll<HTMLElement>('[data-echo-count]')) {
      echo.textContent = n.toLocaleString('fr-FR');
    }
  }

  function clearSelection(): void {
    wholeFilter = false;
    for (const check of checks()) check.checked = false;
    refresh();
  }

  checkAll?.addEventListener('change', () => {
    wholeFilter = false;
    for (const check of checks()) check.checked = checkAll.checked;
    refresh();
  });

  let lastIndex = -1;
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (!target.matches('[data-check]')) return;

    const all = checks();
    const index = all.indexOf(target as HTMLInputElement);

    // Maj + clic : cocher toute une plage, comme dans un tableur.
    if ((event as MouseEvent).shiftKey && lastIndex >= 0 && index >= 0) {
      const [start, end] = [Math.min(lastIndex, index), Math.max(lastIndex, index)];
      const state = (target as HTMLInputElement).checked;
      for (let i = start; i <= end; i += 1) all[i].checked = state;
    }
    lastIndex = index;
    wholeFilter = false;
    refresh();
  });

  document.querySelector('[data-select-filter]')?.addEventListener('click', () => {
    wholeFilter = true;
    for (const check of checks()) check.checked = true;
    refresh();
    say(`${totalMatching.toLocaleString('fr-FR')} articles sélectionnés.`, 'info');
  });

  document.querySelector('[data-bulk-clear]')?.addEventListener('click', clearSelection);

  /* ---------- Actions en lot ---------- */

  async function runBulk(action: string, extra: Record<string, unknown> = {}): Promise<void> {
    const n = selectionSize();
    if (n === 0) return;

    if (action === 'supprimer') {
      const confirmed = confirm(
        `Supprimer définitivement ${n.toLocaleString('fr-FR')} article(s) ?\n\n` +
          'Les photos associées seront également supprimées. Cette action est irréversible.\n' +
          'Pour simplement les retirer de la boutique, utilisez « Archiver ».',
      );
      if (!confirmed) return;
    }

    if (action === 'publier' && n > 200) {
      if (!confirm(`Publier ${n.toLocaleString('fr-FR')} articles d’un coup ?`)) return;
    }

    const buttons = [...document.querySelectorAll<HTMLButtonElement>('.bulkbar button')];
    for (const button of buttons) button.disabled = true;

    try {
      const body: Record<string, unknown> = { action, ...extra };
      if (wholeFilter) body.filter = filterPayload;
      else body.ids = selectedIds();

      const response = await fetch('/api/admin/produits/lot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { ok: boolean; message?: string; error?: string };

      if (!data.ok) {
        say(data.error ?? 'L’opération a échoué.', 'danger');
        return;
      }

      say(data.message ?? 'Fait.', 'success');
      // On recharge : les filtres et les compteurs doivent redevenir justes.
      setTimeout(() => location.reload(), 700);
    } catch {
      say('Connexion interrompue. Rien n’a été modifié.', 'danger');
    } finally {
      for (const button of buttons) button.disabled = false;
    }
  }

  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-bulk]')) {
    button.addEventListener('click', () => runBulk(button.dataset.bulk!));
  }

  /* ---------- Fenêtres ---------- */

  for (const opener of document.querySelectorAll<HTMLButtonElement>('[data-open]')) {
    opener.addEventListener('click', () => {
      const dialog = document.querySelector<HTMLDialogElement>(
        `[data-modal="${opener.dataset.open}"]`,
      );
      refresh();
      dialog?.showModal();
    });
  }

  for (const closer of document.querySelectorAll<HTMLButtonElement>('[data-close]')) {
    closer.addEventListener('click', () => closer.closest('dialog')?.close());
  }

  // Le suffixe et l'aide suivent le mode choisi.
  const prixMode = document.querySelector<HTMLSelectElement>('[data-prix-mode]');
  const prixSuffix = document.querySelector<HTMLElement>('[data-prix-suffix]');
  const prixHint = document.querySelector<HTMLElement>('[data-prix-hint]');

  prixMode?.addEventListener('change', () => {
    const mode = prixMode.value;
    if (prixSuffix) prixSuffix.textContent = mode === 'percent' ? '%' : 'FCFA';
    if (prixHint) {
      prixHint.textContent =
        mode === 'percent'
          ? 'Un nombre négatif baisse les prix. Exemple : -10 pour une remise de 10 %.'
          : mode === 'amount'
            ? 'Un nombre négatif retire ce montant. Exemple : -500.'
            : mode === 'set'
              ? 'Tous les articles sélectionnés prendront ce prix exact.'
              : 'Exemple : 100 arrondit 12 480 à 12 500.';
    }
  });

  for (const form of document.querySelectorAll<HTMLFormElement>('[data-modal-form]')) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const kind = form.dataset.modalForm!;
      const data = new FormData(form);
      const dialog = form.closest('dialog');

      const payload: Record<string, unknown> =
        kind === 'prix'
          ? { mode: data.get('mode'), value: data.get('value') }
          : kind === 'stock'
            ? { mode: data.get('mode'), value: data.get('value') }
            : { categoryId: data.get('categoryId'), division: data.get('division') };

      dialog?.close();
      runBulk(kind, payload);
    });
  }

  /* ---------- Édition directe ---------- */

  const cells = [...document.querySelectorAll<HTMLInputElement>('[data-edit]')];

  /** « 12 500 » → « 12500 », pour comparer deux saisies. */
  const compact = (value: string) => value.replace(/[\s  ]/g, '');

  async function save(input: HTMLInputElement): Promise<void> {
    const cell = input.closest('td');
    const row = input.closest('tr');
    const id = row?.dataset.id;
    const field = input.dataset.edit;
    if (!id || !field) return;

    const original = input.dataset.original ?? '';
    if (compact(input.value) === compact(original)) return;

    cell?.classList.add('is-dirty');
    cell?.classList.remove('is-saved');

    try {
      const response = await fetch('/api/admin/produits/inline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, field, value: input.value }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
        product?: { price: number; stock: number };
      };

      if (!data.ok) {
        say(data.error ?? 'Enregistrement impossible.', 'danger');
        input.value = original;
        cell?.classList.remove('is-dirty');
        return;
      }

      // Réafficher la valeur telle que le serveur l'a comprise.
      const clean =
        field === 'price' && data.product
          ? data.product.price > 0
            ? data.product.price.toLocaleString('fr-FR').replace(/ /g, ' ')
            : ''
          : field === 'stock' && data.product
            ? String(data.product.stock)
            : input.value.trim();

      input.value = clean;
      input.dataset.original = clean;

      cell?.classList.remove('is-dirty');
      cell?.classList.add('is-saved');
      setTimeout(() => cell?.classList.remove('is-saved'), 1800);
    } catch {
      say('Connexion interrompue. La modification n’a pas été enregistrée.', 'danger');
      input.value = original;
      cell?.classList.remove('is-dirty');
    }
  }

  cells.forEach((input, index) => {
    input.addEventListener('blur', () => void save(input));

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        void save(input);
        // Descendre d'une ligne, dans la même colonne.
        const next = cells.find(
          (candidate, i) => i > index && candidate.dataset.edit === input.dataset.edit,
        );
        next?.focus();
        next?.select();
      }
      if (event.key === 'Escape') {
        input.value = input.dataset.original ?? '';
        input.blur();
      }
    });

    input.addEventListener('focus', () => input.select());
  });

  /* ---------- Nombre par page ---------- */

  document.querySelector<HTMLSelectElement>('[data-perpage]')?.addEventListener('change', (event) => {
    const url = new URL(location.href);
    url.searchParams.set('par', (event.target as HTMLSelectElement).value);
    url.searchParams.delete('page');
    location.href = url.toString();
  });

  /* ---------- Raccourcis ---------- */

  document.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement;
    const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);

    // « / » met le curseur dans la recherche.
    if (event.key === '/' && !typing) {
      event.preventDefault();
      document.querySelector<HTMLInputElement>('.filters__search input')?.focus();
    }
    // Échap vide la sélection.
    if (event.key === 'Escape' && !typing && selectionSize() > 0) clearSelection();
  });

  refresh();
}
