// SoundGenerator - Web Audio API sound output (runs on main thread)
var SoundGenerator = class {
  constructor() {
    __publicField(this, "channels", [
      { frequency: 0, control: 0, enabled: false, waveform: 0, volume: 0 },
      { frequency: 0, control: 0, enabled: false, waveform: 0, volume: 0 }
    ]);
    __publicField(this, "audioCtx", null);
    __publicField(this, "oscillators", [null, null]);
    __publicField(this, "gains", [null, null]);
  }
  read(offset) {
    const ch = offset >> 1 & 1;
    const reg = offset & 1;
    if (reg === 0) return this.channels[ch].frequency;
    return this.channels[ch].control;
  }
  write(offset, value) {
    const ch = offset >> 1 & 1;
    const reg = offset & 1;
    if (reg === 0) {
      this.channels[ch].frequency = value & 65535;
      this.updateChannel(ch);
    } else {
      this.channels[ch].control = value;
      this.channels[ch].enabled = !!(value & 8);
      this.channels[ch].waveform = value >> 8 & 3;
      this.channels[ch].volume = value >> 4 & 15;
      this.updateChannel(ch);
    }
  }
  updateChannel(ch) {
    const state = this.channels[ch];
    if (!state.enabled || state.frequency === 0) {
      this.stopChannel(ch);
      return;
    }
    if (!this.audioCtx) {
      try {
        this.audioCtx = new AudioContext();
      } catch {
        return;
      }
    }
    const freq = Math.max(20, Math.min(2e4, 1e6 / state.frequency));
    if (!this.oscillators[ch]) {
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);
      this.oscillators[ch] = osc2;
      this.gains[ch] = gain2;
      osc2.start();
    }
    const osc = this.oscillators[ch];
    const gain = this.gains[ch];
    const waveTypes = ["square", "triangle", "sawtooth", "sawtooth"];
    osc.type = waveTypes[state.waveform];
    osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
    gain.gain.setValueAtTime(state.volume / 50, this.audioCtx.currentTime);
  }
  stopChannel(ch) {
    if (this.oscillators[ch]) {
      this.oscillators[ch].stop();
      this.oscillators[ch] = null;
      this.gains[ch] = null;
    }
  }
  destroy() {
    this.stopChannel(0);
    this.stopChannel(1);
    this.audioCtx?.close();
  }
};
