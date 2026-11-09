# AGENTS — alfin.ai.id

- Perlakukan repo ini sebagai legacy sejak 1 November 2026. Domain mengalihkan ke porto; petunjuk deploy di bawah adalah riwayat, bukan instruksi untuk mengaktifkan situs lagi.
- Kerjakan galeri aktif di `../../src/content/videos.ts` dan ikuti `../../specs/VIDEO-PORTFOLIO.md`. Pertahankan penolakan eksekusi generator `tools/build-showcase.js` agar video baru tidak ditambahkan ke situs lama.

- Personal site Alfin, live di `https://alfin.ai.id` via Cloudflare **Workers static assets** (bukan Pages).
- Deploy: `node tools/build-dist.js` lalu `npx wrangler deploy` (`account_id` sudah pinned di wrangler.toml — no env needed).
- `dist/` dihasilkan dari whitelist `tools/build-dist.js` — file baru WAJIB didaftarkan di situ dulu.
- Domain custom di `wrangler.toml` (`routes` + `custom_domain`); jangan attach via Pages.
- Baca `HANDOFF.md` untuk keputusan & status verifikasi.
- Ikuti rules master `~/.agents/AGENTS.md`.
