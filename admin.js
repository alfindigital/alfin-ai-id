// Admin panel: login gate -> produk CRUD, orders, entitlements, users.
(() => {
  const $ = (id) => document.getElementById(id);
  const api = (p, method, body) =>
    fetch(p, {
      method: method || "GET",
      headers: body ? { "content-type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    }).then((r) => r.json().catch(() => ({})));
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const rp = (n) => "Rp" + Number(n).toLocaleString("id-ID");
  const msg = (id, t, ok) => { const m = $(id); m.textContent = t; m.className = "msg " + (ok ? "ok" : "err"); };

  async function loadPanel() {
    const [prod, ord, ent, usr] = await Promise.all([
      api("/api/admin/products"),
      api("/api/admin/orders"),
      api("/api/admin/entitlements"),
      api("/api/admin/users"),
    ]);
    if (!prod.ok) { location.reload(); return; }
    renderProducts(prod.products || []);
    renderOrders(ord.orders || []);
    renderEnts(ent.entitlements || []);
    renderUsers(usr.users || []);
    $("g-slug").innerHTML = (prod.products || [])
      .map((p) => `<option value="${esc(p.slug)}">${esc(p.name)}</option>`).join("");
  }

  function renderProducts(list) {
    document.querySelector("#tbl-prod tbody").innerHTML = list
      .map(
        (p) => `<tr data-slug="${esc(p.slug)}">
          <td><b>${esc(p.slug)}</b></td><td>${esc(p.kind)}</td>
          <td><b>${esc(p.name)}</b><br><span class="muted">${esc(p.desc)}</span></td>
          <td>${rp(p.price)}</td><td>${esc(p.billing || "-")}</td><td>${esc(p.access)}</td>
          <td><input type="text" value="${esc(p.category || "")}" data-f="cat" style="width:5rem" placeholder="-"></td>
          <td>${p.url ? `<a href="${esc(p.url)}" style="color:var(--accent);text-decoration:none" rel="noopener">link</a>` : "-"}</td>
          <td><input type="number" value="${p.sort}" data-f="sort" style="width:3.5rem"></td>
          <td><input type="checkbox" ${p.active ? "checked" : ""} data-f="active"></td>
          <td class="act"><button class="btn" data-act="save">ok</button><button class="btn danger" data-act="del">×</button></td>
        </tr>`
      )
      .join("");
  }

  function renderOrders(list) {
    document.querySelector("#tbl-ord tbody").innerHTML = list.length
      ? list.map(
          (o) => `<tr><td>${esc(o.ref_id)}</td><td><b>${esc(o.product_slug)}</b></td><td>${esc(o.email || "-")}</td>
            <td>${rp(o.payable)}</td><td><span class="pill ${esc(o.status)}">${esc(o.status)}</span></td>
            <td>${esc((o.created_at || "").slice(5, 16))}</td><td>${esc((o.paid_at || "-").slice(5, 16))}</td></tr>`
        ).join("")
      : `<tr><td colspan="7" class="muted">belum ada order.</td></tr>`;
  }

  function renderEnts(list) {
    document.querySelector("#tbl-ent tbody").innerHTML = list.length
      ? list.map(
          (e) => `<tr><td>${esc(e.email || "-")}</td><td><b>${esc(e.product_slug)}</b></td>
            <td>${esc(e.ends_at ? e.ends_at.slice(0, 10) : "lifetime")}</td><td>${esc(e.source)}</td><td>${esc(e.ref_id)}</td></tr>`
        ).join("")
      : `<tr><td colspan="5" class="muted">belum ada entitlement.</td></tr>`;
  }

  function renderUsers(list) {
    document.querySelector("#tbl-usr tbody").innerHTML = list.length
      ? list.map(
          (u) => `<tr><td>${esc(u.email)}</td><td>${esc((u.created_at || "").slice(0, 10))}</td><td>${u.grants}</td><td>${u.orders}</td></tr>`
        ).join("")
      : `<tr><td colspan="4" class="muted">belum ada user.</td></tr>`;
  }

  // inline save/delete per row produk
  document.querySelector("#tbl-prod").addEventListener("click", async (e) => {
    const b = e.target.closest("button[data-act]");
    if (!b) return;
    const tr = b.closest("tr");
    const slug = tr.dataset.slug;
    if (b.dataset.act === "del") {
      if (!confirm(`hapus produk "${slug}"?`)) return;
      await api("/api/admin/products/" + slug, "DELETE");
      loadPanel();
      return;
    }
    const p = (await api("/api/admin/products")).products.find((x) => x.slug === slug);
    if (!p) return;
    p.sort = parseInt(tr.querySelector('[data-f="sort"]').value, 10) || 0;
    p.active = tr.querySelector('[data-f="active"]').checked;
    p.category = tr.querySelector('[data-f="cat"]').value.trim();
    await api("/api/admin/products", "POST", p);
    loadPanel();
  });

  $("np-add").addEventListener("click", async () => {
    const d = await api("/api/admin/products", "POST", {
      slug: $("np-slug").value.trim(),
      kind: $("np-kind").value,
      name: $("np-name").value.trim(),
      desc: $("np-desc").value.trim(),
      price: $("np-price").value,
      billing: $("np-billing").value,
      access: $("np-access").value,
      category: $("np-cat").value.trim(),
      url: $("np-url").value.trim(),
      data: $("np-data").value.trim(),
    });
    msg("np-msg", d.ok ? "tersimpan" : d.error || "gagal", d.ok);
    if (d.ok) loadPanel();
  });

  $("form-grant").addEventListener("submit", async (e) => {
    e.preventDefault();
    const d = await api("/api/admin/entitlements", "POST", {
      email: $("g-email").value,
      product_slug: $("g-slug").value,
      ends_at: $("g-ends").value || null,
    });
    msg("g-msg", d.ok ? "granted" : d.error || "gagal", d.ok);
    if (d.ok) loadPanel();
  });

  $("btn-alo").addEventListener("click", async () => {
    await api("/api/admin/logout", "POST", {});
    location.reload();
  });

  $("form-admin").addEventListener("submit", async (e) => {
    e.preventDefault();
    const d = await api("/api/admin/login", "POST", { password: $("a-pass").value });
    if (d.ok) { $("gate").hidden = true; $("panel").hidden = false; loadPanel(); }
    else msg("a-msg", d.error || "gagal", false);
  });

  // boot: coba load panel (cookie admin masih hidup -> langsung masuk)
  api("/api/admin/products").then((d) => {
    if (d.ok) { $("panel").hidden = false; loadPanel(); }
    else $("gate").hidden = false;
  });
})();
