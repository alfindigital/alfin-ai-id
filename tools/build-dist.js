// Build dist/ — public file whitelist. Unlisted files are NOT deployed.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");

const PUBLIC_FILES = [
  "index.html",
  "404.html",
  "gear.html",
  "device.html",
  "member.html",
  "admin.html",
  "favicon.svg",
  "robots.txt",
  "sitemap.xml",
  "_headers",
  "theme.js",
  "store.js",
  "member.js",
  "admin.js",
  "og.png",
  "apple-touch-icon.png",
];

// fonts/: only woff2 is deployed (ttf is used build-time to render og.png)
const PUBLIC_DIRS = [
  { dir: "fonts", exts: [".woff2"] },
  { dir: "img/device", exts: [".webp", ".jpg", ".jpeg", ".png", ".avif"] },
];

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

let count = 0;
for (const file of PUBLIC_FILES) {
  const src = path.join(root, file);
  if (!fs.existsSync(src)) {
    console.error(`MISSING: ${file}`);
    process.exit(1);
  }
  fs.copyFileSync(src, path.join(dist, file));
  console.log(`ok  ${file}`);
  count++;
}

for (const { dir, exts } of PUBLIC_DIRS) {
  const srcDir = path.join(root, dir);
  if (!fs.existsSync(srcDir)) {
    console.error(`MISSING DIR: ${dir}`);
    process.exit(1);
  }
  const outDir = path.join(dist, dir);
  fs.mkdirSync(outDir, { recursive: true });
  for (const f of fs.readdirSync(srcDir)) {
    if (exts.includes(path.extname(f).toLowerCase())) {
      fs.copyFileSync(path.join(srcDir, f), path.join(outDir, f));
      console.log(`ok  ${dir}/${f}`);
      count++;
    }
  }
}
console.log(`\ndist ready: ${count} files`);
