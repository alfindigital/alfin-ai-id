// Build dist/ — whitelist file publik. File yang tidak terdaftar TIDAK dideploy.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");

const PUBLIC_FILES = [
  "index.html",
  "404.html",
  "favicon.svg",
  "_headers",
  "theme.js",
  "og.png",
  "apple-touch-icon.png",
  "qr.svg",
];

// fonts/: hanya woff2 yang dideploy (ttf dipakai build-time utk render og.png)
const PUBLIC_DIRS = [{ dir: "fonts", exts: [".woff2"] }];

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
console.log(`\ndist siap: ${count} file`);
