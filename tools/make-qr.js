// Generate qr.svg — QR menuju https://alfin.ai.id (modul hitam, bg transparan;
// chip putih di CSS footer yang jaga kontras). Jalankan: node tools/make-qr.js
const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");

QRCode.toString("https://alfin.ai.id", {
  type: "svg",
  errorCorrectionLevel: "M",
  margin: 0,
  color: { dark: "#000000", light: "#0000" },
}).then((svg) => {
  const out = path.join(__dirname, "..", "qr.svg");
  fs.writeFileSync(out, svg);
  console.log(`qr.svg ditulis (${(svg.length / 1024).toFixed(1)} KB)`);
});
