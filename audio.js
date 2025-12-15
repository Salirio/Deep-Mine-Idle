export const AudioController = {
    ctx: null,
    masterGain: null,
    isMuted: false,
    volume: 0.3,
    currentBgm: null,
    bgmInterval: null,
    noteIndex: 0,

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
            playOsc('sine', 1500, 1000);
            playOsc('sine', 2000, 1500);
        }
    },
    
    // NEW: 8-Bit Arpeggiator BGM
    playBGM: function(world) {
        if(!this.ctx) return;
        
        // Stop previous BGM
        if(this.bgmInterval) clearInterval(this.bgmInterval);
        this.currentBgm = world;
        this.noteIndex = 0;
        
        if(this.isMuted || this.volume <= 0) return;

        // Melodies (Frequencies in Hz)
        let melody = [];
        let speed = 250; // ms per note

        if (world === 'mine') {
            melody = [220, 0, 261, 0, 329, 0, 261, 0]; // A Minor Arp
        } else if (world === 'forest') {
            melody = [329, 392, 440, 392]; // E G A G
            speed = 400;
        } else if (world === 'desert') {
            melody = [293, 311, 0, 349, 311, 293]; // Phrygian vibe
            speed = 300;
        } else if (world === 'ice') {
            melody = [523, 659, 783, 659]; // High C Major
            speed = 200;
        } else if (world === 'christmas') {
            melody = [392, 523, 523, 587, 523, 493, 440, 440]; // Jingle Bells start
            speed = 250;
        }

        // Loop Function
        this.bgmInterval = setInterval(() => {
            if(this.isMuted || this.volume <= 0) return;
            
            const freq = melody[this.noteIndex % melody.length];
            this.noteIndex++;

            if(freq > 0) {
                const t = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                
                osc.type = 'square'; // 8-bit sound
                osc.frequency.value = freq;
                
                // Short pluck envelope
                gain.gain.setValueAtTime(0.05, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
                
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(t);
                osc.stop(t + 0.2);
            }
        }, speed);
    }
};
