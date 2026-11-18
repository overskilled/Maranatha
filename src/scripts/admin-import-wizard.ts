/* ============================================================
   Correspondance, aperçu, application.
   L'aperçu se recalcule à chaque changement : elle voit tout de
   suite l'effet d'un réglage, avant que rien ne soit écrit.
   ============================================================ */

declare global {
  interface Window {
    toast?: (message: string, kind?: 'info' | 'success' | 'danger', ms?: number) => void;
  }
}

type Issue = { level: 'error' | 'warning'; message: string };

type PreviewRow = {
  line: number;
  action: 'create' | 'update' | 'skip' | 'error';
  sku: string;
  name: string | null;
  price: number | null;
  stock: number | null;
  category: string | null;
  issues: Issue[];
};

type Summary = {
  total: number;
  create: number;
  update: number;
  skip: number;
  error: number;
  warnings: number;
  newCategories: string[];
  missingName: boolean;
};

const root = document.querySelector<HTMLElement>('[data-import]');

if (root) {
  const jobId = root.dataset.id!;

  const previewBody = document.querySelector<HTMLElement>('[data-preview-body]');
  const applyButton = document.querySelector<HTMLButtonElement>('[data-apply]');
  const applyText = document.querySelector<HTMLElement>('[data-apply-text]');
  const progress = document.querySelector<HTMLElement>('[data-progress]');
  const progressBar = document.querySelector<HTMLElement>('[data-progress-bar]');
  const progressText = document.querySelector<HTMLElement>('[data-progress-text]');
  const resultBox = document.querySelector<HTMLElement>('[data-result]');

  const fr = (n: number) => n.toLocaleString('fr-FR');

  /* ---------- Lecture de l'écran ---------- */

  function currentMapping(): Record<string, string> {
    const mapping: Record<string, string> = {};
    for (const select of document.querySelectorAll<HTMLSelectElement>('[data-map]')) {
      mapping[select.dataset.map!] = select.value;
    }
    return mapping;
  }

  function currentOptions(): Record<string, unknown> {
    const options: Record<string, unknown> = {};
    for (const el of document.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-opt]')) {
      const key = el.dataset.opt!;
      options[key] =
        el instanceof HTMLInputElement && el.type === 'checkbox' ? el.checked : el.value;
    }
    return options;
  }

  /** Deux colonnes sur le même champ : on prévient avant l'aperçu. */
  function duplicateField(): string | null {
    const seen = new Map<string, string>();
    for (const select of document.querySelectorAll<HTMLSelectElement>('[data-map]')) {
      if (!select.value) continue;
      const already = seen.get(select.value);
      if (already) {
        const label = select.selectedOptions[0]?.textContent?.trim() ?? select.value;
        return `Les colonnes « ${already} » et « ${select.dataset.map} » visent toutes les deux le champ ${label}. Une seule sera utilisée.`;
      }
      seen.set(select.value, select.dataset.map!);
    }
    return null;
  }

  /* ---------- Aperçu ---------- */

  let previewToken = 0;

  async function loadPreview(): Promise<void> {
    const token = ++previewToken;

    if (previewBody) {
      previewBody.innerHTML =
        '<p style="margin:0;font-size:0.875rem;color:var(--a-ink-muted)">Calcul en cours…</p>';
    }
    if (applyButton) applyButton.disabled = true;

    try {
      const response = await fetch('/api/admin/import/apercu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: jobId, mapping: currentMapping(), options: currentOptions() }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
        summary?: Summary;
        rows?: PreviewRow[];
        notes?: string[];
      };

      // Un calcul plus récent est déjà parti : on abandonne celui-ci.
      if (token !== previewToken) return;

      if (!data.ok || !data.summary) {
        if (previewBody) {
          previewBody.innerHTML = '';
          previewBody.append(note('danger', data.error ?? 'Aperçu impossible.'));
        }
        return;
      }

      render(data.summary, data.rows ?? [], data.notes ?? []);
    } catch {
      if (token !== previewToken) return;
      if (previewBody) {
        previewBody.innerHTML = '';
        previewBody.append(note('danger', 'Connexion interrompue pendant le calcul.'));
      }
    }
  }

  function note(kind: string, text: string): HTMLElement {
    const el = document.createElement('div');
    el.className = `note note--${kind}`;
    const p = document.createElement('p');
    p.textContent = text;
    el.append(p);
    return el;
  }

  function render(summary: Summary, rows: PreviewRow[], notes: string[]): void {
    if (!previewBody) return;
    previewBody.innerHTML = '';

    /* Résumé chiffré */
    const tiles = document.createElement('div');
    tiles.className = 'grid grid--kpi';
    tiles.style.marginBottom = '1.125rem';

    const cells: { label: string; value: number; tone?: string }[] = [
      { label: 'À créer', value: summary.create },
      { label: 'À mettre à jour', value: summary.update },
      { label: 'Ignorées', value: summary.skip },
      { label: 'En erreur', value: summary.error, tone: summary.error > 0 ? 'danger' : undefined },
    ];

    for (const cell of cells) {
      const tile = document.createElement('div');
      tile.className = 'kpi';
      const label = document.createElement('span');
      label.className = 'kpi__label';
      label.textContent = cell.label;
      const value = document.createElement('span');
      value.className = 'kpi__value';
      value.textContent = fr(cell.value);
      if (cell.tone === 'danger' && cell.value > 0) value.style.color = 'var(--a-danger)';
      tile.append(label, value);
      tiles.append(tile);
    }
    previewBody.append(tiles);

    /* Remarques de lecture du fichier */
    for (const text of notes) previewBody.append(note('info', text));

    if (summary.missingName) {
      previewBody.append(
        note(
          'danger',
          'Aucune colonne n’est associée au champ « Nom de l’article ». Associez-la ci-dessus : sans nom, aucun article ne peut être créé.',
        ),
      );
    }

    const duplicate = duplicateField();
    if (duplicate) previewBody.append(note('warning', duplicate));

    if (summary.newCategories.length) {
      previewBody.append(
        note(
          'info',
          `${summary.newCategories.length} rayon(s) seront créés : ${summary.newCategories.slice(0, 8).join(', ')}${summary.newCategories.length > 8 ? '…' : ''}`,
        ),
      );
    }

    /* Lignes, les problèmes d'abord */
    if (rows.length) {
      const wrap = document.createElement('div');
      wrap.className = 'table-wrap';
      wrap.style.marginTop = '1rem';

      const table = document.createElement('table');
      table.className = 'data';
      table.innerHTML = `
        <thead>
          <tr>
            <th class="num" style="width:4rem">Ligne</th>
            <th>Article</th>
            <th class="num">Prix</th>
            <th class="num">Stock</th>
            <th>Action</th>
            <th>Observations</th>
          </tr>
        </thead>`;

      const tbody = document.createElement('tbody');

      const actionLabel: Record<string, string> = {
        create: 'Création',
        update: 'Mise à jour',
        skip: 'Ignorée',
        error: 'Erreur',
      };
      const actionTag: Record<string, string> = {
        create: 'published',
        update: 'confirmee',
        skip: 'archived',
        error: 'annulee',
      };

      for (const row of rows) {
        const tr = document.createElement('tr');

        const line = document.createElement('td');
        line.className = 'num';
        line.style.color = 'var(--a-ink-faint)';
        line.textContent = String(row.line);

        const name = document.createElement('td');
        const nameStrong = document.createElement('span');
        nameStrong.style.fontWeight = '500';
        nameStrong.textContent = row.name ?? '—';
        const sku = document.createElement('span');
        sku.className = 'cell-main__meta';
        sku.style.display = 'block';
        sku.textContent = [row.sku, row.category].filter(Boolean).join(' · ');
        name.append(nameStrong, sku);

        const price = document.createElement('td');
        price.className = 'num money';
        price.textContent = row.price === null ? '—' : fr(row.price);

        const stock = document.createElement('td');
        stock.className = 'num money';
        stock.textContent = row.stock === null ? '—' : fr(row.stock);

        const action = document.createElement('td');
        const tag = document.createElement('span');
        tag.className = `tag tag--${actionTag[row.action]}`;
        tag.textContent = actionLabel[row.action];
        action.append(tag);

        const issues = document.createElement('td');
        issues.style.fontSize = '0.8125rem';
        if (row.issues.length === 0) {
          issues.style.color = 'var(--a-ink-faint)';
          issues.textContent = '—';
        } else {
          for (const issue of row.issues) {
            const p = document.createElement('p');
            p.style.margin = '0';
            p.style.color = issue.level === 'error' ? 'var(--a-danger)' : 'var(--a-warning)';
            p.textContent = issue.message;
            issues.append(p);
          }
        }

        tr.append(line, name, price, stock, action, issues);
        tbody.append(tr);
      }

      table.append(tbody);
      wrap.append(table);
      previewBody.append(wrap);

      if (summary.total > rows.length) {
        const more = document.createElement('p');
        more.style.cssText =
          'margin:0.75rem 0 0;font-size:0.8125rem;color:var(--a-ink-muted);text-align:center';
        more.textContent = `${fr(rows.length)} lignes affichées sur ${fr(summary.total)}. Les lignes à problème sont montrées en premier.`;
        previewBody.append(more);
      }
    }

    /* Bouton d'application */
    const writable = summary.create + summary.update;
    if (applyButton) applyButton.disabled = writable === 0;

    if (applyText) {
      applyText.textContent =
        writable === 0
          ? 'Aucune ligne à écrire. Vérifiez la correspondance des colonnes ci-dessus.'
          : summary.error > 0
            ? `${fr(writable)} ligne(s) seront écrites. Les ${fr(summary.error)} lignes en erreur seront laissées de côté.`
            : `${fr(writable)} ligne(s) seront écrites. Aucune erreur détectée.`;
    }
  }

  /* ---------- Application ---------- */

  async function apply(): Promise<void> {
    if (!confirm('Appliquer cet import au catalogue ?')) return;

    if (applyButton) applyButton.disabled = true;
    if (progress) progress.style.display = 'block';
    if (progressText) progressText.textContent = 'Démarrage…';

    try {
      const response = await fetch('/api/admin/import/lancer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: jobId }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };

      if (!data.ok) {
        window.toast?.(data.error ?? 'Lancement impossible.', 'danger');
        if (applyButton) applyButton.disabled = false;
        if (progress) progress.style.display = 'none';
        return;
      }

      watch();
    } catch {
      window.toast?.('Connexion interrompue.', 'danger');
      if (applyButton) applyButton.disabled = false;
    }
  }

  /** Suit l'avancement jusqu'à la fin. */
  function watch(): void {
    const timer = setInterval(async () => {
      try {
        const response = await fetch(`/api/admin/import/etat?id=${jobId}`);
        const state = (await response.json()) as {
          ok: boolean;
          status: string;
          percent: number;
          processedRows: number;
          totalRows: number;
          createdCount: number;
          updatedCount: number;
          skippedCount: number;
          errorCount: number;
          message: string | null;
          done: boolean;
        };

        if (!state.ok) return;

        if (progressBar) progressBar.style.width = `${Math.max(3, state.percent)}%`;
        if (progressText) {
          progressText.textContent =
            `${fr(state.processedRows)} / ${fr(state.totalRows)} lignes · ` +
            `${fr(state.createdCount)} créés · ${fr(state.updatedCount)} mis à jour`;
        }

        if (!state.done) return;

        clearInterval(timer);

        const failed = state.status === 'echoue';
        if (progressBar) {
          progressBar.classList.add(failed ? 'bar__fill--danger' : 'bar__fill--success');
          progressBar.style.width = '100%';
        }

        if (resultBox) {
          resultBox.style.display = 'block';
          resultBox.innerHTML = '';

          const box = document.createElement('div');
          box.className = `note note--${failed ? 'danger' : 'success'}`;
          box.setAttribute('role', 'status');

          const p = document.createElement('p');
          const strong = document.createElement('strong');
          strong.textContent = failed ? 'L’import s’est arrêté. ' : 'Import terminé. ';
          p.append(strong, document.createTextNode(state.message ?? ''));
          box.append(p);

          if (!failed) {
            const hint = document.createElement('p');
            hint.textContent =
              'Les articles créés sont en brouillon si vous avez gardé ce réglage : relisez-les, puis publiez-les tous d’un coup depuis la liste des articles.';
            box.append(hint);
          }

          resultBox.append(box);

          const actions = document.createElement('div');
          actions.className = 'btn-row';
          actions.style.marginTop = '0.875rem';

          const toList = document.createElement('a');
          toList.className = 'btn btn--gold';
          toList.href = '/admin/produits?statut=draft';
          toList.textContent = 'Voir les articles importés';
          actions.append(toList);

          if (state.errorCount > 0) {
            const report = document.createElement('a');
            report.className = 'btn btn--ghost';
            report.href = `/api/admin/import/erreurs?id=${jobId}`;
            report.setAttribute('download', '');
            report.textContent = `Télécharger le rapport (${fr(state.errorCount)} lignes)`;
            actions.append(report);
          }

          const photos = document.createElement('a');
          photos.className = 'btn btn--ghost';
          photos.href = '/admin/photos';
          photos.textContent = 'Ajouter les photos';
          actions.append(photos);

          resultBox.append(actions);
          resultBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } catch {
        /* On retentera au prochain tour. */
      }
    }, 900);
  }

  /* ---------- Branchements ---------- */

  let debounce: number | undefined;
  function schedulePreview(): void {
    window.clearTimeout(debounce);
    debounce = window.setTimeout(() => void loadPreview(), 350);
  }

  for (const select of document.querySelectorAll<HTMLSelectElement>('[data-map]')) {
    select.addEventListener('change', schedulePreview);
  }
  for (const el of document.querySelectorAll<HTMLElement>('[data-opt]')) {
    el.addEventListener('change', schedulePreview);
  }

  document.querySelector('[data-preview]')?.addEventListener('click', () => void loadPreview());
  applyButton?.addEventListener('click', () => void apply());

  /* Appliquer un modèle enregistré */
  document.querySelector<HTMLSelectElement>('[data-profile]')?.addEventListener('change', (event) => {
    const value = (event.target as HTMLSelectElement).value;
    if (!value) return;

    try {
      const saved = JSON.parse(value) as Record<string, string>;
      let applied = 0;
      for (const select of document.querySelectorAll<HTMLSelectElement>('[data-map]')) {
        const field = saved[select.dataset.map!];
        if (field !== undefined) {
          select.value = field;
          applied += 1;
        }
      }
      window.toast?.(
        applied > 0
          ? `Modèle appliqué à ${applied} colonne(s).`
          : 'Ce modèle ne correspond à aucune colonne de ce fichier.',
        applied > 0 ? 'success' : 'danger',
      );
      schedulePreview();
    } catch {
      window.toast?.('Modèle illisible.', 'danger');
    }
  });

  /* Enregistrer la correspondance */
  document.querySelector('[data-save-profile]')?.addEventListener('click', async () => {
    const name = prompt(
      'Nom de ce modèle de fichier\n\nPar exemple le nom du fournisseur, pour le retrouver au prochain envoi.',
    );
    if (!name?.trim()) return;

    // La correspondance en cours doit d'abord être enregistrée côté serveur.
    await loadPreview();

    const response = await fetch('/api/admin/import/profils', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), jobId }),
    });
    const data = (await response.json()) as { ok: boolean; message?: string; error?: string };
    window.toast?.(data.message ?? data.error ?? '', data.ok ? 'success' : 'danger');
  });

  /* Un import déjà lancé : on reprend le suivi. */
  if (root.dataset.running === '1') {
    if (progress) progress.style.display = 'block';
    if (applyButton) applyButton.disabled = true;
    watch();
  } else {
    void loadPreview();
  }
}
