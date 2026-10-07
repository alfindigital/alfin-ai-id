// Auto-sync mingguan (dijalankan Task Scheduler):
// sync porto -> kalau index.html berubah -> build + deploy + commit + push.
// Kalau tidak ada drift, cuma log "no drift". Log: sync.log (gitignored).
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const logFile = path.join(root, "sync.log");
const log = (msg) => {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(logFile, line + "\n");
};

const run = (cmd) => execSync(cmd, { cwd: root, stdio: "pipe", shell: "cmd.exe" }).toString();

try {
  const before = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const syncOut = run("node tools/sync-porto.js").trim();
  const after = fs.readFileSync(path.join(root, "index.html"), "utf8");

  if (before === after) {
    log(`no drift (${syncOut})`);
    process.exit(0);
  }

  log(`drift terdeteksi (${syncOut}) — deploying`);
  run("node tools/build-dist.js");
  run("npx wrangler deploy");
  log("deploy ok — verifikasi produksi");
  run("node tools/verify.js");
  run('git add index.html && git commit -m "chore: auto-sync dari porto (scheduled)" && git push');
  log("deployed + committed");
} catch (e) {
  log(`ERROR: ${e.message}`);
  process.exit(1);
}
