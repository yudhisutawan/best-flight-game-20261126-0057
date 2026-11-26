// Procedural WebAudio sound. One job: engine hum, ring chime, touchdown
// thud and stall warning — all synthesized, no audio files.
export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let started = false;

  function ensure() {
    if (started) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 70;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();
      started = true;
    } catch (err) {
      started = false;
    }
  }

  function blip(freq, dur, type, vol, when = 0) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    const t = ctx.currentTime + when;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol || 0.15, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  return {
    unlock() {
      ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume();
    },
    engine(throttle, speed) {
      if (!ctx || !engineOsc) return;
      engineOsc.frequency.value = 55 + throttle * 55 + speed * 0.25;
      engineGain.gain.value = 0.028 + throttle * 0.03;
    },
    ring(centre) {
      blip(880, 0.18, 'sine', 0.2);
      blip(1318, 0.28, 'sine', 0.18, 0.07);
      if (centre) blip(1760, 0.34, 'sine', 0.16, 0.14);
    },
    drop() {
      blip(520, 0.2, 'triangle', 0.2);
      blip(780, 0.3, 'triangle', 0.16, 0.08);
    },
    thud() {
      blip(90, 0.35, 'sine', 0.3);
      blip(60, 0.4, 'sine', 0.25, 0.05);
    },
    crash() {
      blip(70, 0.7, 'sawtooth', 0.25);
      blip(45, 0.9, 'sawtooth', 0.22, 0.1);
    },
    stallBeep() {
      blip(1100, 0.09, 'square', 0.06);
    },
  };
}
