// Generate qr.svg — QR pointing to https://alfin.ai.id (black modules,
// transparent bg; the footer's white chip keeps contrast). Run: node tools/make-qr.js
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
  console.log(`qr.svg written (${(svg.length / 1024).toFixed(1)} KB)`);
});
