// Member area: masuk/daftar -> dashboard produk + order.
(() => {
  const $ = (id) => document.getElementById(id);
  const api = (p, method, body) =>
    fetch(p, {
      method: method || "GET",
      headers: body ? { "content-type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    }).then((r) => r.json().catch(() => ({})));
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (iso) => (iso ? String(iso).slice(0, 10) : "lifetime");
  const rp = (n) => "Rp" + Number(n).toLocaleString("id-ID");
  const next = new URLSearchParams(location.search).get("next") || "";

  function setMsg(id, txt, ok) {
    const m = $(id);
    m.textContent = txt;
    m.className = "msg " + (ok ? "ok" : "err");
  }

  async function showDash() {
    const [me, ent, ord] = await Promise.all([
      api("/api/auth/me"),
      api("/api/member/entitlements"),
      api("/api/member/orders"),
    ]);
    if (!me.ok) return false;
    $("auth-box").hidden = true;
    $("dash").hidden = false;
    $("me-email").textContent = me.user.email;

    const et = ent.entitlements || [];
    $("ent-empty").hidden = et.length > 0;
    $("tbl-ent").hidden = et.length === 0;
    document.querySelector("#tbl-ent tbody").innerHTML = et
      .map(
        (e) =>
          `<tr><td><b>${esc(e.name || e.product_slug)}</b></td><td>s/d ${esc(fmt(e.ends_at))}</td><td>${esc(e.source)}</td></tr>`
      )
      .join("");

    const os = ord.orders || [];
    $("ord-empty").hidden = os.length > 0;
    $("tbl-ord").hidden = os.length === 0;
    document.querySelector("#tbl-ord tbody").innerHTML = os
      .map(
        (o) =>
          `<tr><td>${esc(o.ref_id)}</td><td><b>${esc(o.name || o.product_slug)}</b></td><td>${rp(o.payable)}</td>` +
          `<td><span class="pill ${o.status === "paid" ? "paid" : "pending"}">${esc(o.status)}</span></td>` +
          `<td>${o.status === "pending" ? `<a href="${esc(o.checkout_url)}" rel="noopener">bayar ↗</a>` : ""}</td></tr>`
      )
      .join("");
    return true;
  }

  async function submit(formId, msgId, path, getBody) {
    const form = $(formId);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = form.querySelector("button[type=submit]");
      btn.disabled = true;
      try {
        const d = await api(path, "POST", getBody());
        if (d.ok) {
          setMsg(msgId, "ok — memuat akun…", true);
          if (next) location.assign(next);
          else showDash();
        } else setMsg(msgId, d.error || "gagal", false);
      } catch {
        setMsg(msgId, "tidak bisa terhubung", false);
      }
      btn.disabled = false;
    });
  }

  submit("form-login", "l-msg", "/api/auth/login", () => ({
    email: $("l-email").value,
    password: $("l-pass").value,
  }));
  submit("form-register", "r-msg", "/api/auth/register", () => ({
    email: $("r-email").value,
    password: $("r-pass").value,
  }));

  $("btn-logout").addEventListener("click", async () => {
    await api("/api/auth/logout", "POST", {});
    location.assign("/member");
  });

  api("/api/auth/me").then((d) => {
    $("auth-box").hidden = d.ok;
    if (d.ok) showDash();
  });
})();
