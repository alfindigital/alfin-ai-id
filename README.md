# alfin.ai.id

Lokasi sejak 9 November 2026: `Alfindigital/legacy/alfin-ai-id`. Repo dan riwayat lama dipertahankan. Galeri aktif berada di `../../src/content/videos.ts`; petunjuknya `../../specs/VIDEO-PORTFOLIO.md`. Generator showcase lama sengaja menolak eksekusi.

Sejak 1 Nov 2026 domain ini **pengalih**, bukan situs: semua alamat `alfin.ai.id` dan `www.alfin.ai.id` dialihkan 301 ke `https://porto.alfindigital.com/` (`/gear` ke `/gear`). Keputusan owner 1 Nov 2026: porto jadi satu-satunya rumah portofolio, karena daftar karya di sini kembar dengan porto dan tokonya 0 order lunas.

## Status

Pengalih aktif. Aturan ada di Cloudflare zona `alfin.ai.id`, fase Single Redirects (ruleset `aa29c3389bb94558897852442b0f2393`, 2 aturan). Aturan redirect jalan sebelum Worker, jadi Worker `alfin-ai-id` masih ter-deploy tapi tidak lagi menerima pengunjung. Email domain (Cloudflare Email Routing, 3 MX) tidak tersentuh.

Cek: `curl -sI https://alfin.ai.id/` harus `301` dengan `location: https://porto.alfindigital.com/`.

## Mengaktifkan situs lagi

1. Matikan (`enabled: false`) atau hapus 2 aturan redirect itu di dashboard Cloudflare: zona alfin.ai.id, Rules, Redirect Rules.
2. `npm run sync` (tarik daftar karya dari porto) lalu `npm run deploy`, lalu `npm run verify`.

Data toko lama (D1 `alfin-store`) tetap ada: per 1 Nov 2026 isinya 1 user dan 2 order pending, 0 lunas.

## Dependensi

`package.json` memaksa `undici` ^7.30.1 lewat `overrides` (wrangler/miniflare terbaru masih membawa 7.28.x yang rentan, Dependabot alert #3).

## Dokumen

- checkpoints/: catatan sesi
- HANDOFF.md: riwayat versi situs sebelum jadi pengalih
- LICENSE: MIT
