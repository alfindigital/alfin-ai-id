# AGENTS — alfin.ai.id

- Personal site Alfin, live di `https://alfin.ai.id` via Cloudflare **Workers static assets** (bukan Pages).
- Deploy: `node tools/build-dist.js` lalu `npx wrangler deploy` (env `CLOUDFLARE_ACCOUNT_ID=b534acd3a8238a6391b64da112d23eaf`).
- `dist/` dihasilkan dari whitelist `tools/build-dist.js` — file baru WAJIB didaftarkan di situ dulu.
- Domain custom di `wrangler.toml` (`routes` + `custom_domain`); jangan attach via Pages.
- Baca `HANDOFF.md` untuk keputusan & status verifikasi.
- Ikuti rules master `~/.agents/AGENTS.md`.
