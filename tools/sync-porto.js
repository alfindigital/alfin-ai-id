// Sync link sections dari porto.alfindigital.com (single source of truth).
// Rewrite blok antara <!-- LINKS:START --> dan <!-- LINKS:END --> di index.html.
// Tiap lrow: lname (link utama) + lnote (deskripsi) + .gh opsional (repo open source).
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

const unesc = (s) => s.replace(/&amp;/g, "&").replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"');
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

// Slot icon konsisten: Telegram / GitHub / globe untuk link web biasa.
const slotFor = (url) => {
  const icon = url.includes("t.me/")
    ? "i-tg"
    : url.includes("github.com")
      ? "i-gh"
      : "i-web";
  return `<span class="slot"><svg class="ic"><use href="#${icon}"/></svg></span>`;
};

const metaFor = (gh) =>
  `<span class="meta">${gh ? '<svg class="ic oss" aria-label="open source"><use href="#i-gh"/></svg>' : ""}<span class="arr">&#8599;</span></span>`;

const slugFor = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

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
  let oss = 0;
  for (const part of parts) {
    const name = part.slice(0, part.indexOf("<")).trim().toLowerCase();
    const links = [];
    const rows = part.match(/<li class="lrow">[\s\S]*?<\/li>/g) || [];
    for (const row of rows) {
      const m = row.match(/class="lname lk" href="([^"]+)"[^>]*>([^<]+)/);
      if (!m) continue;
      const [, url, text] = m;
      const title = unesc(text.trim());
      if (!title || FOOTER_SET.has(url)) continue;
      const note = unesc((row.match(/class="lnote">([\s\S]*?)</) || [])[1] || "").trim();
      const gh = (row.match(/class="gh" href="([^"]+)"/) || [])[1] || null;
      if (gh) oss++;
      links.push({ url, title, note, gh });
    }
    if (links.length) groups.push({ name, links });
  }
  if (!groups.length) throw new Error("nol kategori ter-parse — cek markup porto");

  const nav =
    `  <nav class="jumpnav in in-2" aria-label="Kategori">\n    ` +
    groups.map((g) => `<a href="#${slugFor(g.name)}"><span class="sl">//</span>${esc(g.name)}</a>`).join("\n    ") +
    `\n  </nav>\n\n`;

  const blocks =
    nav +
    groups
      .map((g, gi) => {
        const rows = g.links
          .map(
            (l) =>
              `      <li><a href="${l.url}" target="_blank" rel="noopener">${slotFor(l.url)}${metaFor(l.gh)}<span class="main"><span class="name">${esc(l.title)}</span><span class="desc">${esc(l.note || descFor(l.url))}</span></span></a></li>`,
          )
          .join("\n");
        return `  <section class="in in-${gi + 3}" id="${slugFor(g.name)}">\n    <p class="tag">// ${esc(g.name)}</p>\n    <ul class="links">\n${rows}\n    </ul>\n  </section>`;
      })
      .join("\n\n");

  const src = fs.readFileSync(INDEX, "utf8");
  if (!/<!-- LINKS:START -->[\s\S]*?<!-- LINKS:END -->/.test(src))
    throw new Error("marker LINKS tidak ketemu di index.html");
  const out = src.replace(
    /<!-- LINKS:START -->[\s\S]*?<!-- LINKS:END -->/,
    `<!-- LINKS:START -->\n${blocks}\n  <!-- LINKS:END -->`,
  );
  const total = groups.reduce((n, g) => n + g.links.length, 0);
  if (out === src) {
    console.log(`sudah sinkron: ${groups.length} section, ${total} link`);
    return;
  }
  fs.writeFileSync(INDEX, out);
  console.log(`synced: ${groups.length} section, ${total} link, ${oss} open-source`);
  groups.forEach((g) => console.log(`  // ${g.name}: ${g.links.length}`));
}

main().catch((e) => {
  console.error("SYNC GAGAL:", e.message);
  process.exit(1);
});
