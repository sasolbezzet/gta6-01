// Web Audio API procedural sound engine for Vice City Shadows
// Generates all sound effects and synthwave music procedurally with zero external audio files.

export class SoundFX {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sirenNode = null;
    this.sirenGain = null;
    this.engineNode = null;
    this.engineGain = null;
    this.radioGain = null;
    this.radioInterval = null;
    this.enabled = true;
    this.musicPlaying = false;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.initEngine();
      this.initSiren();
      this.startRadio();
    } catch (e) {
      console.warn('AudioContext initialization deferred:', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  initEngine() {
    if (!this.ctx) return;
    // Engine sound: low frequency saw oscillator + noise
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.setValueAtTime(55, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(300, this.ctx.currentTime);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);
    this.engineOsc.start();
  }

  updateEngine(speedRatio, isDriving) {
    if (!this.engineGain || !this.ctx) return;
    if (!isDriving || speedRatio <= 0.01) {
      this.engineGain.gain.setTargetAtTime(isDriving ? 0.08 : 0, this.ctx.currentTime, 0.1);
      this.engineOsc.frequency.setTargetAtTime(55, this.ctx.currentTime, 0.1);
      return;
    }
    const freq = 60 + speedRatio * 180;
    this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
    this.engineFilter.frequency.setTargetAtTime(250 + speedRatio * 600, this.ctx.currentTime, 0.05);
    this.engineGain.gain.setTargetAtTime(0.18 + speedRatio * 0.12, this.ctx.currentTime, 0.05);
  }

  initSiren() {
    if (!this.ctx) return;
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'sine';
    this.sirenOsc.frequency.setValueAtTime(700, this.ctx.currentTime);

    // LFO to modulate siren pitch
    this.sirenLfo = this.ctx.createOscillator();
    this.sirenLfo.frequency.setValueAtTime(0.8, this.ctx.currentTime);
    this.sirenLfoGain = this.ctx.createGain();
    this.sirenLfoGain.gain.setValueAtTime(250, this.ctx.currentTime);

    this.sirenLfo.connect(this.sirenOsc.frequency);
    this.sirenLfo.start();

    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.masterGain);
    this.sirenOsc.start();
  }

  setSiren(active) {
    if (!this.sirenGain || !this.ctx) return;
    const target = active ? 0.22 : 0;
    this.sirenGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.2);
  }

  playGunshot(weaponType = 'pistol') {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Noise burst for gunshot crack
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.03));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(weaponType === 'rifle' ? 1800 : 2500, now);
    filter.Q.setValueAtTime(1.5, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);

    // Punch sub oscillator
    const sub = this.ctx.createOscillator();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(weaponType === 'rifle' ? 120 : 150, now);
    sub.frequency.exponentialRampToValueAtTime(30, now + 0.1);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.5, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 0.1);
  }

  playExplosion() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const duration = 1.2;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.35));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(40, now + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
  }

  playCrash() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.25);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  playTireScreech() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.Q.setValueAtTime(6, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
  }

  playMoney() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  playMissionSuccess() {
    if (!this.ctx) return;
    const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
    notes.forEach((f, idx) => {
      const now = this.ctx.currentTime + idx * 0.12;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.35);
    });
  }

  startRadio() {
    if (!this.ctx || this.musicPlaying) return;
    this.musicPlaying = true;
    this.radioGain = this.ctx.createGain();
    this.radioGain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    this.radioGain.connect(this.masterGain);

    // Procedural Synthwave bassline progression: Am - F - C - G
    const chords = [
      [220, 261.63, 329.63], // Am
      [174.61, 220, 261.63], // F
      [130.81, 164.81, 196.00], // C
      [196.00, 246.94, 293.66], // G
    ];

    let chordIdx = 0;
    let step = 0;

    const playBassBeat = () => {
      if (!this.musicPlaying || !this.ctx) return;
      const now = this.ctx.currentTime;
      const currentChord = chords[chordIdx];
      const baseFreq = currentChord[step % currentChord.length] / 2;

      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(baseFreq, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, now);
      filter.frequency.exponentialRampToValueAtTime(150, now + 0.2);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.radioGain);
      osc.start(now);
      osc.stop(now + 0.22);

      step++;
      if (step >= 8) {
        step = 0;
        chordIdx = (chordIdx + 1) % chords.length;
      }
    };

    this.radioInterval = setInterval(playBassBeat, 240); // ~125 BPM
  }
}
