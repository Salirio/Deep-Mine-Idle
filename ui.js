import { State, Avatar } from './state.js';
import { Worlds } from './data.js';
import { AudioController } from './audio.js';

let LogicRef = null;

export const UI = {
    particles: [],
    floaters: [],
    shake: 0,
    currentShopTab: 'hat',
    
    // Canvas
    blockCtx: null, bgPatternCtx: null, ctx: null,

    init: function(GameLogic) {
        LogicRef = GameLogic; 
        const bCan = document.createElement('canvas'); bCan.width = 320; bCan.height = 320;
        this.blockCtx = bCan.getContext('2d');
        this.blockCanvas = bCan;
        const bgCan = document.createElement('canvas'); bgCan.width = 128; bgCan.height = 128;
        this.bgPatternCtx = bgCan.getContext('2d');
        this.bgPatternCanvas = bgCan;
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.wrapper = document.getElementById('game-wrapper');

        if(this.wrapper) {
            this.wrapper.addEventListener('click', (e) => {
                const rect = this.canvas.getBoundingClientRect();
                LogicRef.hitBlock(e.clientX - rect.left, e.clientY - rect.top);
            });
        }
    },

    // --- MODAL HELPERS ---
    openSettings: () => document.getElementById('settings-modal').style.display = 'flex',
    closeSettings: () => document.getElementById('settings-modal').style.display = 'none',
    
    openWorldTravel: () => document.getElementById('world-modal').style.display = 'flex',
    closeWorldTravel: () => document.getElementById('world-modal').style.display = 'none',
    
    openPrestige: function() { 
        document.getElementById('prestige-modal').style.display = 'flex';
        // Update Prestige UI Values
        document.getElementById('prestige-reward-amount').innerText = Math.floor(State[State.activeWorld].depth / 20);
        document.getElementById('prestige-req').innerText = 50 + (State[State.activeWorld].prestigeCount * 20);
    },
    closePrestige: () => document.getElementById('prestige-modal').style.display = 'none',
    
    openAetheriumShop: () => document.getElementById('aetherium-modal').style.display = 'flex',
    closeAetheriumShop: () => document.getElementById('aetherium-modal').style.display = 'none',
    
    openAchievements: () => document.getElementById('achieve-modal').style.display = 'flex',
    closeAchievements: () => document.getElementById('achieve-modal').style.display = 'none',
    
    openPetShop: () => document.getElementById('pet-modal').style.display = 'flex',
    closePetShop: () => document.getElementById('pet-modal').style.display = 'none',
    
    openExchange: () => document.getElementById('exchange-modal').style.display = 'flex',
    closeExchange: () => document.getElementById('exchange-modal').style.display = 'none',
    
    openEventCenter: () => document.getElementById('event-modal').style.display = 'flex',
    closeEventCenter: () => document.getElementById('event-modal').style.display = 'none',
    
    openEventShop: () => document.getElementById('event-shop-modal').style.display = 'flex',
    closeEventShop: () => document.getElementById('event-shop-modal').style.display = 'none',

    openPlayerCard: function() { 
        document.getElementById('player-modal').style.display = 'flex';
        this.renderAvatarPreview();
        this.renderShop();
    },
    closePlayerCard: () => document.getElementById('player-modal').style.display = 'none',

    // --- OTHER UI FUNCTIONS ---
    updateName: function() { Avatar.name = document.getElementById('player-name-input').value; },
    switchTab: function(tab) { this.currentShopTab = tab; this.renderShop(); },
    buyOrEquip: function(item) {
        if(!Avatar.unlocked.includes(item.id)) {
            // Simplistic free buy for now to fix errors, real logic needs currency check
            Avatar.unlocked.push(item.id);
        }
        Avatar.equipped[this.currentShopTab] = item.id;
        this.renderShop(); this.renderAvatarPreview();
    },
    togglePerformance: function() {
        State.settings.animations = !State.settings.animations;
        document.getElementById('anim-toggle').classList.toggle('active');
    },
    updateExchangeRate: function() {
        // Visual update placeholder
        document.getElementById('ex-rate-display').innerText = "Berechne...";
    },
    switchMainTab: function(tab) {
        if(tab === 'miners') {
            document.getElementById('miner-list').style.display = 'flex';
            document.getElementById('click-list').style.display = 'none';
        } else {
            document.getElementById('miner-list').style.display = 'none';
            document.getElementById('click-list').style.display = 'flex';
        }
    },
    openBotSkills: function(index) {
        document.getElementById('bot-skill-modal').style.display = 'flex';
        // Render bot info...
    },
    closeBotSkills: () => document.getElementById('bot-skill-modal').style.display = 'none',

    // --- RENDERING ---
    update: function() {
        if (!LogicRef) return;
        const act = State[State.activeWorld];
        const setText = (id, txt) => { const el = document.getElementById(id); if(el) el.innerText = txt; };
        
        setText('depthDisplay', act.depth);
        setText('goldDisplayBig', LogicRef.formatNumber(act.gold));
        setText('dpsDisplay', LogicRef.formatNumber(LogicRef.calculateDPS()));
        
        let hpPercent = (Math.max(0, act.currentHp) / act.maxHp) * 100;
        const hpBar = document.getElementById('hp-bar-fill');
        if(hpBar) hpBar.style.width = hpPercent + "%";
        setText('hp-text-overlay', `${LogicRef.formatNumber(Math.max(0, act.currentHp))} / ${LogicRef.formatNumber(act.maxHp)}`);

        // Miner Buttons
        let conf = Worlds[State.activeWorld];
        conf.miners.forEach((type, index) => {
            let m = act.miners[index];
            if(document.getElementById(`m-lvl-${index}`)) {
                document.getElementById(`m-lvl-${index}`).innerText = "Lvl " + m.level;
                let dpsVal = (m.level * type.basePower); // simplified calc
                document.getElementById(`m-dps-${index}`).innerHTML = LogicRef.formatNumber(dpsVal);
            }
        });

        // Loop render
        this.renderLoop();
    },

    renderLoop: function() {
        if(!this.ctx) return;
        this.ctx.fillStyle = "#111"; 
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        let sx=0, sy=0;
        if(State.settings.animations && this.shake>0) { 
            sx=(Math.random()-0.5)*this.shake; 
            sy=(Math.random()-0.5)*this.shake; 
            this.shake*=0.9; 
            if(this.shake<0.5) this.shake=0; 
        }
        
        this.ctx.save(); 
        this.ctx.translate(sx, sy); 
        this.ctx.drawImage(this.blockCanvas, 0, 0);
        
        if (State.settings.animations) {
            for(let i=this.particles.length-1; i>=0; i--) {
                let p = this.particles[i];
                this.ctx.fillStyle = p.color; this.ctx.fillRect(p.x, p.y, p.size, p.size);
                p.x+=p.vx; p.y+=p.vy; p.life-=0.04; if(p.life<=0) this.particles.splice(i,1);
            }
            this.ctx.font = "bold 14px Courier New";
            for(let i=this.floaters.length-1; i>=0; i--) { 
                let f = this.floaters[i]; 
                this.ctx.fillStyle = f.color; 
                this.ctx.fillText(f.text, f.x, f.y); 
                f.y-=1; f.life-=0.02; 
                if(f.life<=0) this.floaters.splice(i,1); 
            }
        }
        this.ctx.restore();
    },

    spawnFloater: function(x, y, text, color) { 
        if (State.settings.animations) this.floaters.push({ x, y, text, color, life: 1.0 }); 
    },
    spawnParticles: function(x, y, amount) {
        if (!State.settings.animations) return;
        for(let i=0; i<amount; i++) { this.particles.push({ x: x, y: y, vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10, life: 1.0, color: '#fff', size: 3 }); }
    },
    spawnBubbleElement: function(cb) {
        let b = document.createElement('div');
        b.className = 'mystery-bubble';
        b.style.top = (Math.random() * 80 + 10) + "%";
        b.style.left = "-80px"; 
        b.onclick = () => { document.body.removeChild(b); cb(); };
        document.body.appendChild(b);
        // Animation placeholder
        setTimeout(() => b.style.left = "110vw", 100);
        setTimeout(() => { if(b.parentNode) document.body.removeChild(b); }, 10000);
    },

    generateBlockTexture: function() {
        let act = State[State.activeWorld];
        let conf = Worlds[State.activeWorld];
        let mat = conf.materials[act.matIndex] || conf.materials[0];
        
        // HP Logic
        let rawHp = 2 * Math.pow(1.055, act.depth);
        act.maxHp = Math.floor(rawHp);
        act.currentHp = act.maxHp;

        this.blockCtx.clearRect(0,0,320,320);
        this.blockCtx.fillStyle = `rgb(${mat.color.join(',')})`;
        this.blockCtx.fillRect(0, 0, 320, 320);
    },
    
    renderMinerList: function() {
        if (!LogicRef) return;
        const list = document.getElementById('miner-list'); 
        list.innerHTML = ""; 
        let conf = Worlds[State.activeWorld]; 
        
        conf.miners.forEach((type, index) => {
            let div = document.createElement('div'); div.className = "miner-card";
            div.innerHTML = `
            <div class="miner-info">
                <h4 style="color:${type.color}">${type.name} <span id="m-lvl-${index}" style="color:#fff; font-size:10px;">Lvl 0</span></h4>
                <p>DPS: <span id="m-dps-${index}">0</span></p>
            </div>
            <div class="miner-actions">
                <button class="miner-btn" id="m-btn-${index}" onclick="GameLogic.buyMiner(${index})">Kaufen</button>
                <div class="gear-btn-square" onclick="GameLogic.openBotSkills(${index})">⚙️</div>
            </div>`;
            list.appendChild(div);
        });
    },
    
    updateActiveMiners: function() {}, // Placeholder
    renderAvatarPreview: function() {}, // Placeholder
    renderShop: function() {} // Placeholder
};
