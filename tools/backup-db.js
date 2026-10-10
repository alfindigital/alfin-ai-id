// D1 backup — exports alfin-store (remote) to backups/ (gitignored).
// Run: npm run backup
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "backups");
fs.mkdirSync(dir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const out = path.join(dir, `alfin-store-${stamp}.sql`);

execSync(`npx wrangler d1 export alfin-store --remote --output "${out}"`, {
  stdio: "inherit",
  shell: "cmd.exe",
});
console.log(`backup -> ${out} (${(fs.statSync(out).size / 1024).toFixed(1)}KB)`);
