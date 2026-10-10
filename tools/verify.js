// Production smoke test — HTTP 200 on all assets + content markers in HTML.
// Run: npm run verify
const BASE = process.env.BASE || "https://alfin.ai.id";

const ASSETS = [
  "/",
  "/gear",
  "/device",
  "/member",
  "/admin",
  "/robots.txt",
  "/sitemap.xml",
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
    console.log("FAIL email leaked in HTML");
    fail++;
  } else console.log("ok  zero email/mailto");
  if (html.includes(MARKERS[0])) console.log("ok  4-column grid present");
  else { console.log("FAIL grid CSS missing"); fail++; }
  if (html.includes(MARKERS[1])) console.log("ok  OSS badge present");
  else { console.log("FAIL OSS badge missing"); fail++; }
  if (!html.includes("fonts.googleapis.com")) console.log("ok  zero Google Fonts");
  else { console.log("FAIL Google Fonts still referenced"); fail++; }
  if (html.includes('data-products="paid"') && html.includes("// paid")) console.log("ok  paid section present");
  else { console.log("FAIL paid section missing"); fail++; }
  if (html.includes('class="menu"') && html.includes('href="/gear"')) console.log("ok  sitemap menu present");
  else { console.log("FAIL sitemap menu missing"); fail++; }

  const paid = await fetch(BASE + "/api/products?kind=paid").then((r) => r.json()).catch(() => ({}));
  const slugs = (paid.products || []).map((p) => p.slug);
  if (slugs.includes("boei-help") && slugs.includes("anychat") && slugs.includes("swipepages")) console.log("ok  api products: 3 products");
  else { console.log("FAIL api products paid"); fail++; }

  const gearApi = await fetch(BASE + "/api/products?kind=gear").then((r) => r.json()).catch(() => ({}));
  const gear = gearApi.products || [];
  const gurls = gear.map((p) => p.url);
  const gcats = new Set(gear.map((p) => p.category));
  if (gurls.includes("https://woxo.tech") && gurls.includes("https://jogg.ai") &&
      gurls.includes("https://interacty.me") && gurls.includes("https://booltool.boolv.tech") &&
      gcats.has("video") && gcats.has("pages") && gcats.has("marketing") && gcats.has("tools") &&
      gear.length >= 11) console.log(`ok  api gear: ${gear.length} items, ${gcats.size} categories`);
  else { console.log("FAIL api products gear"); fail++; }

  const devApi = await fetch(BASE + "/api/products?kind=device").then((r) => r.json()).catch(() => ({}));
  const dev = devApi.products || [];
  const withImg = dev.filter((p) => { try { return JSON.parse(p.data || "{}").images?.length; } catch { return false; } });
  if (dev.length >= 30 && withImg.length === dev.length) console.log(`ok  api device: ${dev.length} items, all with images`);
  else { console.log(`FAIL api products device (${dev.length} items, ${withImg.length} with img)`); fail++; }

  const imgOk = await fetch(BASE + "/img/device/monitor-lenovo-l24m4a-1.webp", { redirect: "manual" })
    .then((r) => r.status === 200).catch(() => false);
  console.log(`${imgOk ? "ok " : "FAIL"} /img/device/* served`);
  if (!imgOk) fail++;

  const adm = await fetch(BASE + "/api/admin/products").then((r) => r.status);
  console.log(`${adm === 401 ? "ok " : "FAIL"} admin gate -> ${adm}`);
  if (adm !== 401) fail++;

  const rec = await fetch(BASE + "/api/admin/reconcile", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  }).then((r) => r.status);
  console.log(`${rec === 401 ? "ok " : "FAIL"} reconcile gate -> ${rec}`);
  if (rec !== 401) fail++;

  const buyGet = await fetch(BASE + "/api/buy/swipepages").then((r) => r.status);
  console.log(`${buyGet === 405 ? "ok " : "FAIL"} buy GET -> ${buyGet}`);
  if (buyGet !== 405) fail++;

  const buyEvil = await fetch(BASE + "/api/buy/swipepages", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://evil.example" },
    body: "{}",
  }).then((r) => r.status);
  console.log(`${buyEvil === 403 ? "ok " : "FAIL"} buy evil-origin -> ${buyEvil}`);
  if (buyEvil !== 403) fail++;

  const hookBad = await fetch(BASE + "/api/webhook/autopay", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  }).then((r) => r.status);
  console.log(`${hookBad === 401 ? "ok " : "FAIL"} webhook unsigned -> ${hookBad}`);
  if (hookBad !== 401) fail++;

  const r404 = await fetch(BASE + "/path-ngasal-" + Date.now());
  console.log(`${r404.status === 404 ? "ok " : "FAIL"} /random -> ${r404.status}`);
  if (r404.status !== 404) fail++;

  console.log(fail === 0 ? "\nALL GREEN" : `\n${fail} FAILED`);
  process.exit(fail === 0 ? 0 : 1);
}

main();
