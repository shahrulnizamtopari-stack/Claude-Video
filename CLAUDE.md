# Claude-Video

Vertical 3D explainer videos (Malay voiceover) made with HyperFrames + Three.js.

- **House style and process:** use the `explainer-style` skill (`.claude/skills/explainer-style/SKILL.md`) for any new
  video or edit. It covers the look, camera, captions, voiceover handling, sound, the approval stops and reusable code.
- **Reference project:** `plane-video/` ("How a plane flies, the simple way"). New topics start as a copy of it.
- **HyperFrames skills:** `.agents/skills/hyperframes*`. Read `/hyperframes` before writing compositions.
- **Approval stops:** always show a storyboard, then wait. Then show a 540×960 preview, then wait. Only after that, render the final 1080×1920.
- **Final render in two layers:** a clean plate (no captions) plus a transparent captions layer, composited with ffmpeg,
  so subtitles can change without re-rendering the 3D. Details in the `explainer-style` skill, §5 step 4.
- Talk to the user in casual Malay if they write in Malay.
