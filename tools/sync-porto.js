// Sync link sections dari porto.alfindigital.com (single source of truth).
// Rewrite blok antara <!-- LINKS:START --> dan <!-- LINKS:END --> di index.html.
// Link yang juga ada di footer sosial diskip (sudah di-cover icon).
const fs = require("fs");
const path = require("path");

const PORTO_URL = "https://porto.alfindigital.com";
const INDEX = path.join(__dirname, "..", "index.html");

const FOOTER_SET = new Set([
  "https://github.com/alfindigital",
  "https://www.linkedin.com/in/alfindigital",
  "https://instagram.com/alfindigitalcom",
  "https://twitter.com/alfindigital",
  "https://t.me/toolsbisnis",
  "https://wa.me/6289619093961",
]);

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const slotFor = (url, idx) => {
  const icon = url.includes("t.me/") ? "i-tg" : url.includes("github.com") ? "i-gh" : null;
  const inner = icon
    ? `<svg class="ic"><use href="#${icon}"/></svg>`
    : `<span class="idx">${String(idx).padStart(2, "0")}</span>`;
  return `<span class="slot">${inner}</span>`;
};

const descFor = (url) => {
  const u = new URL(url);
  if (u.hostname === "t.me") return "@" + u.pathname.slice(1);
  return u.hostname + (u.pathname !== "/" ? u.pathname.replace(/\/$/, "") : "");
};

async function main() {
  const html = await fetch(PORTO_URL).then((r) => {
    if (!r.ok) throw new Error(`porto HTTP ${r.status}`);
    return r.text();
  });

  // Pecah per kategori: <h2 class="kicker">nama</h2> ... sampai kicker berikutnya
  const parts = html.split(/<h2 class="kicker">/i).slice(1);
  const groups = [];
  for (const part of parts) {
    const name = part.slice(0, part.indexOf("<")).trim().toLowerCase();
    const links = [];
    const re = /<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>([^<]*)</g;
    let m;
    while ((m = re.exec(part))) {
      const [, url, text] = m;
      const title = text.trim();
      if (!title || FOOTER_SET.has(url)) continue; // icon-only (repo src) & sosial footer diskip
      links.push({ url, title });
    }
    if (links.length) groups.push({ name, links });
  }
  if (!groups.length) throw new Error("nol kategori ter-parse — cek markup porto");

  const blocks = groups
    .map((g, gi) => {
      const rows = g.links
        .map(
          (l, i) =>
            `      <li><a href="${l.url}" target="_blank" rel="noopener">${slotFor(l.url, i + 1)}<span class="main"><span class="name">${esc(l.title)}</span><span class="desc">${esc(descFor(l.url))}</span></span><span class="arr">&#8599;</span></a></li>`,
        )
        .join("\n");
      return `  <section class="in in-${gi + 2}">\n    <p class="tag">// ${esc(g.name)}</p>\n    <ul class="links">\n${rows}\n    </ul>\n  </section>`;
    })
    .join("\n\n");

  const src = fs.readFileSync(INDEX, "utf8");
  const out = src.replace(
    /<!-- LINKS:START -->[\s\S]*?<!-- LINKS:END -->/,
    `<!-- LINKS:START -->\n${blocks}\n  <!-- LINKS:END -->`,
  );
  if (out === src) throw new Error("marker LINKS tidak ketemu di index.html");
  fs.writeFileSync(INDEX, out);
  const total = groups.reduce((n, g) => n + g.links.length, 0);
  console.log(`synced: ${groups.length} section, ${total} link`);
  groups.forEach((g) => console.log(`  // ${g.name}: ${g.links.length}`));
}

main().catch((e) => {
  console.error("SYNC GAGAL:", e.message);
  process.exit(1);
});
