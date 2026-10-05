(function () {
  "use strict";

  const STORAGE_KEY = "financas-icaro-v1";
  const CATEGORIES = [
    { id: "alimentacao", label: "Alimentação", emoji: "🍽️" },
    { id: "transporte", label: "Transporte", emoji: "🚌" },
    { id: "moradia", label: "Moradia", emoji: "🏠" },
    { id: "lazer", label: "Lazer", emoji: "🎮" },
    { id: "saude", label: "Saúde", emoji: "💊" },
    { id: "assinaturas", label: "Assinaturas", emoji: "📺" },
    { id: "outros", label: "Outros", emoji: "📦" },
  ];

  const moneyFmt = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const dateFmt = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  function uid() {
    return (
      Date.now().toString(36) +
      Math.random().toString(36).slice(2, 8)
    );
  }

  function todayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function monthKey(isoDate) {
    return isoDate.slice(0, 7);
  }

  function currentMonthInput() {
    return todayISO().slice(0, 7);
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { despesas: [], recorrentes: [] };
      const data = JSON.parse(raw);
      return {
        despesas: Array.isArray(data.despesas) ? data.despesas : [],
        recorrentes: Array.isArray(data.recorrentes) ? data.recorrentes : [],
      };
    } catch {
      return { despesas: [], recorrentes: [] };
    }
  }

  function save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  let state = load();

  function catById(id) {
    return CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
  }

  function formatMoney(n) {
    return moneyFmt.format(Number(n) || 0);
  }

  function toast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      el.hidden = true;
    }, 2200);
  }

  function fillCategorySelects() {
    const opts = CATEGORIES.map(
      (c) => `<option value="${c.id}">${c.emoji} ${c.label}</option>`
    ).join("");
    document.getElementById("despesa-categoria").innerHTML = opts;
    document.getElementById("rec-categoria").innerHTML = opts;
  }

  /* ---------- Navigation ---------- */
  function showView(name) {
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
    const view = document.getElementById("view-" + name);
    if (view) view.classList.add("active");
    const btn = document.querySelector(`.nav-btn[data-view="${name}"]`);
    if (btn) btn.classList.add("active");
    render();
  }

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => showView(btn.dataset.view));
  });

  document.querySelectorAll("[data-goto]").forEach((btn) => {
    btn.addEventListener("click", () => showView(btn.dataset.goto));
  });

  /* ---------- Totals helpers ---------- */
  function despesasDoDia(iso) {
    return state.despesas.filter((d) => d.data === iso);
  }

  function despesasDoMes(ym) {
    return state.despesas.filter((d) => monthKey(d.data) === ym);
  }

  function sum(items) {
    return items.reduce((acc, i) => acc + (Number(i.valor) || 0), 0);
  }

  function sumRecorrentes() {
    return sum(state.recorrentes);
  }

  function byCategory(items) {
    const map = {};
    CATEGORIES.forEach((c) => {
      map[c.id] = 0;
    });
    items.forEach((i) => {
      const key = map[i.categoria] !== undefined ? i.categoria : "outros";
      map[key] += Number(i.valor) || 0;
    });
    return map;
  }

  /* ---------- Render ---------- */
  function renderEmpty(text) {
    return `<div class="empty">${text}</div>`;
  }

  function renderCatBars(map, container) {
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    const rows = CATEGORIES.filter((c) => map[c.id] > 0)
      .sort((a, b) => map[b.id] - map[a.id])
      .map((c) => {
        const pct = total > 0 ? (map[c.id] / total) * 100 : 0;
        return `
          <div class="cat-row">
            <div class="cat-name">${c.emoji} ${c.label}</div>
            <div class="cat-amt">${formatMoney(map[c.id])}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
          </div>`;
      })
      .join("");
    container.innerHTML = rows || renderEmpty("Nenhum gasto neste período.");
  }

  function renderDespesaItem(d) {
    const cat = catById(d.categoria);
    const nota = d.nota ? ` · ${escapeHtml(d.nota)}` : "";
    return `
      <article class="item" data-id="${d.id}">
        <div class="item-title">${cat.emoji} ${escapeHtml(cat.label)}</div>
        <div class="item-amount">${formatMoney(d.valor)}</div>
        <div class="item-meta">${dateFmt.format(parseISO(d.data))}${nota}</div>
        <div class="item-actions">
          <button type="button" class="icon-btn" data-edit-despesa="${d.id}" aria-label="Editar">✏️</button>
          <button type="button" class="icon-btn danger" data-del-despesa="${d.id}" aria-label="Excluir">🗑️</button>
        </div>
      </article>`;
  }

  function renderRecItem(r) {
    const cat = catById(r.categoria);
    return `
      <article class="item" data-id="${r.id}">
        <div class="item-title">${escapeHtml(r.nome)}</div>
        <div class="item-amount">${formatMoney(r.valor)}</div>
        <div class="item-meta">${cat.emoji} ${escapeHtml(cat.label)} · dia ${r.dia}</div>
        <div class="item-actions">
          <button type="button" class="icon-btn" data-edit-rec="${r.id}" aria-label="Editar">✏️</button>
          <button type="button" class="icon-btn danger" data-del-rec="${r.id}" aria-label="Excluir">🗑️</button>
        </div>
      </article>`;
  }

  function parseISO(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, """);
  }

  function renderDashboard() {
    const hoje = todayISO();
    const ym = currentMonthInput();
    document.getElementById("total-hoje").textContent = formatMoney(
      sum(despesasDoDia(hoje))
    );
    document.getElementById("total-mes").textContent = formatMoney(
      sum(despesasDoMes(ym))
    );
    document.getElementById("total-rec").textContent = formatMoney(sumRecorrentes());

    renderCatBars(byCategory(despesasDoMes(ym)), document.getElementById("cat-summary"));

    const recent = [...state.despesas]
      .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0))
      .slice(0, 5);
    const list = document.getElementById("recent-list");
    list.innerHTML = recent.length
      ? recent.map(renderDespesaItem).join("")
      : renderEmpty("Nenhuma despesa ainda. Toque em Despesas para adicionar.");
  }

  function renderDespesas() {
    const input = document.getElementById("filtro-mes");
    if (!input.value) input.value = currentMonthInput();
    const ym = input.value;
    const items = despesasDoMes(ym).sort((a, b) =>
      a.data < b.data ? 1 : a.data > b.data ? -1 : 0
    );
    document.getElementById("mes-total-badge").textContent = formatMoney(sum(items));
    renderCatBars(byCategory(items), document.getElementById("mes-cat-bars"));
    const list = document.getElementById("despesa-list");
    list.innerHTML = items.length
      ? items.map(renderDespesaItem).join("")
      : renderEmpty("Nenhuma despesa neste mês.");
  }

  function renderRecorrentes() {
    const items = [...state.recorrentes].sort((a, b) => a.dia - b.dia);
    const list = document.getElementById("rec-list");
    list.innerHTML = items.length
      ? items.map(renderRecItem).join("")
      : renderEmpty("Nenhum gasto recorrente. Adicione assinaturas e contas fixas.");
  }

  function render() {
    const active = document.querySelector(".view.active");
    if (!active) return;
    if (active.id === "view-dashboard") renderDashboard();
    else if (active.id === "view-despesas") renderDespesas();
    else if (active.id === "view-recorrentes") renderRecorrentes();
  }

  /* ---------- Despesa modal ---------- */
  const modalDespesa = document.getElementById("modal-despesa");
  const formDespesa = document.getElementById("form-despesa");

  function openDespesa(edit) {
    document.getElementById("modal-despesa-title").textContent = edit
      ? "Editar despesa"
      : "Nova despesa";
    document.getElementById("despesa-id").value = edit ? edit.id : "";
    document.getElementById("despesa-valor").value = edit ? edit.valor : "";
    document.getElementById("despesa-categoria").value = edit
      ? edit.categoria
      : "alimentacao";
    document.getElementById("despesa-data").value = edit ? edit.data : todayISO();
    document.getElementById("despesa-nota").value = edit ? edit.nota || "" : "";
    modalDespesa.showModal();
    setTimeout(() => document.getElementById("despesa-valor").focus(), 50);
  }

  document.getElementById("btn-nova-despesa").addEventListener("click", () =>
    openDespesa(null)
  );
  document.getElementById("despesa-cancel").addEventListener("click", () =>
    modalDespesa.close()
  );

  formDespesa.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("despesa-id").value;
    const valor = parseFloat(document.getElementById("despesa-valor").value);
    const categoria = document.getElementById("despesa-categoria").value;
    const data = document.getElementById("despesa-data").value;
    const nota = document.getElementById("despesa-nota").value.trim();
    if (!valor || valor <= 0 || !data) return;

    if (id) {
      const idx = state.despesas.findIndex((d) => d.id === id);
      if (idx >= 0) {
        state.despesas[idx] = { ...state.despesas[idx], valor, categoria, data, nota };
      }
      toast("Despesa atualizada");
    } else {
      state.despesas.push({ id: uid(), valor, categoria, data, nota });
      toast("Despesa adicionada");
    }
    save(state);
    modalDespesa.close();
    render();
  });

  /* ---------- Recorrente modal ---------- */
  const modalRec = document.getElementById("modal-rec");
  const formRec = document.getElementById("form-rec");

  function openRec(edit) {
    document.getElementById("modal-rec-title").textContent = edit
      ? "Editar recorrente"
      : "Novo recorrente";
    document.getElementById("rec-id").value = edit ? edit.id : "";
    document.getElementById("rec-nome").value = edit ? edit.nome : "";
    document.getElementById("rec-valor").value = edit ? edit.valor : "";
    document.getElementById("rec-dia").value = edit ? edit.dia : 1;
    document.getElementById("rec-categoria").value = edit
      ? edit.categoria
      : "assinaturas";
    modalRec.showModal();
    setTimeout(() => document.getElementById("rec-nome").focus(), 50);
  }

  document.getElementById("btn-nova-rec").addEventListener("click", () =>
    openRec(null)
  );
  document.getElementById("rec-cancel").addEventListener("click", () =>
    modalRec.close()
  );

  formRec.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("rec-id").value;
    const nome = document.getElementById("rec-nome").value.trim();
    const valor = parseFloat(document.getElementById("rec-valor").value);
    const dia = parseInt(document.getElementById("rec-dia").value, 10);
    const categoria = document.getElementById("rec-categoria").value;
    if (!nome || !valor || valor <= 0 || !dia || dia < 1 || dia > 31) return;

    if (id) {
      const idx = state.recorrentes.findIndex((r) => r.id === id);
      if (idx >= 0) {
        state.recorrentes[idx] = {
          ...state.recorrentes[idx],
          nome,
          valor,
          dia,
          categoria,
        };
      }
      toast("Recorrente atualizado");
    } else {
      state.recorrentes.push({ id: uid(), nome, valor, dia, categoria });
      toast("Recorrente adicionado");
    }
    save(state);
    modalRec.close();
    render();
  });

  /* ---------- List actions (event delegation) ---------- */
  document.getElementById("app").addEventListener("click", (e) => {
    const editD = e.target.closest("[data-edit-despesa]");
    const delD = e.target.closest("[data-del-despesa]");
    const editR = e.target.closest("[data-edit-rec]");
    const delR = e.target.closest("[data-del-rec]");

    if (editD) {
      const item = state.despesas.find((d) => d.id === editD.dataset.editDespesa);
      if (item) openDespesa(item);
      return;
    }
    if (delD) {
      if (!confirm("Excluir esta despesa?")) return;
      state.despesas = state.despesas.filter(
        (d) => d.id !== delD.dataset.delDespesa
      );
      save(state);
      toast("Despesa excluída");
      render();
      return;
    }
    if (editR) {
      const item = state.recorrentes.find((r) => r.id === editR.dataset.editRec);
      if (item) openRec(item);
      return;
    }
    if (delR) {
      if (!confirm("Excluir este recorrente?")) return;
      state.recorrentes = state.recorrentes.filter(
        (r) => r.id !== delR.dataset.delRec
      );
      save(state);
      toast("Recorrente excluído");
      render();
    }
  });

  document.getElementById("filtro-mes").addEventListener("change", renderDespesas);

  /* ---------- Backup ---------- */
  document.getElementById("btn-export").addEventListener("click", () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      owner: "Icaro Evaristo",
      despesas: state.despesas,
      recorrentes: state.recorrentes,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    const stamp = todayISO();
    a.href = URL.createObjectURL(blob);
    a.download = `financas-backup-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Backup exportado");
  });

  document.getElementById("btn-import").addEventListener("click", () => {
    document.getElementById("import-file").click();
  });

  document.getElementById("import-file").addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || !Array.isArray(data.despesas) || !Array.isArray(data.recorrentes)) {
          throw new Error("Formato inválido");
        }
        if (
          !confirm(
            `Importar backup?\n${data.despesas.length} despesas e ${data.recorrentes.length} recorrentes.\nIsso substitui os dados atuais.`
          )
        ) {
          return;
        }
        state = {
          despesas: data.despesas,
          recorrentes: data.recorrentes,
        };
        save(state);
        toast("Backup importado");
        render();
      } catch {
        alert("Arquivo JSON inválido. Use um backup exportado por este app.");
      }
    };
    reader.readAsText(file);
  });

  document.getElementById("btn-clear").addEventListener("click", () => {
    if (
      !confirm(
        "Apagar TODOS os dados deste navegador? Esta ação não pode ser desfeita."
      )
    ) {
      return;
    }
    state = { despesas: [], recorrentes: [] };
    save(state);
    toast("Dados limpos");
    render();
  });

  /* ---------- PWA service worker ---------- */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }

  /* ---------- Init ---------- */
  fillCategorySelects();
  document.getElementById("filtro-mes").value = currentMonthInput();
  render();
})();
