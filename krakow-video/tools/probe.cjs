// node tools/probe.cjs t1 t2 ... : plane world position + screen position (NDC) at those times
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const root = path.resolve(__dirname, "..");
const PAGE = `<script type=importmap>{"imports":{"three":"/assets/lib/three.module.min.js"}}</script><canvas id=c width=270 height=480></canvas><script type=module>import {createWorld} from "/assets/world.js"; window.W = createWorld(document.getElementById('c'),1080,1920,0.25);</script>`;
const srv = http.createServer((req, res) => {
  if (req.url === "/probe") { res.writeHead(200, { "content-type": "text/html" }); return res.end(PAGE); }
  const f = path.join(root, decodeURIComponent(req.url.split("?")[0]));
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  const ext = path.extname(f); res.writeHead(200, { "content-type": ext === ".js" ? "text/javascript" : ext === ".html" ? "text/html" : "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
}).listen(0, async () => {
  const port = srv.address().port; const b = await chromium.launch(); const p = await b.newPage();
  p.on("pageerror", (e) => console.error("pageerror", e.message));
  await p.goto(`http://localhost:${port}/probe`);
  await p.waitForFunction(() => window.W);
  for (const t of process.argv.slice(2)) console.log(JSON.stringify(await p.evaluate((t) => window.W.debug(t), +t)));
  await b.close(); srv.close();
});
