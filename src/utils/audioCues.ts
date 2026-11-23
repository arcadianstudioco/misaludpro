let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    if (!sharedAudioCtx) {
      sharedAudioCtx = new Ctx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      void sharedAudioCtx.resume();
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

export function playPhaseCue(
  kind: 'contract' | 'relax' | 'exercise' | 'rest' | 'complete',
  muted = false
): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      if (kind === 'complete') {
        navigator.vibrate([90, 60, 140]);
      } else if (kind === 'contract' || kind === 'exercise') {
        navigator.vibrate(55);
      } else {
        navigator.vibrate(30);
      }
    }
  } catch {
    // Ignore vibration restrictions
  }

  if (muted) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const playTone = (freq: number, startOffset: number, durationSec: number, gainPeak = 0.08) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + startOffset);
      gain.gain.setValueAtTime(0.0001, now + startOffset);
      gain.gain.exponentialRampToValueAtTime(gainPeak, now + startOffset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + durationSec);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + durationSec + 0.02);
    };

    if (kind === 'contract' || kind === 'exercise') {
      playTone(660, 0, 0.16);
    } else if (kind === 'relax' || kind === 'rest') {
      playTone(440, 0, 0.22);
    } else {
      playTone(523.25, 0, 0.14);
      playTone(659.25, 0.13, 0.14);
      playTone(783.99, 0.26, 0.26, 0.1);
    }
  } catch {
    // Ignore audio context blocks
  }
}
