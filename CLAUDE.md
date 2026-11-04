# Claude-Video

Vertical 3D explainer videos (Malay voiceover) made with HyperFrames + Three.js.

- **House style and process:** use the `explainer-style` skill (`.claude/skills/explainer-style/SKILL.md`) for any new
  video or edit. It covers the look, camera, captions, voiceover handling, sound, the approval stops and reusable code.
- **Reference project:** `plane-video/` ("How a plane flies, the simple way"). New topics start as a copy of it.
- **Second style, "READOUT":** dark motion-graphic / kinetic-text news explainers. When the user says "style readout",
  "macam video suhu naik" or "macam video siber tu", use the `readout-style` skill (`.claude/skills/readout-style/SKILL.md`).
  Reference project: `siber-video/` ("Suhu Naik").
- **HyperFrames skills:** `.agents/skills/hyperframes*`. Read `/hyperframes` before writing compositions.
- **Approval stops:** always show a storyboard, then wait. Then show a 540×960 preview, then wait. Only after that, render the final 1080×1920.
- Talk to the user in casual Malay if they write in Malay.
