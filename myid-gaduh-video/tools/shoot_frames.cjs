// node tools/shoot_frames.cjs [frames...] -> boards/frame-0N.png (files served via page.route, no server needed)
const { chromium } = require("playwright"); const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, ".."), MIME = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2" };
(async () => {
  const fr = process.argv.slice(2).length ? process.argv.slice(2) : ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on("pageerror", (e) => console.log("pageerror:", e.message));
  await p.route("http://local/**", (r) => { const f = path.join(ROOT, decodeURIComponent(new URL(r.request().url()).pathname));
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: "" }); r.fulfill({ status: 200, contentType: MIME[path.extname(f)] || "application/octet-stream", body: fs.readFileSync(f) }); });
  for (const f of fr) { await p.goto(`http://local/boards/frame.html?f=${f}`); await p.waitForSelector("body[data-ready]", { timeout: 90000 });
    await p.evaluate(() => document.fonts.ready); await p.screenshot({ path: path.join(ROOT, `boards/frame-0${f}.png`) }); }
  await b.close();
})();
