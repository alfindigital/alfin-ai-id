// Smoke test produksi — HTTP 200 semua aset + marker konten di HTML.
// Jalankan: npm run verify
const BASE = process.env.BASE || "https://alfin.ai.id";

const ASSETS = [
  "/",
  "/theme.js",
  "/favicon.svg",
  "/og.png",
  "/apple-touch-icon.png",
  "/fonts/orbitron.woff2",
  "/fonts/instrumentsans.woff2",
  "/fonts/ibmplexmono-400.woff2",
  "/fonts/ibmplexmono-700.woff2",
];

const MARKERS = [
  "grid-template-columns:repeat(4,1fr)",
  'class="ic oss"',
  "mailto:", // harus TIDAK ada — dicek terbalik di bawah
];

async function main() {
  let fail = 0;

  for (const p of ASSETS) {
    try {
      const r = await fetch(BASE + p, { redirect: "manual" });
      const ok = r.status === 200;
      console.log(`${ok ? "ok " : "FAIL"} ${r.status} ${p}`);
      if (!ok) fail++;
    } catch (e) {
      console.log(`FAIL ${p} — ${e.message}`);
      fail++;
    }
  }

  const html = await fetch(BASE + "/").then((r) => r.text());
  if (html.includes("mailto:") || html.includes("@gmail")) {
    console.log("FAIL email bocor di HTML");
    fail++;
  } else console.log("ok  nol email/mailto");
  if (html.includes(MARKERS[0])) console.log("ok  grid 4 kolom ada");
  else { console.log("FAIL grid CSS hilang"); fail++; }
  if (html.includes(MARKERS[1])) console.log("ok  badge OSS ada");
  else { console.log("FAIL badge OSS hilang"); fail++; }
  if (!html.includes("fonts.googleapis.com")) console.log("ok  Google Fonts nol");
  else { console.log("FAIL Google Fonts masih direferensikan"); fail++; }

  const r404 = await fetch(BASE + "/path-ngasal-" + Date.now());
  console.log(`${r404.status === 404 ? "ok " : "FAIL"} /random -> ${r404.status}`);
  if (r404.status !== 404) fail++;

  console.log(fail === 0 ? "\nSEMUA HIJAU" : `\n${fail} GAGAL`);
  process.exit(fail === 0 ? 0 : 1);
}

main();
