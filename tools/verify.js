// Smoke test produksi — HTTP 200 semua aset + marker konten di HTML.
// Jalankan: npm run verify
const BASE = process.env.BASE || "https://alfin.ai.id";

const ASSETS = [
  "/",
  "/gear",
  "/member",
  "/admin",
  "/theme.js",
  "/store.js",
  "/member.js",
  "/admin.js",
  "/favicon.svg",
  "/og.png",
  "/apple-touch-icon.png",
  "/fonts/orbitron.woff2",
  "/fonts/instrumentsans.woff2",
  "/fonts/ibmplexmono-400.woff2",
  "/fonts/ibmplexmono-700.woff2",
];

const MARKERS = ["grid-template-columns:repeat(4,1fr)", 'class="ic oss"'];

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
  if (html.includes('data-products="paid"') && html.includes("// berbayar")) console.log("ok  section berbayar ada");
  else { console.log("FAIL section berbayar hilang"); fail++; }

  const paid = await fetch(BASE + "/api/products?kind=paid").then((r) => r.json()).catch(() => ({}));
  const slugs = (paid.products || []).map((p) => p.slug);
  if (slugs.includes("boei-help") && slugs.includes("anychat") && slugs.includes("swipepages")) console.log("ok  api products: 3 produk");
  else { console.log("FAIL api products paid"); fail++; }

  const gearApi = await fetch(BASE + "/api/products?kind=gear").then((r) => r.json()).catch(() => ({}));
  const gear = gearApi.products || [];
  const gurls = gear.map((p) => p.url);
  const gcats = new Set(gear.map((p) => p.category));
  if (gurls.includes("https://woxo.tech") && gurls.includes("https://jogg.ai") &&
      gurls.includes("https://interacty.me") && gurls.includes("https://booltool.boolv.tech") &&
      gcats.has("video") && gcats.has("pages") && gcats.has("marketing") && gcats.has("tools") &&
      gear.length >= 11) console.log(`ok  api gear: ${gear.length} item, ${gcats.size} kategori`);
  else { console.log("FAIL api products gear"); fail++; }

  const adm = await fetch(BASE + "/api/admin/products").then((r) => r.status);
  console.log(`${adm === 401 ? "ok " : "FAIL"} admin gate -> ${adm}`);
  if (adm !== 401) fail++;

  const r404 = await fetch(BASE + "/path-ngasal-" + Date.now());
  console.log(`${r404.status === 404 ? "ok " : "FAIL"} /random -> ${r404.status}`);
  if (r404.status !== 404) fail++;

  console.log(fail === 0 ? "\nSEMUA HIJAU" : `\n${fail} GAGAL`);
  process.exit(fail === 0 ? 0 : 1);
}

main();
