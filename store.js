// Render product/gear grids from /api/products (single data source — always in
// sync across pages) + "pay" button handler (member -> login first).
(() => {
  const rp = (n) => "Rp" + Number(n).toLocaleString("en-US");
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  async function renderGrids() {
    for (const g of document.querySelectorAll("[data-products]")) {
      const kind = g.dataset.products;
      try {
        const r = await fetch("/api/products?kind=" + encodeURIComponent(kind));
        const d = await r.json();
        const tile = (p) => {
          if (kind === "device") {
            let d = {};
            try { d = JSON.parse(p.data || "{}"); } catch { d = {}; }
            const imgs = (Array.isArray(d.images) ? d.images : []).filter((u) => typeof u === "string" && u);
            const links = d.links && typeof d.links === "object" ? d.links : {};
            const main = links.shopee || links.tokopedia || p.url || "";
            const pic = imgs.length
              ? `<a class="pic" href="${esc(main || imgs[0])}" target="_blank" rel="noopener"><img src="${esc(imgs[0])}" alt="${esc(p.name)}" loading="lazy" decoding="async"></a>`
              : "";
            const thumbs = imgs.length > 1
              ? `<span class="thumbs">${imgs.map((u, i) => `<button class="th${i ? "" : " on"}" type="button" data-swap="${esc(u)}" aria-label="photo ${i + 1}"><img src="${esc(u)}" alt="" loading="lazy" decoding="async"></button>`).join("")}</span>`
              : "";
            const tags = (Array.isArray(d.tags) ? d.tags : []).map((t) => `<i>${esc(t)}</i>`).join("");
            const ctas = [["shopee", "shopee"], ["tokopedia", "tokopedia"]]
              .filter(([k]) => /^https?:\/\//.test(links[k] || ""))
              .map(([k, l]) => `<a class="cta" href="${esc(links[k])}" target="_blank" rel="noopener">${l} &#8599;</a>`).join("");
            return `<li class="dcard">${pic}${thumbs}<span class="main"><span class="name">${esc(p.name)}</span><span class="desc">${esc(p.desc)}</span>${tags ? `<span class="chips">${tags}</span>` : ""}</span><span class="ctas">${ctas}</span></li>`;
          }
          if (kind === "gear") {
            return `<li><a href="${esc(p.url)}" target="_blank" rel="noopener"><span class="slot"><svg class="ic"><use href="#i-web"/></svg></span><span class="meta"><span class="arr">&#8599;</span></span><span class="main"><span class="name">${esc(p.name)}</span><span class="desc">${esc(p.desc)}</span></span></a></li>`;
          }
          const per = p.billing === "yearly" ? " / year" : p.billing === "lifetime" ? " / lifetime" : "";
          const lock = p.access === "member" ? " · <span class=\"lock\">member</span>" : "";
          return `<li class="prod"><span class="name">${esc(p.name)}${lock}</span><span class="desc">${esc(p.desc)}</span><span class="price">${rp(p.price)}${per}</span><button class="buy" type="button" data-buy="${esc(p.slug)}">pay qris &#8599;</button></li>`;
        };
        const prods = d.products || [];
        if ("group" in g.dataset) {
          const groups = new Map();
          for (const p of prods) {
            const c = p.category || "lainnya";
            if (!groups.has(c)) groups.set(c, []);
            groups.get(c).push(p);
          }
          g.innerHTML = [...groups.entries()]
            .map(([c, items]) => `<h3 class="tag">//${esc(c)}</h3><ul class="${kind === "device" ? "devgrid" : "links"}">${items.map(tile).join("")}</ul>`)
            .join("") || `<p class="note">no items yet.</p>`;
        } else {
          g.innerHTML = prods.map(tile).join("") || `<li class="prod"><span class="desc">no items yet.</span></li>`;
        }
      } catch {
        g.innerHTML = "group" in g.dataset
          ? `<p class="note">failed to load — refresh the page.</p>`
          : `<li class="prod"><span class="desc">failed to load — refresh the page.</span></li>`;
      }
    }
  }

  const busy = new WeakSet();
  document.addEventListener("click", async (e) => {
    const sw = e.target.closest("[data-swap]");
    if (sw) {
      const card = sw.closest(".dcard");
      const img = card && card.querySelector(".pic img");
      if (img) img.src = sw.dataset.swap;
      if (card) card.querySelectorAll(".th").forEach((b2) => b2.classList.toggle("on", b2 === sw));
      return;
    }
    const b = e.target.closest("[data-buy]");
    if (!b || busy.has(b)) return;
    busy.add(b);
    const orig = b.textContent;
    b.disabled = true;
    b.textContent = "creating invoice…";
    try {
      const r = await fetch("/api/buy/" + encodeURIComponent(b.dataset.buy), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      const d = await r.json().catch(() => ({}));
      if (r.status === 401 && d.need_login) {
        b.textContent = "login first…";
        location.assign("/member?next=" + encodeURIComponent(location.pathname + location.hash));
        return;
      }
      if (r.ok && d.checkout_url) {
        b.textContent = "redirecting to checkout…";
        location.assign(d.checkout_url);
        setTimeout(() => busy.delete(b), 8000);
        return;
      }
      throw 0;
    } catch {
      b.classList.add("err");
      b.textContent = "failed — try again";
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
