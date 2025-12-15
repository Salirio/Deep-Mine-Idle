import { State, Avatar } from './state.js';
import { Worlds } from './data.js';
import { AudioController } from './audio.js';

// LogicRef is used to call GameLogic methods without importing logic.js directly (circular dependency fix)
let LogicRef = null;

export const UI = {
    particles: [],
    floaters: [],
    shake: 0,
    currentShopTab: 'hat',
    mouseX: 0, mouseY: 0,
    
    // Canvas Contexts
    blockCtx: null, bgPatternCtx: null, ctx: null,

    init: function(GameLogic) {
        LogicRef = GameLogic; 
        
        // Setup Canvas
        const bCan = document.createElement('canvas'); bCan.width = 320; bCan.height = 320;
        this.blockCtx = bCan.getContext('2d');
        this.blockCanvas = bCan;

        const bgCan = document.createElement('canvas'); bgCan.width = 128; bgCan.height = 128;
        this.bgPatternCtx = bgCan.getContext('2d');
        this.bgPatternCanvas = bgCan;

        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.wrapper = document.getElementById('game-wrapper');

        // Mouse Tracker
        if(this.wrapper) {
            this.wrapper.addEventListener('mousemove', (e) => {
                const rect = this.canvas.getBoundingClientRect();
                this.mouseX = e.clientX - rect.left;
                this.mouseY = e.clientY - rect.top;
            });
            this.wrapper.addEventListener('click', (e) => {
                const rect = this.canvas.getBoundingClientRect();
                LogicRef.hitBlock(e.clientX - rect.left, e.clientY - rect.top);
            });
        }
    },

    update: function() {
        if (!LogicRef) return;
        const act = State[State.activeWorld];
        const conf = Worlds[State.activeWorld];

        // Helper
        const setText = (id, txt) => { const el = document.getElementById(id); if(el) el.innerText = txt; };
        
        setText('depthDisplay', act.depth);
        setText('goldDisplayBig', LogicRef.formatNumber(act.gold));
        setText('dpsDisplay', LogicRef.formatNumber(LogicRef.calculateDPS()));
        
        // HP Bar
        let hpPercent = (Math.max(0, act.currentHp) / act.maxHp) * 100;
        const hpBar = document.getElementById('hp-bar-fill');
        if(hpBar) hpBar.style.width = hpPercent + "%";
        setText('hp-text-overlay', `${LogicRef.formatNumber(Math.max(0, act.currentHp))} / ${LogicRef.formatNumber(act.maxHp)}`);

        // Miners List UI Updates
        conf.miners.forEach((type, index) => {
            let m = act.miners[index];
            if(document.getElementById(`m-lvl-${index}`)) {
                document.getElementById(`m-lvl-${index}`).innerText = "Lvl " + m.level;
                
                let milestoneBonus = Math.pow(2, Math.floor(m.level / 10));
                let skillMult = 1 + ((m.skills.dps||0) * 0.20);
                let dpsVal = (m.level * type.basePower) * milestoneBonus * skillMult;
                
                let boostHtml = (m.level >= 10) ? ` <span style="color:#f1c40f; font-size:9px;">(x${milestoneBonus})</span>` : "";
                if((m.skills.dps||0) > 0) boostHtml += ` <span style="color:#e74c3c; font-size:9px;">(+${m.skills.dps*20}%)</span>`;
                
                document.getElementById(`m-dps-${index}`).innerHTML = LogicRef.formatNumber(dpsVal) + boostHtml;
                
                // Recalculate cost for button state
                let costMult = 1;
                if(State.artifactsFound && State.artifactsFound.includes('fossil')) costMult = 0.9;
                if(m.skills && m.skills.cost) costMult -= (m.skills.cost * 0.02);
                let baseCost = (m.level===0) ? type.baseCost : Math.floor(type.baseCost * Math.pow(1.20, m.level));
                let cost = Math.floor(baseCost * costMult);

                let btn = document.getElementById(`m-btn-${index}`);
                if(btn) btn.disabled = act.gold < cost;
            }
        });

        // Other HUD elements
        setText('bossKillDisplay', act.bossKills);
        setText('bossBuffDisplay', (act.bossKills * 10));
        setText('aetheriumDisplay', act.prestige);
        setText('multDisplay', (act.prestige * 10).toLocaleString());
        setText('snowflake-display', State.snowflakes);
        
        // Fabric/Silk
        const fabContainer = document.getElementById('fabric-display-container');
        const fabIcon = document.querySelector('#fabric-display-container span:first-child');
        if(State.activeWorld === 'christmas') {
            if(fabIcon) fabIcon.innerText = '🧣';
            setText('fabric-hud-amount', State.silk);
            if(fabContainer) fabContainer.style.borderColor = "#e74c3c";
        } else {
            if(fabIcon) fabIcon.innerText = '🧶';
            setText('fabric-hud-amount', State.fabric);
            if(fabContainer) fabContainer.style.borderColor = "#aaa";
        }

        this.renderLoop();
    },

    renderLoop: function() {
        if(!this.ctx) return;
        this.ctx.fillStyle = "#111"; 
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Shake
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
        
        // Particles & Floaters
        if (State.settings.animations) {
            for(let i=this.particles.length-1; i>=0; i--) {
                let p = this.particles[i];
                if (p.type === 'sparkle') {
                    this.ctx.save(); this.ctx.translate(p.x, p.y); this.ctx.rotate(p.angle); this.ctx.fillStyle = p.color; this.ctx.globalAlpha = p.life; 
                    this.ctx.beginPath(); this.ctx.moveTo(0, -p.size/2); this.ctx.quadraticCurveTo(2, 0, p.size/2, 0); this.ctx.quadraticCurveTo(2, 0, 0, p.size/2);
                    this.ctx.quadraticCurveTo(-2, 0, -p.size/2, 0); this.ctx.quadraticCurveTo(-2, 0, 0, -p.size/2); this.ctx.fill(); this.ctx.restore(); p.angle += 0.2; 
                } else { this.ctx.fillStyle = p.color; this.ctx.fillRect(p.x, p.y, p.size, p.size); }
                p.x+=p.vx; p.y+=p.vy; p.life-=0.04; if(p.type !== 'sparkle') p.size*=0.9; if(p.life<=0) this.particles.splice(i,1);
            }
            this.ctx.font = "bold 14px Courier New";
            for(let i=this.floaters.length-1; i>=0; i--) { let f = this.floaters[i]; this.ctx.fillStyle = f.color; this.ctx.fillText(f.text, f.x, f.y); f.y-=1; f.life-=0.02; if(f.life<=0) this.floaters.splice(i,1); }
        }
        
        this.ctx.restore();
    },

    spawnFloater: function(x, y, text, color) { 
        if (State.settings.animations) this.floaters.push({ x, y, text, color, life: 1.0 }); 
    },
    
    spawnParticles: function(x, y, amount, color = null) {
        if (!State.settings.animations) return;
        let mat = Worlds[State.activeWorld].materials[State[State.activeWorld].matIndex]; 
        if (!mat) return;
        let c = color ? color : `rgb(${mat.speck.join(',')})`;
        if (State.isLucky && !color) c = "rgb(255, 215, 0)"; 
        if (State.isBoss && !color) c = "#e74c3c";
        for(let i=0; i<amount; i++) { this.particles.push({ x: x, y: y, vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10, life: 1.0, color: c, size: Math.random()*5+2, type: 'square' }); }
    },

    generateBlockTexture: function() {
        State.cracks = []; State.impactX = null; State.impactY = null;
        let act = State[State.activeWorld]; 
        let conf = Worlds[State.activeWorld];
        let totalMatIndex = Math.floor((act.depth - 1) / Worlds.STAGE_LENGTH);
        act.loopCount = Math.floor(totalMatIndex / conf.materials.length);
        act.matIndex = totalMatIndex % conf.materials.length;
        let mat = conf.materials[act.matIndex];
        if (!mat) mat = conf.materials[0];

        // Boss Logic
        if (State.activeWorld === 'christmas' && act.depth === 400) {
            State.isBoss = true;
            act.maxHp = 500000000; 
        } else {
            State.isBoss = (act.depth % Worlds.STAGE_LENGTH === 0);
        }
        State.isLucky = false;

        // HP Calculation
        let growth = (State.activeWorld === 'christmas') ? 1.045 : 1.055;
        let baseHp = (State.activeWorld === 'christmas') ? 50 : 2;
        let rawHp = baseHp * Math.pow(growth, act.depth);
        
        if (State.isBoss && (State.activeWorld !== 'christmas' || act.depth !== 400)) {
            rawHp *= 8;
        } else if (!State.isBoss) {
            State.isLucky = Math.random() < 0.05;
            if(State.isLucky) rawHp *= 0.5;
        }

        act.maxHp = Math.floor(rawHp);
        act.currentHp = act.maxHp;

        // Drawing
        this.blockCtx.clearRect(0,0,320,320);
        let baseColor = State.isLucky ? [255, 215, 0] : mat.color; 
        if (State.isBoss && State.activeWorld !== 'christmas') baseColor = [40, 0, 0];

        this.blockCtx.fillStyle = `rgb(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]})`;
        this.blockCtx.fillRect(0, 0, 320, 320);
        
        // Simple Texture overlay
        for(let i=0; i<20; i++) { 
            this.blockCtx.fillStyle = `rgba(0,0,0,0.15)`; 
            this.blockCtx.beginPath(); 
            this.blockCtx.arc(Math.random()*320, Math.random()*320, Math.random()*60+20, 0, Math.PI*2); 
            this.blockCtx.fill(); 
        }

        // Loop border
        if (act.loopCount > 0) { 
            this.blockCtx.strokeStyle = "rgba(0,0,0,0.2)"; this.blockCtx.lineWidth = 15; 
            this.blockCtx.strokeRect(0, 0, 320, 320); 
        }
    },
    
    // Bridge to show modal from main logic if needed
    updateActiveMiners: function() {
        const layer = document.getElementById('active-miners-layer'); 
        if(!layer || !State.settings.animations) return;
        layer.innerHTML = ""; 
        let act = State[State.activeWorld];
        let conf = Worlds[State.activeWorld];
        act.miners.forEach((m, i) => {
            if (m.level > 0) {
                let side = Math.floor(i / 3); let posInSide = i % 3; let type = conf.miners[i];
                let div = document.createElement('div'); div.className = "field-miner anim-active";
                div.innerHTML = `<div class="bot-body" style="background-color: ${type.color}"><div class="bot-arm"></div></div>`;
                let offset = 40 + (posInSide * 80); 
                if (side === 0) { div.style.bottom = "10px"; div.style.left = offset + "px"; } 
                else if (side === 1) { div.style.left = "10px"; div.style.top = offset + "px"; div.style.transform = "rotate(90deg)"; } 
                else if (side === 2) { div.style.right = "10px"; div.style.top = offset + "px"; div.style.transform = "rotate(-90deg)"; } 
                else { div.style.top = "10px"; div.style.left = offset + "px"; div.style.transform = "rotate(180deg)"; }
                layer.appendChild(div);
            }
        });
    },

    renderMinerList: function() {
        if (!LogicRef) return;
        const list = document.getElementById('miner-list'); 
        if(!list) return;
        list.innerHTML = ""; 
        let conf = Worlds[State.activeWorld]; 
        let act = State[State.activeWorld];
        
        conf.miners.forEach((type, index) => {
            let m = act.miners[index];
            let lvl = m.level;
            
            let milestoneBonus = Math.pow(2, Math.floor(lvl / 10));
            let skillMult = 1 + (m.skills.dps * 0.20);
            let dps = (lvl * type.basePower) * milestoneBonus * skillMult;
            
            let costMult = 1;
            if(State.artifactsFound && State.artifactsFound.includes('fossil')) costMult = 0.9;
            if(m.skills && m.skills.cost) costMult -= (m.skills.cost * 0.02);
            let baseCost = (m.level === 0) ? type.baseCost : Math.floor(type.baseCost * Math.pow(1.20, m.level));
            let cost = Math.floor(baseCost * costMult);

            let div = document.createElement('div'); div.className = "miner-card"; div.id = `miner-card-${index}`;
            let gearClass = "gear-btn-square";
            
            // LogicRef usage in string for HTML
            div.innerHTML = `
            <div class="miner-icon-area">
                <div class="bot-body" id="bot-body-${index}"><div class="bot-arm"></div></div>
                <div class="locked-icon" id="locked-icon-${index}" style="${lvl>0?'display:none':''}">?</div>
            </div>
            <div class="miner-info">
                <h4 style="color:${type.color}">${type.name} <span id="m-lvl-${index}" style="color:#fff; font-size:10px;">Lvl ${lvl}</span></h4>
                <p>DPS: <span id="m-dps-${index}">${LogicRef.formatNumber(dps)}</span></p>
            </div>
            <div class="miner-actions">
                <button class="miner-btn" id="m-btn-${index}" onclick="GameLogic.buyMiner(${index})">${lvl===0?"Kaufen":"Upgr"}<br>${LogicRef.formatNumber(cost)}</button>
                <div id="gear-btn-${index}" class="${gearClass}" onclick="GameLogic.openBotSkills(${index})">⚙️</div>
            </div>`;
            list.appendChild(div);
        });
    }
};