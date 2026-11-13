// NODE_PATH=$(npm root -g) node tools/stills.cjs <outDir> t1 t2 ...   → fast stills (540x960) straight from index.html
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const root = path.resolve(__dirname, "..");
const [out, ...times] = process.argv.slice(2);
const TYPES = { ".js": "text/javascript", ".html": "text/html", ".woff2": "font/woff2" };
const srv = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(req.url.split("?")[0]));
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
}).listen(0, async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 0.5 });
  p.on("pageerror", (e) => console.error("pageerror", e.message)); p.on("console", (m) => m.type() === "error" && console.error(m.text()));
  await p.goto(`http://localhost:${srv.address().port}/index.html`);
  await p.waitForFunction(() => window.__renderAt, null, { timeout: 60000 });
  fs.mkdirSync(out, { recursive: true });
  for (const t of times) { await p.evaluate((t) => window.__renderAt(t), +t); await p.screenshot({ path: path.join(out, `t${(+t).toFixed(2).padStart(5, "0")}.png`) }); }
  await b.close(); srv.close();
});
