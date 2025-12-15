export const AudioController = {
    ctx: null,
    masterGain: null,
    bgmOscillators: [],
    isMuted: false,
    volume: 0.3,
    bgmInterval: null,

    init: function() {
        if (this.ctx) {
            if(this.ctx.state === 'suspended') this.ctx.resume();
            return;
        }
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.isMuted ? 0 : this.volume;
        this.masterGain.connect(this.ctx.destination);
    },

    setVolume: function(val) {
        this.volume = val;
        if(this.masterGain && this.ctx) this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    },

    playHit: function(type) {
        if(!this.ctx || this.isMuted || this.volume <= 0) return;
        const t = this.ctx.currentTime;
        const g = this.ctx.createGain();
        g.connect(this.masterGain);
        
        g.gain.setValueAtTime(0.2, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

        // Simple Tone generator for hit sounds
        const playOsc = (type, startFreq, endFreq) => {
            const o = this.ctx.createOscillator(); o.type = type;
            o.frequency.setValueAtTime(startFreq, t); 
            o.frequency.exponentialRampToValueAtTime(endFreq, t + 0.1);
            o.connect(g); o.start(t); o.stop(t + 0.1);
        }

        if (type === 'mine') playOsc('square', 200, 50);
        else if (type === 'forest') playOsc('triangle', 150, 60);
        else if (type === 'ice') { playOsc('sine', 800, 1200); playOsc('triangle', 400, 100); }
        else if (type === 'desert') {
             // Noise burst logic
             const bSize = this.ctx.sampleRate * 0.1;
             const b = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate);
             const d = b.getChannelData(0); for(let i=0; i<bSize; i++) d[i] = Math.random() * 2 - 1;
             const src = this.ctx.createBufferSource(); src.buffer = b;
             const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 800;
             src.connect(f); f.connect(g); src.start(t);
        }
    },

    playTone: function(freq, duration, type = 'square', vol = 0.1) {
        if(!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }
};