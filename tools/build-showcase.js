// Generate the // showcase gallery from Studio manifest.csv and rewrite it into alfin.ai.id/index.html
const fs = require("fs"), path = require("path"), cp = require("child_process");
const RESULT = "C:/Users/GEEKOM A8/Documents/Studio/result";
const MANIFEST = "C:/Users/GEEKOM A8/Documents/Studio/apps-tooling/cloudinary-upload/manifest.csv";
const INDEX = "C:/Users/GEEKOM A8/Documents/Apps/alfin.ai.id/index.html";
const BASE = "https://res.cloudinary.com/cloud-id/video/upload";

const TITLES = {
  "(root)": "Lotmetrik Alert",
  "avg-lotmetrik": "Avg Lotmetrik",
  "benang-kusut-msci": "Benang kusut MSCI",
  "dividen-yield-saat-anjlok": "Dividen yield saat anjlok",
  "domainlens-portfolio": "DomainLens portfolio",
  "domainlens-research-watchlist": "DomainLens research watchlist",
  "domainlens-techstack": "DomainLens techstack",
  "drawdown-lotmetrik": "Drawdown Lotmetrik",
  "feedflow": "FeedFlow",
  "fmid-bot-asing": "Foreign Midday bot",
  "gajimu-punya-saham": "Gajimu punya saham",
  "idxbt-pemegang-saham": "IDXBT pemegang saham",
  "idxnews": "IDX News",
  "lezat-menu-online": "Lezat menu online",
  "mailtempo": "MailTempo",
  "msci-peluang-turun": "MSCI peluang turun",
  "msci-pov-kalau-jadi-msci": "POV: kalau jadi MSCI",
  "resipaket": "ResiPaket",
  "resipaket-seller": "ResiPaket seller",
  "rightissue-nggak-tebus-rugi": "Right issue nggak tebus rugi",
  "swimma-app-custom": "Swimma app custom",
  "tiket-mars-musk-2017": "Tiket Mars Musk 2017",
  "universal-downloader": "Universal Downloader",
};

function findFile(dir, name, depth = 0) {
  if (depth > 3) return null;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isFile() && e.name === name) return path.join(dir, e.name);
    if (e.isDirectory() && !/^(node_modules|\.hyperframes|capture|snapshots)$/.test(e.name)) {
      const r = findFile(path.join(dir, e.name), name, depth + 1);
      if (r) return r;
    }
  }
  return null;
}

const rows = fs.readFileSync(MANIFEST, "utf8").replace(/^\uFEFF/, "").trim().split(/\r?\n/).slice(1).map((l) => {
  const c = l.replace(/"/g, "").split(",");
  return { folder: c[0], file: c[1], pub: c[3] };
});

const items = rows.map((r) => {
  const src = r.folder === "(root)" ? path.join(RESULT, r.file) : findFile(path.join(RESULT, r.folder), r.file);
  if (!src || !fs.existsSync(src)) throw new Error("source not found: " + r.folder + "/" + r.file);
  const dur = parseFloat(cp.execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", src]).toString().trim());
  return { ...r, mtime: fs.statSync(src).mtimeMs, sec: Math.round(dur), title: TITLES[r.folder] };
});
items.sort((a, b) => b.mtime - a.mtime);

const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const card = (i) => `      <figure class="reel" data-title="${esc(i.title)}">
        <video controls preload="none" playsinline poster="${BASE}/so_2,f_jpg,w_420/${i.pub}.jpg"><source src="${BASE}/f_auto,q_auto,w_540/${i.pub}.mp4" type="video/mp4"></video>
        <button class="reel-btn" type="button" aria-label="Play ${esc(i.title)}" hidden><svg class="ic i-pause"><use href="#i-pause"/></svg><svg class="ic i-play"><use href="#i-play"/></svg></button>
        <figcaption>// ${esc(i.title.toLowerCase())} · ${i.sec}s</figcaption>
      </figure>`;

const section = `<section class="in in-10" id="showcase">
    <h2 class="tag">// showcase</h2>
    <!-- SHOWCASE:START -->
    <div class="reels">
${items.map(card).join("\n")}
    </div>
    <!-- SHOWCASE:END -->
  </section>`;

const css = `.reels{display:grid;grid-template-columns:repeat(2,1fr);gap:.65rem}
@media(min-width:34rem){.reels{grid-template-columns:repeat(3,1fr)}}
@media(min-width:56rem){.reels{grid-template-columns:repeat(4,1fr);gap:.8rem}}
.reel{position:relative;margin:0;min-width:0}
.reel video{
  display:block;width:100%;aspect-ratio:9/16;
  background:var(--panel);border:1px solid var(--line);border-radius:4px;
  object-fit:cover;cursor:pointer;
}
.reel-btn{
  position:absolute;left:50%;top:calc(50% - .9rem);transform:translate(-50%,-50%);
  display:flex;align-items:center;justify-content:center;
  width:3rem;height:3rem;padding:0;
  background:rgba(12,13,15,.62);color:#fff;border:1px solid rgba(255,255,255,.35);border-radius:50%;
  cursor:pointer;transition:opacity .18s ease,background .18s ease;
}
.reel-btn:hover{background:var(--accent)}
.reel-btn .ic{width:1.2rem;height:1.2rem;color:inherit}
.reel-btn .i-play{display:none}
.reel[data-paused] .reel-btn .i-play{display:block}
.reel[data-paused] .reel-btn .i-pause{display:none}
.reel:not([data-paused]) .reel-btn{opacity:0}
.reel:not([data-paused]):hover .reel-btn,.reel:not([data-paused]) .reel-btn:focus-visible{opacity:1}
.reel figcaption{
  margin-top:.4rem;font-size:.74rem;color:var(--accent);
  font-family:"IBM Plex Mono",ui-monospace,monospace;letter-spacing:.03em;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}`;

let html = fs.readFileSync(INDEX, "utf8");
const crlf = html.includes("\r\n");
html = html.replace(/\r\n/g, "\n");
const cssRe = /\.reel\{display:flex[\s\S]*?\.reel figcaption\{[^\n]*\}/;
const secRe = /<section class="in in-10" id="showcase">[\s\S]*?<\/section>/;
if (!cssRe.test(html) || !secRe.test(html)) throw new Error("anchors not found");
html = html.replace(cssRe, () => css).replace(secRe, () => section);
if (crlf) html = html.replace(/\n/g, "\r\n");
fs.writeFileSync(INDEX, html);
console.log("cards:", items.length, "order:", items.map((i) => i.folder).join(", "));
