// node tools/shot.cjs <outdir> <scale> t1 t2 ... : quick stills straight from the 3D world (no HUD), for framing work
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const root = path.resolve(__dirname, "..");
const [out, scale, ...ts] = process.argv.slice(2);
const PAGE = `<script type=importmap>{"imports":{"three":"/assets/lib/three.module.min.js"}}</script><canvas id=c width=${1080 * scale} height=${1920 * scale}></canvas><script type=module>import {createWorld} from "/assets/world.js"; window.W = createWorld(document.getElementById('c'),1080,1920,${scale});</script>`;
const srv = http.createServer((req, res) => {
  if (req.url === "/probe") { res.writeHead(200, { "content-type": "text/html" }); return res.end(PAGE); }
  const f = path.join(root, decodeURIComponent(req.url.split("?")[0]));
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": path.extname(f) === ".js" ? "text/javascript" : "application/octet-stream" }); fs.createReadStream(f).pipe(res);
}).listen(0, async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  p.on("pageerror", (e) => console.error("pageerror", e.message)); p.on("console", (m) => m.type() === "error" && console.error("console", m.text()));
  await p.goto(`http://localhost:${srv.address().port}/probe`); await p.waitForFunction(() => window.W, null, { timeout: 60000 });
  fs.mkdirSync(out, { recursive: true });
  for (const t of ts) { const info = await p.evaluate((t) => { const d = window.W.debug(t); return [JSON.stringify(d), document.getElementById("c").toDataURL("image/jpeg", 0.85)]; }, +t);
    fs.writeFileSync(path.join(out, `t${t}.jpg`), Buffer.from(info[1].split(",")[1], "base64")); console.log(info[0]); }
  await b.close(); srv.close();
});
