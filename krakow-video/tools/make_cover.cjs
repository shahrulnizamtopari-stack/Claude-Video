const { chromium } = require("playwright"); const fs = require("fs");
const b64 = (f, m) => "data:" + m + ";base64," + fs.readFileSync(f).toString("base64");
const aerial = b64("/home/user/Claude-Video/krakow-video/assets/photos/aerial.jpg", "image/jpeg"), map = b64("/tmp/claude-0/-home-user-Claude-Video/e481bd1e-f63f-5454-94b5-2abb9d9708a0/scratchpad/clean/frame-01-at-26s.png", "image/png"), font = b64("/home/user/Claude-Video/krakow-video/assets/fonts/montserrat-latin-800-normal.woff2", "font/woff2");
const html = `<style>@font-face{font-family:M;font-weight:800;src:url(${font})}*{margin:0;box-sizing:border-box}
body{width:1080px;height:1920px;position:relative;overflow:hidden;background:#060911;font-family:M;font-weight:800}
.top{position:absolute;left:0;top:0;width:1080px;height:980px;background:url(${aerial}) 50% 40%/auto 1100px no-repeat;filter:saturate(1.05) contrast(1.05)}
.top::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,9,17,.15) 0%,rgba(6,9,17,0) 45%,rgba(6,9,17,.85) 88%,#060911 100%)}
.map{position:absolute;left:0;top:960px;width:1080px;height:960px;background:url(${map}) 50% -470px/1080px 1920px no-repeat}
.map::before{content:"";position:absolute;left:0;right:0;top:-2px;height:220px;background:linear-gradient(180deg,#060911,rgba(6,9,17,0));z-index:1}
.map::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,9,17,0) 60%,rgba(6,9,17,.8) 100%)}
.s{color:#fff;-webkit-text-stroke:16px #000;paint-order:stroke fill}
.block{position:absolute;left:0;right:0;top:620px;text-align:center;z-index:5}
.tag{display:inline-block;background:#ff2d3d;color:#fff;font-size:40px;letter-spacing:2px;padding:12px 28px;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.5)}
.t1{font-size:150px;line-height:1;margin-top:26px;letter-spacing:-2px}
.t2{font-size:150px;line-height:1;color:#ff3b4a}
.q{margin-top:30px;font-size:62px;color:#ffc531;-webkit-text-stroke:12px #000;paint-order:stroke fill}
.stats{position:absolute;left:60px;right:60px;top:1680px;display:flex;justify-content:space-between;z-index:5}
.st{background:rgba(8,12,22,.85);border:4px solid rgba(255,255,255,.85);border-radius:20px;padding:16px 22px;text-align:center;width:300px}
.st b{display:block;font-size:66px;line-height:1;color:#fff;white-space:nowrap}.st span{display:block;margin-top:6px;font-size:28px;color:#9fb0d6;letter-spacing:1px}
</style>
<div class=top></div><div class=map></div>
<div class=block><div class=tag>7 NOV 2026 · KRAKÓW, POLAND</div>
<div class="t1 s">TEMBAKAN</div><div class="t2 s">DI KRAKOW</div>
<div class=q>Apa sebenarnya jadi?</div></div>
<div class=stats><div class=st><b>6</b><span>TERKORBAN</span></div><div class=st><b style="color:#7eb6ff">1 KM</b><span>DIKEJAR POLIS</span></div><div class=st><b style="color:#ffc531">&lt;3 MIN</b><span>POLIS TIBA</span></div></div>`;
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});await p.setContent(html);await p.evaluate(()=>document.fonts.ready);
await p.screenshot({path:"/home/user/Claude-Video/krakow-video/boards/cover_1080x1920.png"});await b.close();})();
