// Render grid produk/gear dari /api/products (satu sumber data — selalu sinkron
// di semua halaman) + handler tombol "bayar" (member -> login dulu).
(() => {
  const rp = (n) => "Rp" + Number(n).toLocaleString("id-ID");
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  async function renderGrids() {
    for (const g of document.querySelectorAll("[data-products]")) {
      const kind = g.dataset.products;
      try {
        const r = await fetch("/api/products?kind=" + encodeURIComponent(kind));
        const d = await r.json();
        const items = (d.products || []).map((p) => {
          if (kind === "gear") {
            return `<li><a href="${esc(p.url)}" target="_blank" rel="noopener"><span class="slot"><svg class="ic"><use href="#i-web"/></svg></span><span class="meta"><span class="arr">&#8599;</span></span><span class="main"><span class="name">${esc(p.name)}</span><span class="desc">${esc(p.desc)}</span></span></a></li>`;
          }
          const per = p.billing === "yearly" ? " / tahun" : p.billing === "lifetime" ? " / lifetime" : "";
          const lock = p.access === "member" ? " · <span class=\"lock\">member</span>" : "";
          return `<li class="prod"><span class="name">${esc(p.name)}${lock}</span><span class="desc">${esc(p.desc)}</span><span class="price">${rp(p.price)}${per}</span><button class="buy" type="button" data-buy="${esc(p.slug)}">bayar qris &#8599;</button></li>`;
        });
        g.innerHTML = items.join("") || `<li class="prod"><span class="desc">belum ada item.</span></li>`;
      } catch {
        g.innerHTML = `<li class="prod"><span class="desc">gagal memuat — refresh halaman.</span></li>`;
      }
    }
  }

  const busy = new WeakSet();
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-buy]");
    if (!b || busy.has(b)) return;
    busy.add(b);
    const orig = b.textContent;
    b.disabled = true;
    b.textContent = "membuat invoice…";
    try {
      const r = await fetch("/api/buy/" + encodeURIComponent(b.dataset.buy), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      const d = await r.json().catch(() => ({}));
      if (r.status === 401 && d.need_login) {
        b.textContent = "login dulu…";
        location.assign("/member?next=" + encodeURIComponent(location.pathname + location.hash));
        return;
      }
      if (r.ok && d.checkout_url) {
        b.textContent = "menuju pembayaran…";
        location.assign(d.checkout_url);
        setTimeout(() => busy.delete(b), 8000);
        return;
      }
      throw 0;
    } catch {
      b.classList.add("err");
      b.textContent = "gagal — coba lagi";
      setTimeout(() => {
        b.classList.remove("err");
        b.textContent = orig;
        b.disabled = false;
        busy.delete(b);
      }, 2500);
    }
  });

  renderGrids();
})();
