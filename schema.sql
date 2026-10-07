-- alfin-store schema — D1 (SQLite). Migrasi idempotent: aman dijalankan ulang.
CREATE TABLE IF NOT EXISTS products (
  slug      TEXT PRIMARY KEY,
  kind      TEXT NOT NULL DEFAULT 'paid',      -- 'paid' | 'gear'
  name      TEXT NOT NULL,
  "desc"    TEXT NOT NULL DEFAULT '',
  price     INTEGER NOT NULL DEFAULT 0,        -- rupiah; 0 untuk gear
  billing   TEXT NOT NULL DEFAULT '',          -- 'yearly' | 'lifetime' | ''
  access    TEXT NOT NULL DEFAULT 'public',    -- 'member' | 'public'
  url       TEXT NOT NULL DEFAULT '',          -- gear: link eksternal
  sort      INTEGER NOT NULL DEFAULT 0,
  active    INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT NOT NULL UNIQUE,
  pass_hash  TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER,                          -- NULL untuk admin
  admin      INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_exp ON sessions(expires_at);

-- orders: invoice yang dibuat via /api/buy (mirror lokal; source of truth
-- pembayaran tetap autopay — status diupdate oleh webhook).
CREATE TABLE IF NOT EXISTS orders (
  ref_id       TEXT PRIMARY KEY,
  product_slug TEXT NOT NULL,
  user_id      INTEGER,                        -- NULL untuk produk public
  amount       INTEGER NOT NULL,               -- harga dasar
  payable      INTEGER NOT NULL,               -- amount + unique_code
  status       TEXT NOT NULL DEFAULT 'pending',
  checkout_url TEXT NOT NULL DEFAULT '',
  tx_id        TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at      TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);

CREATE TABLE IF NOT EXISTS entitlements (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER,                        -- NULL = grant publik/manual-by-ref
  product_slug TEXT NOT NULL,
  ref_id       TEXT NOT NULL,                  -- invoice ref atau 'manual-…'
  source       TEXT NOT NULL DEFAULT 'paid',   -- 'paid' | 'manual'
  ends_at      TEXT,                           -- NULL = lifetime
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ent_ref ON entitlements(ref_id); -- grant 1x per ref
CREATE INDEX IF NOT EXISTS idx_ent_user ON entitlements(user_id);

-- dedup delivery webhook (autopay retry 1+3 — id wajib unik)
CREATE TABLE IF NOT EXISTS webhook_log (
  delivery_id TEXT PRIMARY KEY,
  ref_id      TEXT,
  event       TEXT,
  received_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed produk & gear
INSERT OR IGNORE INTO products (slug,kind,name,"desc",price,billing,access,url,sort,active) VALUES
 ('boei-help','paid','BOEI.help','AI assistant tools. Akses 1 tahun.',50000,'yearly','member','',1,1),
 ('anychat','paid','AnyChat','anychat.one. Akses 1 tahun.',50000,'yearly','member','',2,1),
 ('swipepages','paid','SwipePages','Landing page builder. Lisensi lifetime.',500000,'lifetime','public','',3,1),
 ('woxo','gear','WOXO','AI video generator. Faceless content at scale.',0,'','public','https://woxo.tech',1,1),
 ('jogg','gear','JoggAI','AI avatar & UGC video ads.',0,'','public','https://jogg.ai',2,1);
