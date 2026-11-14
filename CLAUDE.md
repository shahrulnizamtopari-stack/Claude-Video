# Claude-Video

Vertical 3D explainer videos (Malay voiceover) made with HyperFrames + Three.js.

- **House style and process:** use the `explainer-style` skill (`.claude/skills/explainer-style/SKILL.md`) for any new
  video or edit. It covers the look, camera, captions, voiceover handling, sound, the approval stops and reusable code.
- **TikTok affiliate / UGC product edits** (talking-head + B-roll footage): use the `ugc-affiliate-style` skill
  (`.claude/skills/ugc-affiliate-style/SKILL.md`). Reference project: `kitsui-fiber/` (v2 "clean" look).
  The approval stops below are for explainers; for these edits follow what the user asks (often: render straight to MP4).
- **Bongkar (teardown) videos:** use the `bongkar-style` skill (`.claude/skills/bongkar-style/SKILL.md`): dark studio, object sliced open
  in real 3D, captions synced to the user's voiceover. Reference project: `lighter-video/`.
- **Reference project:** `plane-video/` ("How a plane flies, the simple way"). New topics start as a copy of it.
- **Reference project:** `ricecooker-video/` (v3 studio look, "Periuk Nasi Boleh Ditipu"). New topics start as a copy of it.
  For beautiful physical subjects use the v4 cinematic look: `lebah-video/` (skill §0b).
  Older looks: `lift-video/` (v2), `plane-video/` (v1).
- **Style guide for the user (Malay):** `STYLES.md`, with a sample still per look in `docs/styles/`. Keep it current when a look changes.
- **HyperFrames skills:** `.agents/skills/hyperframes*`. Read `/hyperframes` before writing compositions.
- **Approval stops:** always show a storyboard, then wait. Then show a 540×960 preview, then wait. Only after that, render the final 1080×1920.
- Talk to the user in casual Malay if they write in Malay.
