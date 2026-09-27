/**
 * Arena-style basketball buzzer.
 *
 * Designed to sound closer to a real gym/arena horn:
 * - Low, aggressive fundamental
 * - Strong upper harmonics
 * - Slight detuning between oscillators
 * - Short attack with a hard-edged transient
 * - Natural decay
 *
 * Created lazily after a user gesture so AudioContext never exists during SSR.
 */

type Buzz = "horn" | "blip";

let context: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  try {
    if (!context) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as {
          webkitAudioContext?: typeof AudioContext;
        }).webkitAudioContext;

      if (!Ctor) return null;

      context = new Ctor();
    }

    if (context.state === "suspended") {
      void context.resume();
    }

    return context;
  } catch {
    return null;
  }
}

function playHorn(ctx: AudioContext) {
  const now = ctx.currentTime;
  const duration = 1.8;

  // Master envelope
  const master = ctx.createGain();

  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.8, now + 0.04);
  master.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  // Compression gives it more of a PA / arena character.
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-18, now);
  compressor.knee.setValueAtTime(8, now);
  compressor.ratio.setValueAtTime(5, now);
  compressor.attack.setValueAtTime(0.003, now);
  compressor.release.setValueAtTime(0.12, now);

  master.connect(compressor).connect(ctx.destination);

  const voices = [
    {
      frequency: 185,
      detune: -5,
      gain: 0.34,
      type: "sawtooth" as OscillatorType,
    },
    {
      frequency: 185,
      detune: 5,
      gain: 0.30,
      type: "sawtooth" as OscillatorType,
    },
    {
      frequency: 370,
      detune: -3,
      gain: 0.12,
      type: "triangle" as OscillatorType,
    },
    {
      frequency: 555,
      detune: 4,
      gain: 0.055,
      type: "square" as OscillatorType,
    },
  ];

  for (const voice of voices) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = voice.type;

    // Slight pitch drop at the beginning gives the horn some physical character.
    osc.frequency.setValueAtTime(
      voice.frequency * 1.015,
      now,
    );

    osc.frequency.exponentialRampToValueAtTime(
      voice.frequency,
      now + 0.08,
    );

    osc.detune.setValueAtTime(voice.detune, now);

    // Fast attack
    gain.gain.setValueAtTime(0.0001, now);

    gain.gain.exponentialRampToValueAtTime(
      voice.gain,
      now + 0.008,
    );

    // Keep the horn strong instead of fading out after 0.1 seconds.
    gain.gain.exponentialRampToValueAtTime(
      voice.gain * 0.85,
      now + 0.25,
    );

    // Long natural decay
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + duration,
    );

    osc.connect(gain).connect(master);

    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  /*
   * Mechanical "BZZT" attack.
   */
  const bufferSize = Math.floor(ctx.sampleRate * 0.09);

  const buffer = ctx.createBuffer(
    1,
    bufferSize,
    ctx.sampleRate,
  );

  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] =
      (Math.random() * 2 - 1) *
      (1 - i / bufferSize);
  }

  const noise = ctx.createBufferSource();
  const noiseGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  filter.type = "bandpass";
  filter.frequency.setValueAtTime(900, now);
  filter.Q.setValueAtTime(0.8, now);

  noiseGain.gain.setValueAtTime(0.0001, now);

  noiseGain.gain.exponentialRampToValueAtTime(
    0.16,
    now + 0.004,
  );

  noiseGain.gain.exponentialRampToValueAtTime(
    0.0001,
    now + 0.085,
  );

  noise.buffer = buffer;

  noise
    .connect(filter)
    .connect(noiseGain)
    .connect(master);

  noise.start(now);
}

function playBlip(ctx: AudioContext) {
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "triangle";

  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(660, now + 0.09);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.14, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

  osc.connect(gain).connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.14);
}

export function playBuzz(buzz: Buzz = "horn") {
  const ctx = audioContext();

  if (!ctx) return;

  try {
    if (buzz === "horn") {
      playHorn(ctx);
    } else {
      playBlip(ctx);
    }
  } catch {
    // Audio is a nicety, never a failure.
  }
}

