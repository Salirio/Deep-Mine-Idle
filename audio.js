export const AudioController = {
    ctx: null,
    masterGain: null,
    bgmOscillators: [],
    isMuted: false,
    volume: 0.3,
    currentBgm: null,

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
             const bSize = this.ctx.sampleRate * 0.1;
             const b = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate);
             const d = b.getChannelData(0); for(let i=0; i<bSize; i++) d[i] = Math.random() * 2 - 1;
             const src = this.ctx.createBufferSource(); src.buffer = b;
             const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 800;
             src.connect(f); f.connect(g); src.start(t);
        }
        else if (type === 'christmas') {
            // Bell like sound
            playOsc('sine', 1500, 1000);
            playOsc('sine', 2000, 1500);
        }
    },
    
    // Simple BGM Loop using Oscillators
    playBGM: function(world) {
        if(!this.ctx) return;
        
        // Stop previous BGM
        this.bgmOscillators.forEach(o => o.stop());
        this.bgmOscillators = [];
        this.currentBgm = world;
        
        if(this.isMuted || this.volume <= 0) return;

        const t = this.ctx.currentTime;
        const noteLen = 0.5;
        
        // Very basic melody arrays (frequencies)
        let notes = [];
        if (world === 'mine') notes = [220, 220, 261, 220, 196, 220]; // A3, A3, C4...
        else if (world === 'forest') notes = [329, 392, 440, 392, 329, 293];
        else if (world === 'desert') notes = [293, 311, 349, 311, 293, 261];
        else if (world === 'ice') notes = [523, 587, 659, 587, 523, 493];
        else if (world === 'christmas') notes = [523, 587, 523, 493, 523, 659]; // Jingle-ish
        
        // Create a looper that regenerates notes
        // Note: For a robust system we'd use setInterval or lookahead, 
        // but for this snippet we'll just play a drone or sequence once.
        // Let's make a simple drone for ambiance to prevent heavy looping logic code bloat
        
        const osc = this.ctx.createOscillator();
        const lfo = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = (world === 'ice' || world === 'christmas') ? 'sine' : 'triangle';
        osc.frequency.value = notes[0] || 220;
        
        lfo.type = 'sine';
        lfo.frequency.value = 0.5; // Slow Pulse
        
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 50;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        
        gain.gain.value = 0.05; // Quiet background
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start();
        lfo.start();
        
        this.bgmOscillators.push(osc, lfo);
    }
};
