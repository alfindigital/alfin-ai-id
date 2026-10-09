// alfin-ai-id Worker — static assets + mini store.
// Public:  GET /api/products, POST /api/buy/:slug, POST /api/webhook/autopay
// Member:  /api/auth/*, /api/member/*
// Admin:   /api/admin/* (cookie alfin_adm; password = secret ADMIN_PASSWORD)
// Data:    D1 binding DB (schema.sql). Secrets: AUTOPAY_API_KEY, ADMIN_PASSWORD.

const SITE_HOSTS = new Set(["alfin.ai.id", "www.alfin.ai.id"]);
const AUTOPAY_BASE_DEFAULT = "https://autopay.web.id";
const WEBHOOK_PATH = "/api/webhook/autopay";

const HDR = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const j = (status, obj) => new Response(JSON.stringify(obj), { status, headers: HDR });

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const randHex = (n) => hex(crypto.getRandomValues(new Uint8Array(n)).buffer).toUpperCase();

// ── helpers ────────────────────────────────────────────────────────────────

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

// Mutasi wajib JSON body — form-CSRF tak bisa mengatur content-type ini.
const isJson = (req) => (req.headers.get("content-type") || "").includes("application/json");

function cookieGet(req, name) {
  const m = (req.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${name}=([A-Za-z0-9_-]+)`));
  return m ? m[1] : null;
}
const cookieSet = (name, val, maxAge) =>
  `${name}=${val}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
const cookieDel = (name) => `${name}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;

async function pbkdf2(password, saltHex, iters = 100000) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const salt = new Uint8Array(saltHex.match(/.{2}/g).map((h) => parseInt(h, 16)));
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: iters }, key, 256);
  return hex(bits);
}
async function hmacHex(keyStr, msg) {
  const k = await crypto.subtle.importKey("raw", enc.encode(keyStr), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", k, enc.encode(msg)));
}
const timingEq = (a, b) => {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};

async function sessionOf(env, token, admin) {
  if (!token) return null;
  const s = await env.DB.prepare("SELECT token,user_id,admin,expires_at FROM sessions WHERE token=?")
    .bind(token).first();
  if (!s || new Date(s.expires_at.replace(" ", "T") + "Z") < new Date() || Boolean(s.admin) !== admin) return null;
  return s;
}
const userOf = async (env, req) => sessionOf(env, cookieGet(req, "alfin_sid"), false);
const adminOf = async (env, req) => sessionOf(env, cookieGet(req, "alfin_adm"), true);

const makeSession = (env, { user_id = null, admin = 0, days }) =>
  env.DB.prepare("INSERT INTO sessions (token,user_id,admin,expires_at) VALUES (?,?,?,datetime('now',?))")
    .bind(randHex(16), user_id, admin, `+${days} days`).run();

const jsonBody = async (req) => { try { return await req.json(); } catch { return null; } };

// ── API handlers ───────────────────────────────────────────────────────────

async function productsList(env, url) {
  const kind = url.searchParams.get("kind") || "paid";
  const { results } = await env.DB.prepare(
    "SELECT slug,kind,name,\"desc\",price,billing,access,url,category,data,sort FROM products WHERE active=1 AND kind=? ORDER BY sort,slug"
  ).bind(kind).all();
  return j(200, { ok: true, products: results || [] });
}

async function buy(request, env, slug) {
  const product = await env.DB.prepare("SELECT * FROM products WHERE slug=? AND kind='paid' AND active=1").bind(slug).first();
  if (!product) return j(404, { ok: false, error: "produk tidak dikenal" });
  if (!originOk(request)) return j(403, { ok: false, error: "forbidden" });
  if (!env.AUTOPAY_API_KEY) return j(500, { ok: false, error: "pembayaran belum dikonfigurasi" });

  const sess = await userOf(env, request);
  if (product.access === "member" && !sess) return j(401, { ok: false, need_login: true, error: "login dulu untuk produk member" });

  const base = (env.AUTOPAY_BASE_URL || AUTOPAY_BASE_DEFAULT).replace(/\/+$/, "");
  const ref = `ALFINAI-${slug.replace(/-/g, "").toUpperCase().slice(0, 16)}-${randHex(4)}`;
  const site = `https://${url_host(request)}`;

  let data;
  try {
    const r = await fetch(`${base}/api/qris/create`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": env.AUTOPAY_API_KEY },
      body: JSON.stringify({
        amount: product.price,
        use_unique_code: true,
        reference_id: ref,
        buyer_info: `${product.name} | alfin.ai.id`.slice(0, 64),
        expires_in_minutes: 1440,
        callback_url: `${site}${WEBHOOK_PATH}`,
      }),
    });
    data = await r.json().catch(() => null);
    const checkout = data && data.data && data.data.checkout_url;
    if (!r.ok || !data || data.success !== true || typeof checkout !== "string") {
      return j(502, { ok: false, error: "gateway pembayaran tidak merespons" });
    }
  } catch {
    return j(502, { ok: false, error: "tidak bisa menghubungi gateway pembayaran" });
  }

  const inv = data.data;
  await env.DB.prepare(
    "INSERT INTO orders (ref_id,product_slug,user_id,amount,payable,checkout_url) VALUES (?,?,?,?,?,?)"
  ).bind(ref, slug, sess ? sess.user_id : null, product.price, inv.amount || product.price, inv.checkout_url).run();

  return j(200, { ok: true, checkout_url: inv.checkout_url, ref_id: ref, expires_at: inv.expires_at || null });
}

const url_host = (req) => { try { return new URL(req.url).host; } catch { return "alfin.ai.id"; } };

async function webhook(request, env) {
  if (!isJson(request)) return j(400, { ok: false, error: "json only" });
  const raw = await request.text();
  const ts = request.headers.get("x-autopay-timestamp") || "";
  const sig = (request.headers.get("x-autopay-signature") || "").toLowerCase();
  const deliveryId = request.headers.get("x-autopay-delivery-id") || "";
  if (!env.AUTOPAY_API_KEY || !ts || !sig) return j(401, { ok: false, error: "unauthorized" });
  // Tolak timestamp basi (>10 menit) — anti replay lama.
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 600) return j(401, { ok: false, error: "stale" });
  const expected = await hmacHex(env.AUTOPAY_API_KEY, `${ts}.${raw}`);
  if (!timingEq(expected, sig)) return j(401, { ok: false, error: "bad signature" });

  let p;
  try { p = JSON.parse(raw); } catch { return j(400, { ok: false, error: "bad json" }); }
  const event = request.headers.get("x-autopay-event") || p.event || "payment.paid";
  const ref = p.ref_id || p.reference_id || "";

  // Dedup delivery — retry autopay (1+3 attempt) idempotent di sini.
  if (deliveryId) {
    const ins = await env.DB.prepare("INSERT OR IGNORE INTO webhook_log (delivery_id,ref_id,event) VALUES (?,?,?)")
      .bind(deliveryId, ref, event).run();
    if (ins.meta && ins.meta.changes === 0) return j(200, { ok: true, dedup: true });
  }

  if (event !== "payment.paid") return j(200, { ok: true, ignored: event });
  if (!ref) return j(200, { ok: true, warn: "no ref" });

  const order = await env.DB.prepare("SELECT * FROM orders WHERE ref_id=?").bind(ref).first();
  if (!order) return j(200, { ok: true, warn: "ref tidak dikenal" });
  if (order.status === "paid") return j(200, { ok: true, already: true });
  if (Number(p.amount) !== Number(order.payable)) {
    return j(200, { ok: false, error: `amount mismatch ${p.amount} vs ${order.payable}` });
  }

  const product = await env.DB.prepare("SELECT billing FROM products WHERE slug=?").bind(order.product_slug).first();
  const ends = product && product.billing === "yearly" ? "datetime('now','+1 year')" : "NULL";

  await env.DB.batch([
    env.DB.prepare("UPDATE orders SET status='paid', paid_at=datetime('now'), tx_id=? WHERE ref_id=?").bind(p.tx_id || null, ref),
    env.DB.prepare(`INSERT OR IGNORE INTO entitlements (user_id,product_slug,ref_id,source,ends_at) VALUES (?,?,?,'paid',${ends})`)
      .bind(order.user_id, order.product_slug, ref),
  ]);
  return j(200, { ok: true, granted: true });
}

async function register(request, env) {
  if (!isJson(request)) return j(400, { ok: false, error: "json only" });
  const b = await jsonBody(request);
  const email = b && typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const pass = b && typeof b.password === "string" ? b.password : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return j(400, { ok: false, error: "email tidak valid" });
  if (pass.length < 8) return j(400, { ok: false, error: "password minimal 8 karakter" });

  const salt = randHex(8);
  const hash = await pbkdf2(pass, salt);
  try {
    const r = await env.DB.prepare("INSERT INTO users (email,pass_hash) VALUES (?,?)")
      .bind(email, `pbkdf2$100000$${salt}$${hash}`).run();
    const uid = r.meta.last_row_id;
    const token = randHex(16);
    await env.DB.prepare("INSERT INTO sessions (token,user_id,admin,expires_at) VALUES (?,?,0,datetime('now','+30 days'))")
      .bind(token, uid).run();
    return new Response(JSON.stringify({ ok: true, email }), { status: 200, headers: { ...HDR, "set-cookie": cookieSet("alfin_sid", token, 2592000) } });
  } catch (e) {
    if (String(e).includes("UNIQUE")) return j(409, { ok: false, error: "email sudah terdaftar — coba masuk" });
    return j(500, { ok: false, error: "register gagal" });
  }
}

async function login(request, env) {
  if (!isJson(request)) return j(400, { ok: false, error: "json only" });
  const b = await jsonBody(request);
  const email = b && typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const pass = b && typeof b.password === "string" ? b.password : "";
  const u = await env.DB.prepare("SELECT id,pass_hash FROM users WHERE email=?").bind(email).first();
  if (!u) return j(401, { ok: false, error: "email atau password salah" });
  const m = u.pass_hash.match(/^pbkdf2\$(\d+)\$([0-9A-Fa-f]+)\$([0-9A-Fa-f]+)$/);
  if (!m) return j(401, { ok: false, error: "email atau password salah" });
  const calc = await pbkdf2(pass, m[2], Number(m[1]));
  if (!timingEq(calc, m[3])) return j(401, { ok: false, error: "email atau password salah" });

  const token = randHex(16);
  await env.DB.prepare("INSERT INTO sessions (token,user_id,admin,expires_at) VALUES (?,?,0,datetime('now','+30 days'))")
    .bind(token, u.id).run();
  return new Response(JSON.stringify({ ok: true, email }), { status: 200, headers: { ...HDR, "set-cookie": cookieSet("alfin_sid", token, 2592000) } });
}

async function logout(request, env) {
  const t = cookieGet(request, "alfin_sid");
  if (t) await env.DB.prepare("DELETE FROM sessions WHERE token=? AND admin=0").bind(t).run();
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...HDR, "set-cookie": cookieDel("alfin_sid") } });
}

async function me(request, env) {
  const s = await userOf(env, request);
  if (!s) return j(401, { ok: false });
  const u = await env.DB.prepare("SELECT id,email,created_at FROM users WHERE id=?").bind(s.user_id).first();
  return j(200, { ok: true, user: u });
}

async function memberEntitlements(request, env) {
  const s = await userOf(env, request);
  if (!s) return j(401, { ok: false });
  const { results } = await env.DB.prepare(
    `SELECT e.product_slug, e.ends_at, e.created_at, e.source, p.name, p.url
     FROM entitlements e LEFT JOIN products p ON p.slug=e.product_slug
     WHERE e.user_id=? ORDER BY e.created_at DESC`
  ).bind(s.user_id).all();
  return j(200, { ok: true, entitlements: results || [] });
}

async function memberOrders(request, env) {
  const s = await userOf(env, request);
  if (!s) return j(401, { ok: false });
  const { results } = await env.DB.prepare(
    `SELECT o.ref_id,o.product_slug,o.amount,o.payable,o.status,o.checkout_url,o.created_at,o.paid_at,p.name
     FROM orders o LEFT JOIN products p ON p.slug=o.product_slug
     WHERE o.user_id=? ORDER BY o.created_at DESC LIMIT 50`
  ).bind(s.user_id).all();
  return j(200, { ok: true, orders: results || [] });
}

// ── admin ──────────────────────────────────────────────────────────────────

async function adminLogin(request, env) {
  if (!isJson(request)) return j(400, { ok: false, error: "json only" });
  const b = await jsonBody(request);
  const pass = b && typeof b.password === "string" ? b.password : "";
  if (!env.ADMIN_PASSWORD || !timingEq(pass, env.ADMIN_PASSWORD)) return j(401, { ok: false, error: "password salah" });
  const token = randHex(16);
  await env.DB.prepare("INSERT INTO sessions (token,user_id,admin,expires_at) VALUES (?,NULL,1,datetime('now','+12 hours'))")
    .bind(token).run();
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...HDR, "set-cookie": cookieSet("alfin_adm", token, 43200) } });
}

async function adminLogout(request, env) {
  const t = cookieGet(request, "alfin_adm");
  if (t) await env.DB.prepare("DELETE FROM sessions WHERE token=? AND admin=1").bind(t).run();
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...HDR, "set-cookie": cookieDel("alfin_adm") } });
}

async function adminProducts(request, env) {
  if (request.method === "GET") {
    const { results } = await env.DB.prepare("SELECT * FROM products ORDER BY kind,sort,slug").all();
    return j(200, { ok: true, products: results || [] });
  }
  if (request.method === "POST") {
    if (!isJson(request)) return j(400, { ok: false, error: "json only" });
    const b = await jsonBody(request);
    if (!b || !/^[a-z0-9-]{1,32}$/.test(b.slug || "")) return j(400, { ok: false, error: "slug invalid" });
    const kind = ["paid", "gear", "device"].includes(b.kind) ? b.kind : "paid";
    const access = b.access === "member" ? "member" : "public";
    const category = String(b.category || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 24);
    let data = "";
    if (typeof b.data === "string" && b.data.length <= 20000) {
      try { data = JSON.stringify(JSON.parse(b.data)); } catch { return j(400, { ok: false, error: "data bukan JSON valid" }); }
    }
    await env.DB.prepare(
      `INSERT INTO products (slug,kind,name,"desc",price,billing,access,url,category,data,sort,active)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(slug) DO UPDATE SET kind=excluded.kind,name=excluded.name,"desc"=excluded."desc",
         price=excluded.price,billing=excluded.billing,access=excluded.access,url=excluded.url,
         category=excluded.category,data=excluded.data,sort=excluded.sort,active=excluded.active`
    ).bind(b.slug, kind, String(b.name || b.slug).slice(0, 64), String(b.desc || "").slice(0, 200),
      Math.max(0, parseInt(b.price, 10) || 0), String(b.billing || ""), access,
      String(b.url || "").slice(0, 200), category, data, parseInt(b.sort, 10) || 0, b.active === false ? 0 : 1).run();
    return j(200, { ok: true });
  }
  return j(405, { ok: false, error: "method" });
}

async function adminProductDelete(env, slug) {
  const r = await env.DB.prepare("DELETE FROM products WHERE slug=?").bind(slug).run();
  return j(200, { ok: true, deleted: r.meta ? r.meta.changes : 0 });
}

async function adminOrders(env, url) {
  const lim = Math.min(200, parseInt(url.searchParams.get("limit"), 10) || 50);
  const { results } = await env.DB.prepare(
    `SELECT o.ref_id,o.product_slug,o.amount,o.payable,o.status,o.created_at,o.paid_at,u.email
     FROM orders o LEFT JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC LIMIT ?`
  ).bind(lim).all();
  return j(200, { ok: true, orders: results || [] });
}

async function adminEntitlements(request, env) {
  if (request.method === "GET") {
    const { results } = await env.DB.prepare(
      `SELECT e.id,e.product_slug,e.ref_id,e.source,e.ends_at,e.created_at,u.email
       FROM entitlements e LEFT JOIN users u ON u.id=e.user_id ORDER BY e.created_at DESC LIMIT 200`
    ).all();
    return j(200, { ok: true, entitlements: results || [] });
  }
  if (request.method === "POST") {
    if (!isJson(request)) return j(400, { ok: false, error: "json only" });
    const b = await jsonBody(request);
    const email = b && typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
    const slug = String(b && b.product_slug || "");
    const u = await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email).first();
    if (!u) return j(404, { ok: false, error: "user belum terdaftar" });
    const p = await env.DB.prepare("SELECT slug FROM products WHERE slug=?").bind(slug).first();
    if (!p) return j(404, { ok: false, error: "produk tidak ada" });
    const ends = b.ends_at && /^\d{4}-\d{2}-\d{2}/.test(b.ends_at) ? `'${b.ends_at.slice(0, 10)}'` : "NULL";
    await env.DB.prepare(
      `INSERT OR IGNORE INTO entitlements (user_id,product_slug,ref_id,source,ends_at) VALUES (?,?,?,'manual',${ends})`
    ).bind(u.id, slug, `manual-${randHex(4)}`).run();
    return j(200, { ok: true });
  }
  return j(405, { ok: false, error: "method" });
}

async function adminUsers(env) {
  const { results } = await env.DB.prepare(
    `SELECT u.id,u.email,u.created_at,
       (SELECT COUNT(*) FROM entitlements e WHERE e.user_id=u.id) AS grants,
       (SELECT COUNT(*) FROM orders o WHERE o.user_id=u.id) AS orders
     FROM users u ORDER BY u.created_at DESC LIMIT 200`
  ).all();
  return j(200, { ok: true, users: results || [] });
}

// ── router ─────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path.startsWith("/api/")) {
        if (path === "/api/products" && request.method === "GET") return productsList(env, url);

        const mb = path.match(/^\/api\/buy\/([a-z0-9-]{1,32})$/);
        if (mb) {
          if (request.method !== "POST") return j(405, { ok: false, error: "method not allowed" });
          return buy(request, env, mb[1]);
        }

        if (path === WEBHOOK_PATH) {
          if (request.method !== "POST") return j(405, { ok: false, error: "method not allowed" });
          return webhook(request, env);
        }

        if (path === "/api/auth/register" && request.method === "POST") return register(request, env);
        if (path === "/api/auth/login" && request.method === "POST") return login(request, env);
        if (path === "/api/auth/logout" && request.method === "POST") return logout(request, env);
        if (path === "/api/auth/me" && request.method === "GET") return me(request, env);
        if (path === "/api/member/entitlements" && request.method === "GET") return memberEntitlements(request, env);
        if (path === "/api/member/orders" && request.method === "GET") return memberOrders(request, env);

        if (path.startsWith("/api/admin/")) {
          if (path === "/api/admin/login" && request.method === "POST") return adminLogin(request, env);
          if (path === "/api/admin/logout" && request.method === "POST") return adminLogout(request, env);
          const sess = await adminOf(env, request);
          if (!sess) return j(401, { ok: false, error: "admin only" });
          if (path === "/api/admin/products") return adminProducts(request, env);
          const md = path.match(/^\/api\/admin\/products\/([a-z0-9-]{1,32})$/);
          if (md && request.method === "DELETE") return adminProductDelete(env, md[1]);
          if (path === "/api/admin/orders" && request.method === "GET") return adminOrders(env, url);
          if (path === "/api/admin/entitlements") return adminEntitlements(request, env);
          if (path === "/api/admin/users" && request.method === "GET") return adminUsers(env);
          return j(404, { ok: false, error: "not found" });
        }

        return j(404, { ok: false, error: "not found" });
      }

      // Static assets + 404 manual (not_found_handling tak berlaku via binding).
      let resp;
      try {
        resp = await env.ASSETS.fetch(request);
      } catch {
        resp = null;
      }
      if (!resp || resp.status === 404) {
        const page = await env.ASSETS.fetch(new URL("/404", request.url));
        return new Response(page.body, { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });
      }
      return resp;
    } catch (e) {
      return j(500, { ok: false, error: "internal error" });
    }
  },
};
