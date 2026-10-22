// Procedural sound effects (WebAudio). The AudioContext is created lazily on the first sound.
let AC;
export function sfx(f, d, t = "square", v = 0.05, s = 0) {
  try {
    AC = AC || new AudioContext();
    const o = AC.createOscillator(),
      a = AC.createGain();
    o.type = t;
    o.frequency.setValueAtTime(f, AC.currentTime);
    o.frequency.exponentialRampToValueAtTime(
      Math.max(30, f + s),
      AC.currentTime + d,
    );
    a.gain.setValueAtTime(v, AC.currentTime);
    a.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + d);
    o.connect(a).connect(AC.destination);
    o.start();
    o.stop(AC.currentTime + d);
  } catch (e) {}
}
