// node tools/frames.cjs <outdir> t1 t2 ...  : quick look at index.html (world + overlays, no captions) at those times.
// Uses previewScale 0.5 and a 540x960 viewport. For review only; the real render is `hyperframes render`.
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const root = path.resolve(__dirname, "..");
const types = { ".js": "text/javascript", ".html": "text/html", ".woff2": "font/woff2", ".wav": "audio/wav", ".json": "application/json" };
const srv = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(req.url.split("?")[0]));
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
}).listen(0, async () => {
  const port = srv.address().port, out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 0.5 });
  p.on("pageerror", (e) => console.error("pageerror", e.message));
  p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.error("console", m.text()); });
  await p.addInitScript((dbg) => { window.__timelines = {}; window.__debugBright = dbg; window.__hyperframes = { getVariables: () => ({ previewScale: 0.5 }) }; }, !!process.env.DEBUG_BRIGHT);
  await p.goto(`http://localhost:${port}/index.html`);
  await p.waitForFunction(() => window.__hf && window.__hf.buildReady && window.__hf.buildReady.world, null, { timeout: 60000 });
  await p.evaluate(() => window.__hf.buildReady.world);
  for (const t of process.argv.slice(3)) {
    const ms = await p.evaluate((t) => { const a = performance.now(); window.dispatchEvent(new CustomEvent("hf-seek", { detail: { time: t } })); return performance.now() - a; }, +t);
    await p.screenshot({ path: path.join(out, `t${(+t).toFixed(2).padStart(7, "0")}.jpg`), quality: 80 });
    console.log(t, `${ms.toFixed(0)}ms`);
  }
  await b.close(); srv.close();
});
