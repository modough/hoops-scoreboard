/**
 * Tiny WebAudio buzzer. Created lazily on the first user gesture so no
 * AudioContext exists during SSR, and every call is wrapped so a blocked
 * autoplay policy can never break the board.
 */

type Buzz = "horn" | "blip";

let context: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!context) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      context = new Ctor();
    }
    if (context.state === "suspended") void context.resume();
    return context;
  } catch {
    return null;
  }
}

function tone(
  ctx: AudioContext,
  freq: number,
  start: number,
  duration: number,
  peak: number,
  type: OscillatorType,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(peak, ctx.currentTime + start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + duration + 0.05);
}

export function playBuzz(buzz: Buzz = "horn") {
  const ctx = audioContext();
  if (!ctx) return;
  try {
    if (buzz === "horn") {
      tone(ctx, 440, 0, 0.9, 0.16, "sawtooth");
      tone(ctx, 466, 0, 0.9, 0.12, "sawtooth");
      tone(ctx, 220, 0, 0.9, 0.1, "square");
    } else {
      tone(ctx, 880, 0, 0.12, 0.1, "triangle");
    }
  } catch {
    /* audio is a nicety, never a failure */
  }
}
