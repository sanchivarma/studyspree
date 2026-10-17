"""Original, deterministic synthetic textures. No recordings or third-party samples.
Run python scripts/generate-background-effects.py. Assets are immutable.
"""
import math
import random
import struct
import wave
from pathlib import Path

RATE, SECONDS = 16000, 24
ROOT = Path(__file__).resolve().parents[1] / "public" / "audio"
for index, name in enumerate(["cafe", "wind", "rain", "thunderstorm", "brown-noise", "white-noise"]):
    target = ROOT / f"effect-{name}-v1.wav"
    if target.exists():
        raise SystemExit(f"Immutable asset already exists: {target.name}")
    rng = random.Random(4100 + index)
    low, mid = 0.0, 0.0
    samples = []
    for i in range(RATE * SECONDS):
        t = i / RATE
        noise = rng.uniform(-1, 1)
        low += 0.015 * (noise - low)
        mid += 0.3 * (noise - mid)
        if name == "cafe":
            # Soft speech-shaped murmur texture, with no words or human recording.
            value = (mid - low) * (0.6 + 0.3 * math.sin(2 * math.pi * t / 4))
        elif name == "wind":
            value = low * 4 * (0.7 + 0.25 * math.sin(2 * math.pi * t / 8))
        elif name == "rain":
            value = (0.7 * noise + 0.3 * mid) * (0.9 + 0.08 * math.sin(2 * math.pi * t / 6))
        elif name == "thunderstorm":
            rumble = math.exp(-((t - 7) / 2.3) ** 2) + 0.7 * math.exp(-((t - 18) / 3) ** 2)
            value = noise * 0.14 + low * (1.4 + 3 * rumble)
        elif name == "brown-noise":
            value = low * 4
        else:
            value = noise * 0.6
        samples.append(value)
    # Blend the wrap seam; the runtime also overlaps two instances for two seconds.
    overlap = RATE
    for i in range(overlap):
        mix = i / overlap
        samples[i] = samples[-overlap + i] * (1 - mix) + samples[i] * mix
    samples = samples[:-overlap]
    peak = max(abs(value) for value in samples)
    scale = 0.45 / max(peak, 0.001)
    with wave.open(str(target), "wb") as output:
        output.setparams((1, 2, RATE, 0, "NONE", "not compressed"))
        output.writeframes(b"".join(struct.pack("<h", round(value * scale * 32767)) for value in samples))
    print(f"{target.name}: {target.stat().st_size} bytes")
