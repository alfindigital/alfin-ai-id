// Tombol "bayar" -> POST /api/buy/:slug -> redirect ke checkout AutoPay.
(() => {
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
      if (r.ok && d.checkout_url) {
        b.textContent = "menuju pembayaran…";
        location.assign(d.checkout_url);
        setTimeout(() => { busy.delete(b); }, 8000); // safety re-arm bila navigasi batal
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
})();
