// Procedural sound effects (WebAudio). The AudioContext is created lazily on the first sound.
let AC;

const bgMusic = new Audio("./assets/audio/background.wav")
bgMusic.loop = true
bgMusic.volume = 0.35
bgMusic.preload = "auto"

export function playMusic() {
    if (!bgMusic.paused) return

    bgMusic.play().catch((e) => {
        console.warn("bgMusic failed to play: ", e)
    })
}

export function stopMusic() {
    bgMusic.pause()
}

export function setMusicVolume(volume) {
    bgMusic.volume = Math.max(0, Math.min(1, volume))
}

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
