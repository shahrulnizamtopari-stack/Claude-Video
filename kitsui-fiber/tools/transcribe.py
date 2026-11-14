"""Word-level Malay transcript with faster-whisper (more accurate word times than `hyperframes transcribe`).

  pip install faster-whisper soundfile      (once)
  python3 tools/transcribe.py assets/footage/th1.mp4 [more files...]   -> tools/transcript.json

Audio goes through ffmpeg -> 16 kHz mono WAV first: faster-whisper's own PyAV decoder breaks on this
machine's PyAV version (`open() got an unexpected keyword argument 'metadata_errors'`).
The first word of a clip often gets start=0.00: check it against the audio envelope.
"""
import json, os, subprocess, sys, tempfile
import soundfile as sf
from faster_whisper import WhisperModel

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
m = WhisperModel("medium", device="cpu", compute_type="int8")
out, tmp = {}, tempfile.mkdtemp()
for f in sys.argv[1:]:
    wav = os.path.join(tmp, os.path.basename(f) + ".wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f, "-ac", "1", "-ar", "16000", wav], check=True)
    a, _ = sf.read(wav, dtype="float32")
    segs, _ = m.transcribe(a, language="ms", word_timestamps=True, beam_size=5, vad_filter=False)
    ws = [dict(text=w.word.strip(), start=round(w.start, 2), end=round(w.end, 2)) for s in segs for w in s.words]
    out[os.path.basename(f)] = ws
    print(os.path.basename(f), " ".join(f"{w['text']}[{w['start']:.2f}]" for w in ws), flush=True)
json.dump(out, open(os.path.join(ROOT, "tools/transcript.json"), "w"), indent=1)
