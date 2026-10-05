# HANDOFF — alfin.ai.id

Personal site Alfin. Live: **https://alfin.ai.id** (+ `www.alfin.ai.id`).
v9 (5 Okt 2026): item opsional pasca-audit —
- Jump-nav sticky `//kategori` di bawah header (anchor per section,
  scroll-behavior smooth, reduced-motion safe, horizontal scroll di HP).
  Nav + section id di-generate sync-porto — ikut auto-sync, nol drift.
- `qr.svg` di footer (chip putih → scannable di dua tema); regenerate via
  `npm run qr` (dep qrcode).
- `npm run test:visual` — tools/visual-check.js pakai playwright-core +
  Chrome sistem (tanpa download browser): assert 2/3/4 kolom, nol overflow,
  theme flip+persist, console bersih; screenshot ke `shots/` (gitignored).
- Repo GH dapat description + topics (link-in-bio, personal-website,
  cloudflare-workers, cloudflare).
- Fix Task Scheduler: -Argument path berspasi WAJIB quote eksplisit —
  task pertama gagal silent (exit 1, node tak temukan script). Verified:
  Start-ScheduledTask → LastTaskResult 0, sync.log ke-append.
- Dep baru dev-only: qrcode, playwright-core.

v8 (5 Okt 2026): eksekusi sisa audit —
- **Always Use HTTPS diaktifkan user via dashboard** → `http://` apex+www sekarang
  301 → https (verified). Open item HTTPS dari v1 resmi tertutup.
- `404.html` + `not_found_handling = "404-page"` di wrangler.toml → path random
  balas 404 proper dengan halaman ber-brand (verified: `/random` → 404).
- `fonts/OFL.txt` — lisensi SIL OFL untuk Orbitron/Plex Mono/Instrument Sans.
- `tools/verify.js` (`npm run verify`) — smoke test produksi: semua aset 200,
  marker grid+OSS, nol email, 404 handling.
- `tools/auto-sync.js` + Task Scheduler `alfin-ai-id-sync` (Minggu 09:00) —
  sync porto → kalau drift: build+deploy+commit+push otomatis; kalau tidak: log
  "no drift" ke `sync.log` (gitignored).
- Fix bug sync-porto: `out === src` dulu melempar error "marker tidak ketemu"
  padahal konten sudah sinkron — sekarang dibedakan dan exit 0.
- Pin wrangler diubah user ke `^4.147.0` (caret — auto minor/patch update).

v7 (5 Okt 2026): final audit pass — HSTS `max-age=63072000 includeSubDomains`
ditambahkan; CSP diperlebar untuk beacon CF Web Analytics
(`static.cloudflareinsights.com` script + `cloudflareinsights.com` connect) —
zone ternyata auto-inject beacon, sebelumnya ke-block CSP. Wrangler 4.127→4.147
nutup 4 CVE high undici (dep deploy-only). Verified: browser real 375/768/929px
→ 2/3/4 kolom, toggle tema flip+persist, 50/50 link sehat (LinkedIn 999 =
anti-bot normal), nol secret di tracked files, console bersih.
Open item (resolved di v8): Always Use HTTPS masih toggle manual di dashboard
(token tak punya zone-settings write); `http://` masih 200 — HSTS menutup untuk
visitor repeat.

v6 (5 Okt 2026): layout grid tile responsif — 2 kolom mobile, 3 kolom ≥34rem,
4 kolom ≥56rem; container 26→64rem (desktop tidak lagi slim). Markup tile:
slot + meta (badge OSS + arrow) + main via grid-areas. sync-porto sekarang parse
per `lrow`: `lnote` jadi deskripsi real, `.gh` jadi marker open-source
(15 item GH: 7 live+repo, 8 repo-only). Hover translateY(-2px).

v5 (5 Okt 2026): hardening pass —
- Semua link eksternal `target="_blank"` (hub tetap kebuka).
- Theme JS dipindah ke `theme.js` eksternal → CSP `script-src 'self'` strict aktif.
- Tombol tema `hidden` default + di-unhide via JS → no-JS users tak lihat kontrol mati.
- Font self-host: Orbitron (variable), IBM Plex Mono 400/700, Instrument Sans
  (variable) → `/fonts/*.woff2` (~73KB), Google Fonts dihapus 100%.
- `og.png` 1200×630 + `apple-touch-icon.png` — dirender ffmpeg dari TTF di `fonts/`
  (ttf build-time saja, TIDAK dideploy).
- `_headers`: CSP + immutable cache `/fonts/*`, og/touch icon 1 hari.
- `tools/sync-porto.js` — fetch+parse porto → regenerate blok `<!-- LINKS -->`
  (porto = source of truth; hasil: 7 section/44 link).
- `package.json` — wrangler pinned 4.127.0 + scripts `build`/`sync`/`deploy`.
- Repo git publik: github.com/alfindigital/alfin-ai-id (HANDOFF/AGENTS untracked).
- Corner ticks: `--tick` per tema + safe-area-inset.
- Always Use HTTPS: dicoba via API → token tak punya zone-settings write
  (error 10000). Tetap manual: dashboard zone > SSL/TLS > Edge Certificates.

v4 (5 Okt 2026): link-in-bio mirror porto.alfindigital.com — `// link` dibuang
(dobel icon footer + duplikat s.id). Hero dibuang. Toggle dark/light.
Aksen `#d97757` dark / `#b5502f` light. Papan ARA & Beta IDX dibuang (tak ada di
porto). Email tidak ada (privasi).

## Stack

- **Workers static assets** (bukan Pages) — Worker `alfin-ai-id`, assets dari `./dist`.
- Single-file `index.html` (inline CSS + 2 inline script kecil utk theme toggle), `favicon.svg`, `_headers`.
- Font: Orbitron 700/800 (brand) + IBM Plex Mono 400/700 (label/idx/desc) + Instrument Sans 700 (nama link).
- Motif identitas: corner ticks HUD + label `// seksi` + kursor blok kedip.
  Motion: stagger reveal per-section + hover row; gated `prefers-reduced-motion`.
- Footer sosial (semua dari porto channel): GitHub, LinkedIn, IG, X, Telegram, WA.
- Nol dependency, nol build tool — `node tools/build-dist.js` cuma copy whitelist ke `dist/`.

## Deploy

```bash
node tools/build-dist.js
npx wrangler deploy    # butuh CLOUDFLARE_ACCOUNT_ID=b534acd3a8238a6391b64da112d23eaf
```

Custom domain di-manage via `routes` + `custom_domain = true` di `wrangler.toml` —
Cloudflare auto-create DNS record untuk zone satu-akun. **Jangan** attach domain lewat
Pages API/dashboard terpisah — hostname ini sudah owned Worker.

## Keputusan & alasannya

- **Workers, bukan Pages:** attach domain via Pages API (`POST .../pages/projects/X/domains`)
  TIDAK auto-create DNS record (terverifikasi 27 Sep 2026 di feedflowrss + 5 Okt 2026
  di project ini — status stuck `pending`, error `CNAME record not set`). Semua credential
  lokal (wrangler OAuth `cfoat_`, `cf-access-token`, `cf-dns-token-alfindigital`) tidak punya
  DNS-write di zone `alfin.ai.id`. Workers `custom_domain` auto-provision DNS pakai scope
  `workers_routes` yang dimiliki → nol langkah manual.
- Pages project `alfin-ai-id` sempat dibuat lalu **dihapus** (duplikat; Worker canonical).

## Verifikasi (5 Okt 2026)

| Cek | Hasil |
|---|---|
| `https://alfin.ai.id` | HTTP 200, title "Alfin Assyidiq — alfin.ai.id" |
| `https://www.alfin.ai.id` | HTTP 200, konten sama |
| DNS apex + www | resolve ke IP Cloudflare (104.21.x / 172.67.x) |
| `_headers` | X-Frame-Options DENY, nosniff, Referrer-Policy semua live |
| favicon.svg | HTTP 200 |
| Propagasi cert | ~3 menit dari deploy ke HTTPS 200 |

## Belum diverifikasi / open items

- `http://alfin.ai.id` balas 200 langsung, tidak 301 ke HTTPS — zone belum pakai
  "Always Use HTTPS" (butuh zone-settings write / dashboard manual, minor).
- Render HP asli belum dites — layout fluid single-column `max-width:26rem` + `clamp()`,
  tap target 44px+, risiko rendah tapi belum dibuktikan di device.
- v2 redeploy verified: apex+www HTTP 200, marker v2 (Michroma/ticks/`// proyek`) ter-serve, 6.4KB.
- Kalau suatu saat ada API token `Zone.DNS` untuk `alfin.ai.id`, bisa migrate balik ke
  Pages atau tambah record lain (mis. sub-app).

## Biaya

Rp 0. Workers static assets + custom domain = free tier.
