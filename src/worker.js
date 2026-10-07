// alfin-ai-id Worker — static assets + proxy checkout AutoPay.
// /api/buy/:slug (POST) -> bikin invoice QRIS via autopay.web.id -> checkout_url.
// API key merchant hidup di Worker secret AUTOPAY_API_KEY (tidak pernah ke klien).

const PRODUCTS = {
  "boei-help":  { amount: 50000,  label: "boei.help akses 1 tahun" },
  "anychat":    { amount: 50000,  label: "anychat.one akses 1 tahun" },
  "swipepages": { amount: 500000, label: "swipepages lisensi lifetime" },
};

const SITE_HOSTS = new Set(["alfin.ai.id", "www.alfin.ai.id"]);

const HDR = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const j = (status, obj) => new Response(JSON.stringify(obj), { status, headers: HDR });

// Tolak pemakaian cross-origin (hotlink/curl dari situs lain). Origin/Referer
// yang hadir harus host kita; header absen = izinkan (privacy stripper).
function originOk(req) {
  for (const h of ["origin", "referer"]) {
    const v = req.headers.get(h);
    if (!v) continue;
    try {
      if (!SITE_HOSTS.has(new URL(v).host)) return false;
    } catch {
      return false;
    }
  }
  return true;
}

const randHex = (n) =>
  Array.from(crypto.getRandomValues(new Uint8Array(n)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      const m = url.pathname.match(/^\/api\/buy\/([a-z0-9-]{1,32})$/);
      if (!m) return j(404, { ok: false, error: "not found" });
      if (request.method !== "POST") return j(405, { ok: false, error: "method not allowed" });

      const p = PRODUCTS[m[1]];
      if (!p) return j(404, { ok: false, error: "produk tidak dikenal" });
      if (!originOk(request)) return j(403, { ok: false, error: "forbidden" });
      if (!env.AUTOPAY_API_KEY) return j(500, { ok: false, error: "pembayaran belum dikonfigurasi" });

      const base = (env.AUTOPAY_BASE_URL || "https://autopay.web.id").replace(/\/+$/, "");
      const slug = m[1].replace(/-/g, "").toUpperCase().slice(0, 16);
      const ref = `ALFINAI-${slug}-${randHex(4)}`;

      try {
        const r = await fetch(`${base}/api/qris/create`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-api-key": env.AUTOPAY_API_KEY },
          body: JSON.stringify({
            amount: p.amount,
            use_unique_code: true,
            reference_id: ref,
            buyer_info: `${p.label} | alfin.ai.id`.slice(0, 64),
            expires_in_minutes: 1440,
          }),
        });
        const d = await r.json().catch(() => null);
        const checkout = d && d.data && d.data.checkout_url;
        if (!r.ok || !d || d.success !== true || typeof checkout !== "string") {
          return j(502, { ok: false, error: "gateway pembayaran tidak merespons" });
        }
        return j(200, {
          ok: true,
          checkout_url: checkout,
          ref_id: d.data.ref_id || null,
          expires_at: d.data.expires_at || null,
        });
      } catch {
        return j(502, { ok: false, error: "tidak bisa menghubungi gateway pembayaran" });
      }
    }

    // Static assets. not_found_handling "404-page" tidak berlaku lewat
    // binding env.ASSETS.fetch (bisa 1101 di path tak dikenal) — handle sendiri.
    let resp;
    try {
      resp = await env.ASSETS.fetch(request);
    } catch {
      resp = null;
    }
    if (!resp || resp.status === 404) {
      const page = await env.ASSETS.fetch(new URL("/404", request.url));
      return new Response(page.body, {
        status: 404,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    return resp;
  },
};
