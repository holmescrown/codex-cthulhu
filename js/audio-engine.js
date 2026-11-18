// MODIFIED: 升级为多神祇专属程序化声学引擎（根据 creatureId 实时重构底噪频率、滤波器形态、节拍脉冲与音阶）
export class EldritchAudioEngine {
  constructor() {
    this.ctx = null;
    this.isEnabled = false;
    this.masterGain = null;
    this.droneOsc1 = null;
    this.droneOsc2 = null;
    this.droneFilter = null;
    this.melodyGain = null;
    this.gazeRingingOsc = null;
    this.gazeRingingGain = null;
    this.loopTimer = null;

    // MODIFIED: 架构解耦——不再直接读取全局 AppState，改由外部注入状态
    this.currentCreatureId = "1-1";
    this.gazeIntensity = 0;
    this.entropyScale = 1.0;

    // 四大外神专属声学配置矩阵
    this.profiles = {
      "1-1": {
        drone1: 55.0, drone2: 77.78, wave1: 'sawtooth', wave2: 'triangle', filterType: 'lowpass', baseCutoff: 130,
        melodyWave: 'triangle', scale: [220.0, 233.08, 277.18, 293.66, 329.63, 349.23, 415.30, 440.0],
        tempoMs: 360, ringFreq: 1860 // 盲目痴愚魔笛 + 三全音次声波
      },
      "1-2": {
        drone1: 110.0, drone2: 164.81, wave1: 'sine', wave2: 'sine', filterType: 'bandpass', baseCutoff: 320,
        melodyWave: 'sine', scale: [329.63, 369.99, 415.30, 466.16, 523.25, 587.33, 659.25, 739.99],
        tempoMs: 520, ringFreq: 2480 // 全知之门水晶泛音 + 时空钟摆共振
      },
      "1-3": {
        drone1: 41.20, drone2: 58.27, wave1: 'sawtooth', wave2: 'sawtooth', filterType: 'lowpass', baseCutoff: 95,
        melodyWave: 'sawtooth', scale: [82.41, 87.31, 103.83, 110.0, 123.47, 130.81, 146.83],
        tempoMs: 440, ringFreq: 920  // 森之黑山羊地底低频轰鸣 + 羊群嘶鸣
      },
      "1-4": {
        drone1: 73.42, drone2: 110.0, wave1: 'triangle', wave2: 'sawtooth', filterType: 'bandpass', baseCutoff: 240,
        melodyWave: 'sawtooth', scale: [293.66, 311.13, 369.99, 392.00, 440.00, 466.16, 554.37, 587.33],
        tempoMs: 280, ringFreq: 2150 // 黑法老埃及 Hijaz 微分音 + 沙暴低语
      },
      "1-5": {
        drone1: 92.50, drone2: 130.81, wave1: 'sine', wave2: 'triangle', filterType: 'bandpass', baseCutoff: 410,
        melodyWave: 'sine', scale: [466.16, 493.88, 554.37, 622.25, 659.25, 739.99, 830.61, 932.33],
        tempoMs: 240, ringFreq: 2780 // 青炎冷火极寒风啸 + 结晶灰烬高频泛音
      },
      "1-6": {
        drone1: 48.99, drone2: 69.30, wave1: 'triangle', wave2: 'sawtooth', filterType: 'lowpass', baseCutoff: 115,
        melodyWave: 'triangle', scale: [98.00, 103.83, 116.54, 130.81, 138.59, 155.56, 174.61],
        tempoMs: 390, ringFreq: 1180 // 不净之池低频气泡咕嘟 + 洛克里亚减五度吞噬低鸣
      },
      "1-7": {
        drone1: 65.41, drone2: 98.00, wave1: 'sine', wave2: 'sawtooth', filterType: 'bandpass', baseCutoff: 280,
        melodyWave: 'sine', scale: [261.63, 311.13, 369.99, 392.00, 466.16, 523.25, 622.25, 739.99],
        tempoMs: 480, ringFreq: 2320 // 苍穹唤醒魔音 + 深空脉冲星引力波共振
      },
      "2-1": {
        drone1: 36.71, drone2: 55.00, wave1: 'sine', wave2: 'triangle', filterType: 'lowpass', baseCutoff: 88,
        melodyWave: 'sine', scale: [146.83, 174.61, 196.00, 220.00, 261.63, 293.66, 349.23],
        tempoMs: 560, ringFreq: 1420 // 拉莱耶万米深海高压低频 + 潜意识梦讯五声音阶回响
      },
      "2-2": {
        drone1: 82.41, drone2: 123.47, wave1: 'sawtooth', wave2: 'sine', filterType: 'bandpass', baseCutoff: 260,
        melodyWave: 'triangle', scale: [246.94, 261.63, 311.13, 329.63, 369.99, 392.00, 466.16, 493.88],
        tempoMs: 330, ringFreq: 2040 // 卡尔克萨狂风呼啸 + 悲怆诡异宫廷小调弦音
      },
      "2-3": {
        drone1: 43.65, drone2: 65.41, wave1: 'sine', wave2: 'sawtooth', filterType: 'lowpass', baseCutoff: 105,
        melodyWave: 'triangle', scale: [130.81, 146.83, 174.61, 196.00, 220.00, 261.63, 293.66],
        tempoMs: 490, ringFreq: 1560 // 满月海潮低频轰鸣 + 深潜者神庙青铜钟吟
      },
      "2-4": {
        drone1: 61.74, drone2: 92.50, wave1: 'sawtooth', wave2: 'triangle', filterType: 'bandpass', baseCutoff: 210,
        melodyWave: 'sine', scale: [246.94, 293.66, 329.63, 369.99, 440.00, 493.88, 587.33],
        tempoMs: 310, ringFreq: 1920 // 羽蛇神殿嘶鸣共振 + 古玛雅五声音阶陶笛
      },
      "2-5": {
        drone1: 41.20, drone2: 61.74, wave1: 'sine', wave2: 'triangle', filterType: 'lowpass', baseCutoff: 92,
        melodyWave: 'sine', scale: [146.83, 164.81, 174.61, 196.00, 220.00, 246.94, 261.63],
        tempoMs: 620, ringFreq: 1320 // 黑佛沉眠低频鼻息 + 恩开伊地底水滴回响
      }
    };
  }

  getProfile() {
    return this.profiles[this.currentCreatureId] || this.profiles["1-1"];
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.0;
    this.masterGain.connect(this.ctx.destination);

    this.droneFilter = this.ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.value = 140;
    this.droneFilter.Q.value = 4.5;
    this.droneFilter.connect(this.masterGain);

    this.droneOsc1 = this.ctx.createOscillator();
    const d1Gain = this.ctx.createGain();
    d1Gain.gain.value = 0.22;
    this.droneOsc1.connect(d1Gain);
    d1Gain.connect(this.droneFilter);
    this.droneOsc1.start();

    this.droneOsc2 = this.ctx.createOscillator();
    const d2Gain = this.ctx.createGain();
    d2Gain.gain.value = 0.24;
    this.droneOsc2.connect(d2Gain);
    d2Gain.connect(this.droneFilter);
    this.droneOsc2.start();

    this.gazeRingingOsc = this.ctx.createOscillator();
    this.gazeRingingOsc.type = 'sine';
    this.gazeRingingGain = this.ctx.createGain();
    this.gazeRingingGain.gain.value = 0.0;
    this.gazeRingingOsc.connect(this.gazeRingingGain);
    this.gazeRingingGain.connect(this.masterGain);
    this.gazeRingingOsc.start();

    this.melodyGain = this.ctx.createGain();
    this.melodyGain.gain.value = 0.15;
    this.melodyGain.connect(this.masterGain);

    this.applyEntityProfile(this.currentCreatureId);
    this.startProceduralLoop();
  }

  // 切换怪物时实时切换底噪波形、基频与共振腔类型
  applyEntityProfile(creatureId) {
    this.currentCreatureId = creatureId;
    if (!this.ctx) return;
    const p = this.profiles[creatureId] || this.profiles["1-1"];
    const now = this.ctx.currentTime;
    this.droneOsc1.type = p.wave1;
    this.droneOsc2.type = p.wave2;
    this.droneOsc1.frequency.setTargetAtTime(p.drone1, now, 0.15);
    this.droneOsc2.frequency.setTargetAtTime(p.drone2, now, 0.15);
    this.droneFilter.type = p.filterType;
    this.droneFilter.frequency.setTargetAtTime(p.baseCutoff, now, 0.15);
    this.gazeRingingOsc.frequency.setTargetAtTime(p.ringFreq, now, 0.15);
  }

  startProceduralLoop() {
    const triggerNote = () => {
      const p = this.getProfile();
      if (this.isEnabled && this.ctx && this.ctx.state === 'running') {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = p.melodyWave;
        const baseFreq = p.scale[Math.floor(Math.random() * p.scale.length)];
        // 1-2 犹格·索托斯保持清脆水晶钟摆音高；其他邪神随凝视产生滑音扭曲
        const bendRange = this.currentCreatureId === "1-2" ? 4 : (14 + this.gazeIntensity * 95);
        const bend = (Math.random() - 0.5) * bendRange;
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(Math.max(45, baseFreq + bend), now + 0.42);

        filter.type = this.currentCreatureId === "1-3" ? 'lowpass' : 'bandpass';
        filter.frequency.value = baseFreq * 1.4;
        filter.Q.value = this.currentCreatureId === "1-2" ? 6.0 : 3.0;

        const dur = this.currentCreatureId === "1-2" ? 0.55 : (0.28 + Math.random() * 0.4);
        noteGain.gain.setValueAtTime(0.001, now);
        noteGain.gain.linearRampToValueAtTime(0.32, now + 0.04);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        osc.connect(filter);
        filter.connect(noteGain);
        noteGain.connect(this.melodyGain);

        osc.start(now);
        osc.stop(now + dur + 0.02);
      }
      const interval = Math.max(95, (p.tempoMs / this.entropyScale) * (1 - this.gazeIntensity * 0.55) + Math.random() * 160);
      this.loopTimer = setTimeout(triggerNote, interval);
    };
    triggerNote();
  }

  toggle() {
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.isEnabled = !this.isEnabled;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.isEnabled ? 0.65 : 0.0, now, 0.15);
    return this.isEnabled;
  }

  setMuted(muted) {
    if (!this.ctx || !this.masterGain) return;
    const active = !muted && this.isEnabled;
    this.masterGain.gain.setTargetAtTime(active ? 0.65 : 0.0, this.ctx.currentTime, 0.12);
  }

  // 每帧由外部传入 WebGPU/AppState 状态，驱动程序化声学实时调制
  updateFromGPUState(state) {
    if (!this.isEnabled || !this.ctx) return;
    this.gazeIntensity = state.gazeIntensity;
    this.entropyScale = state.entropyScale;
    const p = this.getProfile();
    const now = this.ctx.currentTime;
    const proximity = Math.max(0, (8.5 - state.camRadius) / 6.0);
    const cutoff = p.baseCutoff + proximity * 160 + this.gazeIntensity * 460 + (this.entropyScale - 1.0) * 85;
    this.droneFilter.frequency.setTargetAtTime(cutoff, now, 0.08);
    this.droneOsc2.frequency.setTargetAtTime(p.drone2 + this.gazeIntensity * 14.0, now, 0.08);
    this.gazeRingingGain.gain.setTargetAtTime(this.gazeIntensity * 0.12, now, 0.06);
  }
}