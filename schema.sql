-- alfin-store schema — D1 (SQLite). Migrasi idempotent: aman dijalankan ulang.
CREATE TABLE IF NOT EXISTS products (
  slug      TEXT PRIMARY KEY,
  kind      TEXT NOT NULL DEFAULT 'paid',      -- 'paid' | 'gear'
  name      TEXT NOT NULL,
  "desc"    TEXT NOT NULL DEFAULT '',
  price     INTEGER NOT NULL DEFAULT 0,        -- rupiah; 0 untuk gear
  billing   TEXT NOT NULL DEFAULT '',          -- 'yearly' | 'lifetime' | ''
  access    TEXT NOT NULL DEFAULT 'public',    -- 'member' | 'public'
  url       TEXT NOT NULL DEFAULT '',          -- gear/device: link eksternal utama
  category  TEXT NOT NULL DEFAULT '',          -- gear/device: grup '//kategori'
  data      TEXT NOT NULL DEFAULT '',          -- device: JSON {tags,links,images}
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

-- Seed produk & gear (OR REPLACE: aman di-reseed — memutakhirkan desc/category).
-- Catatan: slug PRIMARY KEY lintas kind -> gear yg namanya sama dgn produk paid
-- pakai suffix domain (anychat-one, swipepages-com).
INSERT OR REPLACE INTO products (slug,kind,name,"desc",price,billing,access,url,category,sort,active) VALUES
 ('boei-help','paid','BOEI.help','AI assistant tools. Akses 1 tahun.',50000,'yearly','member','','',1,1),
 ('anychat','paid','AnyChat','anychat.one. Akses 1 tahun.',50000,'yearly','member','','',2,1),
 ('swipepages','paid','SwipePages','Landing page builder. Lisensi lifetime.',500000,'lifetime','public','','',3,1),
 ('woxo','gear','WOXO','AI video generator. Faceless content at scale.',0,'','public','https://woxo.tech','video',10,1),
 ('jogg','gear','JoggAI','AI avatar & UGC video ads.',0,'','public','https://jogg.ai','video',20,1),
 ('pagemaker','gear','Pagemaker','Landing page builder. Mobile-first, publish cepat.',0,'','public','https://pagemaker.io','pages',30,1),
 ('swipepages-com','gear','SwipePages','Landing page builder. Drag & drop + template.',0,'','public','https://swipepages.com','pages',40,1),
 ('flipbooklets','gear','FlipBooklets','PDF jadi flipbook interaktif.',0,'','public','https://flipbooklets.com','pages',50,1),
 ('plai','gear','Plai','AI ads manager — Meta, Google, TikTok.',0,'','public','https://plai.io','marketing',60,1),
 ('interacty','gear','Interacty','Konten interaktif: kuis, gamifikasi, lead gen.',0,'','public','https://interacty.me','marketing',70,1),
 ('anychat-one','gear','AnyChat','Widget chat all-in-one buat situs.',0,'','public','https://anychat.one','marketing',80,1),
 ('popuphero','gear','Popup Hero','Popup builder dari Answerly, smart targeting.',0,'','public','https://app.answerly.io/popuphero/','marketing',90,1),
 ('crystalsound','gear','CrystalSound','AI audio cleanup — noise removal & voice enhance.',0,'','public','https://www.crystalsound.ai','tools',100,1),
 ('booltool','gear','Booltool','Suite AI tools dari Boolv (video, image, copy).',0,'','public','https://booltool.boolv.tech','tools',110,1);
