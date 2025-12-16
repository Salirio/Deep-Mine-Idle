import { State, Avatar } from './state.js';
import { Worlds } from './data.js';
import { AudioController } from './audio.js';

let LogicRef = null;

export const UI = {
    particles: [], floaters: [], shake: 0, currentShopTab: 'hat', currentMainTab: 'miners',
    blockCtx: null, bgPatternCtx: null, ctx: null,
    bgTextureUrl: null,

    init: function(GameLogic) {
        LogicRef = GameLogic; 
        const bCan = document.createElement('canvas'); bCan.width = 320; bCan.height = 320;
        this.blockCtx = bCan.getContext('2d');
        this.blockCanvas = bCan;
        
        // Background Pattern
        const bgCan = document.createElement('canvas'); bgCan.width = 4; bgCan.height = 4;
        const bgCtx = bgCan.getContext('2d');
        bgCtx.fillStyle = "rgba(255,255,255,0.05)";
        bgCtx.fillRect(0,0,2,2); 
        bgCtx.fillRect(2,2,2,2);
        this.bgTextureUrl = bgCan.toDataURL();
        document.body.style.backgroundImage = `url(${this.bgTextureUrl})`;
        
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.wrapper = document.getElementById('game-wrapper');

        if(this.wrapper) {
            this.wrapper.addEventListener('click', (e) => {
                const rect = this.canvas.getBoundingClientRect();
                LogicRef.hitBlock(e.clientX - rect.left, e.clientY - rect.top);
            });
        }
        this.renderAvatarIcon();
    },

    // --- MODAL HELPERS ---
    openSettings: () => document.getElementById('settings-modal').style.display = 'flex',
    closeSettings: () => document.getElementById('settings-modal').style.display = 'none',
    
    openWorldTravel: function() {
        document.getElementById('world-modal').style.display = 'flex';
        this.checkWorldUnlock(); 
    },
    
    checkWorldUnlock: function() {
        const COST = 1e12; 
        const updateBtn = (id, worldObj, prevWorldObj, unlockCost, currencyName) => {
            const btn = document.getElementById(id);
            if(!btn) return;
            if (worldObj.unlocked) {
                btn.innerText = "REISEN"; 
                btn.className = "btn-travel"; 
                btn.onclick = () => LogicRef.travelTo(worldObj === State.forest ? 'forest' : (worldObj === State.desert ? 'desert' : 'ice')); 
                btn.disabled = State.activeWorld === (worldObj === State.forest ? 'forest' : (worldObj === State.desert ? 'desert' : 'ice'));
            } else {
                if (prevWorldObj.maxDepth >= 1000) {
                     btn.innerText = `FREISCHALTEN\n(1 Bio. ${currencyName})`;
                     btn.className = "btn-unlock";
                     if (prevWorldObj.gold >= unlockCost) {
                         btn.disabled = false;
                         btn.onclick = () => {
                            if(worldObj === State.forest) LogicRef.tryUnlockForest(unlockCost);
                            if(worldObj === State.desert) LogicRef.tryUnlockDesert(unlockCost);
                            if(worldObj === State.ice) LogicRef.tryUnlockIce(unlockCost);
                         };
                     } else {
                         btn.disabled = true; 
                     }
                } else {
                     btn.innerText = "Benötigt: Tiefe 1000";
                     btn.className = "btn-unlock";
                     btn.disabled = true;
                }
            }
        };

        updateBtn('btn-forest-action', State.forest, State.mine, COST, 'Gold');
        updateBtn('btn-desert-action', State.desert, State.forest, COST, 'Harz');
        updateBtn('btn-ice-action', State.ice, State.desert, COST, 'Skara');

        const mineBtn = document.getElementById('btn-mine-action');
        if (State.activeWorld === 'mine') { 
            mineBtn.innerText = "AKTIV"; mineBtn.disabled = true; 
        } else { 
            mineBtn.innerText = "REISEN"; mineBtn.onclick = () => LogicRef.travelTo('mine'); mineBtn.disabled = false; 
        }
        
        ['mine', 'forest', 'desert', 'ice'].forEach(w => {
            const card = document.getElementById(`card-${w}`);
            if(card) card.className = (State.activeWorld === w) ? 'world-card active' : 'world-card';
        });
    },
    
    closeWorldTravel: () => document.getElementById('world-modal').style.display = 'none',
    
    openPrestige: function() { 
        document.getElementById('prestige-modal').style.display = 'flex';
        let act = State[State.activeWorld];
        document.getElementById('prestige-reward-amount').innerText = Math.floor(act.depth / 20);
        document.getElementById('prestige-req').innerText = 50 + (act.prestigeCount * 20);
        
        const floor = document.getElementById('dance-floor');
        while(floor.children.length > 1) floor.removeChild(floor.lastChild);
        
        let count = 0; let conf = Worlds[State.activeWorld];
        act.miners.forEach((m, i) => {
            if (m.level > 0 && count < 6) { 
                let type = conf.miners[i];
                let div = document.createElement('div'); div.className = "dancer";
                div.innerHTML = `<div class="bot-body" style="background-color: ${type.color}"><div class="bot-arm"></div></div>`;
                div.style.left = (Math.random() * 80 + 10) + "%"; div.style.top = (Math.random() * 60 + 20) + "px";
                floor.appendChild(div); count++;
            }
        });
        this.update();
    },
    closePrestige: () => document.getElementById('prestige-modal').style.display = 'none',
    
    openAetheriumShop: function() {
        document.getElementById('aetherium-modal').style.display = 'flex';
        const grid = document.getElementById('aetherium-list');
        grid.innerHTML = "";
        let act = State[State.activeWorld];
        let conf = Worlds[State.activeWorld];
        document.getElementById('aetherium-shop-display').innerText = act.prestige;

        let cLvl = act.clickUpgrade || 0;
        let cCost = 1 + (cLvl * 2);
        let clickEl = document.createElement('div'); clickEl.className = "shop-item";
        clickEl.style.border = "2px solid #e74c3c";
        clickEl.innerHTML = `<div style="font-size:10px; color:#e74c3c;">TITANEN GRIFF</div><div style="font-size:20px;">💪 ${cLvl}</div><div class="item-price">${cCost} 💎</div>`;
        clickEl.onclick = () => {
            if(act.prestige >= cCost) { act.prestige -= cCost; act.clickUpgrade = (act.clickUpgrade||0)+1; UI.openAetheriumShop(); UI.update(); }
        };
        grid.appendChild(clickEl);

        conf.miners.forEach((type, index) => {
            let lvl = act.minerUpgrades[index] || 0;
            let cost = 1 + (lvl * 2);
            let el = document.createElement('div'); el.className = "shop-item";
            el.innerHTML = `<div style="font-size:10px;">${type.name}</div><div style="font-size:18px;">⚡ ${lvl}</div><div class="item-price">${cost} 💎</div>`;
            el.onclick = () => {
                if(act.prestige >= cost) { act.prestige -= cost; act.minerUpgrades[index] = lvl+1; UI.openAetheriumShop(); UI.update(); }
            };
            grid.appendChild(el);
        });
    },
    closeAetheriumShop: () => document.getElementById('aetherium-modal').style.display = 'none',
    
    openAchievements: function() {
        document.getElementById('achieve-modal').style.display = 'flex';
        const list = document.getElementById('achieve-list');
        list.innerHTML = "";
        Worlds.achievements.forEach(ach => {
            let tier = State.achievementLevels[ach.id] || 0;
            let goal = Math.floor(ach.baseGoal * Math.pow(ach.scale, tier));
            if(ach.type === 'prestige') goal = ach.baseGoal + tier;
            
            let current = 0;
            let act = State[State.activeWorld];
            if(ach.type === 'depth') current = act.depth;
            if(ach.type === 'gold') current = act.gold;
            if(ach.type === 'clicks') current = State.stats.totalClicks;
            if(ach.type === 'boss') current = act.bossKills;
            if(ach.type === 'prestige') current = act.prestigeCount;
            
            let div = document.createElement('div'); div.className = "achieve-row";
            div.innerHTML = `<div class="achieve-icon">${ach.icon}</div><div><strong>${ach.name} (${tier})</strong><br><small>${LogicRef.formatNumber(current)} / ${LogicRef.formatNumber(goal)}</small></div>`;
            list.appendChild(div);
        });
    },
    closeAchievements: () => document.getElementById('achieve-modal').style.display = 'none',
    
    openPetShop: function() {
        document.getElementById('pet-modal').style.display = 'flex';
        const list = document.getElementById('pet-list');
        list.innerHTML = "";
        document.getElementById('trophy-display').innerText = State.trophies;
        Worlds.pets.forEach(pet => {
            let isOwned = State.ownedPets.includes(pet.id);
            let isActive = State.activePet === pet.id;
            let div = document.createElement('div');
            div.className = `shop-item ${isOwned ? 'owned' : ''}`;
            if(isActive) div.style.borderColor = "#f1c40f";
            
            div.innerHTML = `<div style="font-size:24px;">${pet.icon||'🐾'}</div><div class="item-name">${pet.name}</div><div class="item-price">${isOwned ? (isActive?'AKTIV':'Ausrüsten') : pet.cost + ' 🏆'}</div>`;
            div.onclick = () => { 
                if(!isOwned) {
                    if(State.trophies >= pet.cost) { State.trophies -= pet.cost; State.ownedPets.push(pet.id); UI.openPetShop(); }
                } else {
                    State.activePet = pet.id; UI.openPetShop();
                }
            };
            list.appendChild(div);
        });
    },
    closePetShop: () => document.getElementById('pet-modal').style.display = 'none',

openMobileMenu: function() {
        document.getElementById('mobile-menu-modal').style.display = 'flex';
        
        // Try to fill the menu immediately
        if(this.updateMobileMenuButtons()) {
            // Success
        } else {
            // Data not ready, show loading message and retry in 1s
            const grid = document.getElementById('mobile-menu-buttons');
            if(grid) grid.innerHTML = "<div style='color:#c0392b; font-size:12px; padding:20px;'>Daten werden noch geladen. Bitte kurz warten.</div>";
            
            setTimeout(() => this.updateMobileMenuButtons(), 1000); 
        }
    },

    closeMobileMenu: function() {
        document.getElementById('mobile-menu-modal').style.display = 'none';
    },

    updateMobileMenuButtons: function() {
        const grid = document.getElementById('mobile-menu-buttons');
        
        // FIX: Ensure elements and data exist (using imported variables)
        if (!grid || !window.Worlds || !window.State || !window.State.activeWorld || !window.Worlds[window.State.activeWorld]) {
             // Fallback: If window.State is missing, try using local imports
             if (!grid || !Worlds || !State || !State.activeWorld || !Worlds[State.activeWorld]) {
                 return false; 
             }
        }

        // Use imports if window versions are missing
        const activeState = window.State || State;
        const activeWorlds = window.Worlds || Worlds;
        const activeWorldConf = activeWorlds[activeState.activeWorld] ? activeWorlds[activeState.activeWorld].config : {};

        grid.innerHTML = "";

        const menuItems = [
            { icon: '🌍', label: 'WELTEN', onclick: 'openWorldTravel()' },
            { icon: activeWorldConf.prestigeIcon || '💎', label: 'PRESTIGE', onclick: 'openPrestige()' },
            { icon: '🏆', label: 'ERFOLGE', onclick: 'openAchievements()' },
            { icon: '🐾', label: 'BEGLEITER', onclick: 'openPetShop()' },
            { icon: '⚖️', label: 'BÖRSE', onclick: 'openExchange()' },
            { icon: '🎁', label: 'EVENTS', onclick: 'openEventCenter()' }
        ];

        menuItems.forEach(item => {
            const funcName = item.onclick.replace(/\(.*\)/, '');
            // Check if the global function exists
            if (window[funcName]) { 
                const btn = document.createElement('button');
                btn.className = 'menu-btn'; 
                btn.innerHTML = `<span style="font-size:24px;">${item.icon}</span><br>${item.label}`;
                // Execute action and close menu
                btn.onclick = () => { eval(item.onclick); UI.closeMobileMenu(); };
                grid.appendChild(btn);
            }
        });
        return true; 
    },

    openExchange: function() { document.getElementById('exchange-modal').style.display = 'flex'; this.updateExchangeRate(); },
    closeExchange: () => document.getElementById('exchange-modal').style.display = 'none',
    
    openEventCenter: function() {
        document.getElementById('event-modal').style.display = 'flex';
        const leaveBtn = document.getElementById('leave-xmas-btn');
        const travelBtn = document.getElementById('btn-xmas-travel');
        
        // 1. Check if Event is Completed
        if (State.eventsCompleted && State.eventsCompleted.christmas) {
             if(travelBtn) {
                 travelBtn.innerText = "ABGESCHLOSSEN";
                 travelBtn.style.background = "#7f8c8d"; // Grey color
                 travelBtn.style.cursor = "not-allowed";
                 travelBtn.disabled = true;
                 travelBtn.onclick = null; // Remove click action
                 travelBtn.style.display = 'block'; 
             }
             if(leaveBtn) leaveBtn.style.display = 'none';
             return; // Stop here
        }

        // 2. Standard Logic (Active vs Inactive)
        if (State.activeWorld === 'christmas') {
            if(leaveBtn) leaveBtn.style.display = 'block';
            if(travelBtn) travelBtn.style.display = 'none';
        } else {
            if(leaveBtn) leaveBtn.style.display = 'none';
            if(travelBtn) {
                 travelBtn.style.display = 'block';
                 // Reset styles in case it was previously completed (e.g. after reset)
                 travelBtn.innerText = "REISEN";
                 travelBtn.style.background = "#c0392b"; 
                 travelBtn.style.cursor = "pointer";
                 travelBtn.disabled = false;
                 travelBtn.onclick = () => GameLogic.enterChristmasWorld(); 
            }
        }
    },
    
    closeEventCenter: () => document.getElementById('event-modal').style.display = 'none',
    
    openEventShop: function() { 
        document.getElementById('event-shop-modal').style.display = 'flex'; 
        const grid = document.getElementById('event-shop-grid'); grid.innerHTML = "";
        Worlds.cosmetics.hat.forEach(item => {
            if(item.currency === 'snowflakes') {
                let el = document.createElement('div'); el.className = "shop-item";
                let owned = Avatar.unlocked.includes(item.id);
                el.innerHTML = `<div class="item-name">${item.name}</div><div class="item-price">${owned ? 'Besitz' : item.cost + ' ❄️'}</div>`;
                el.onclick = () => { if(!owned && State.snowflakes >= item.cost) { State.snowflakes -= item.cost; Avatar.unlocked.push(item.id); UI.openEventShop(); } };
                grid.appendChild(el);
            }
        });
    },
    closeEventShop: () => document.getElementById('event-shop-modal').style.display = 'none',

    openPlayerCard: function() { 
        document.getElementById('player-modal').style.display = 'flex';
        let act = State[State.activeWorld];
        document.getElementById('stat-max-depth').innerText = act.maxDepth;
        document.getElementById('stat-aetherium').innerText = act.prestige;
        document.getElementById('stat-bosses').innerText = act.bossKills;
        this.renderAvatarPreview();
        this.renderShop();
    },
    closePlayerCard: () => document.getElementById('player-modal').style.display = 'none',

    updateName: function() { Avatar.name = document.getElementById('player-name-input').value; },
    switchTab: function(tab) { this.currentShopTab = tab; this.renderShop(); },
    
    buyOrEquip: function(item) {
        if (Avatar.unlocked.includes(item.id)) {
            Avatar.equipped[this.currentShopTab] = item.id;
        } else {
            let canBuy = false;
            if (item.currency === 'silk' && State.silk >= item.cost) { State.silk -= item.cost; canBuy = true; }
            else if (item.currency === 'snowflakes' && State.snowflakes >= item.cost) { State.snowflakes -= item.cost; canBuy = true; }
            else if (!item.currency && State.fabric >= item.cost) { State.fabric -= item.cost; canBuy = true; }
            else if (item.cost === 0) canBuy = true;
            if (canBuy) { Avatar.unlocked.push(item.id); Avatar.equipped[this.currentShopTab] = item.id; }
        }
        this.renderShop(); this.renderAvatarPreview(); this.renderAvatarIcon();
    },
    
    togglePerformance: function() {
        State.settings.animations = !State.settings.animations;
        document.getElementById('anim-toggle').classList.toggle('active');
        this.updateActiveMiners();
    },
    
    updateExchangeRate: function() {
        const sell = document.getElementById('ex-sell-select').value;
        const buy = document.getElementById('ex-buy-select').value;
        document.getElementById('ex-sell-balance').innerText = LogicRef.formatNumber(State[sell].gold);
        document.getElementById('ex-buy-balance').innerText = LogicRef.formatNumber(State[buy].gold);
        document.getElementById('ex-rate-display').innerText = "Kurs: 1000 : 1"; 
    },
    
    switchMainTab: function(tab) {
        this.currentMainTab = tab;
        if(tab === 'miners') {
            document.getElementById('miner-list').style.display = 'flex';
            document.getElementById('click-list').style.display = 'none';
            document.getElementById('tab-miners').classList.add('active');
            document.getElementById('tab-skills').classList.remove('active');
        } else {
            document.getElementById('miner-list').style.display = 'none';
            document.getElementById('click-list').style.display = 'flex';
            document.getElementById('tab-miners').classList.remove('active');
            document.getElementById('tab-skills').classList.add('active');
            this.renderClickSkills();
        }
    },
    
    // --- UPDATED: Bot Skills Methods (Restored) ---
    openBotSkills: function(index) { 
        document.getElementById('bot-skill-modal').style.display = 'flex'; 
        document.getElementById('bot-skill-title').innerText = "BOT CONFIG " + index; 
        this.renderBotSkillTree(index); // CALL THE RENDERER
    },
    
    closeBotSkills: () => document.getElementById('bot-skill-modal').style.display = 'none',

    renderBotSkillTree: function(minerIndex) {
        const container = document.getElementById('skill-tree-grid');
        if(!container) return;
        container.innerHTML = "";

        const act = State[State.activeWorld];
        const m = act.miners[minerIndex];
        if(!m) return;

        // Calculate Points
        const totalPoints = Math.floor(m.level / 20);
        const usedPoints = (m.skills.dps || 0) + (m.skills.cost || 0) + (m.skills.synergy || 0);
        const available = totalPoints - usedPoints;

        const tpDisplay = document.getElementById('tp-display');
        if(tpDisplay) tpDisplay.innerText = available;

        // Setup Grid CSS
        container.style.display = 'grid';
        container.style.gridTemplateColumns = '1fr 1fr 1fr';
        container.style.gap = '10px';
        container.style.textAlign = 'center';

        const createSkillCol = (type, name, desc) => {
            const currentLvl = m.skills[type] || 0;
            const col = document.createElement('div');
            col.style.background = '#2c3e50';
            col.style.padding = '10px';
            col.style.borderRadius = '8px';
            col.style.border = '1px solid #34495e';

            let btnHtml = '';
            if(available > 0) {
                 btnHtml = `<button class="skill-up-btn" style="width:100%; margin-top:5px; background:#27ae60; color:white; border:none; padding:5px; border-radius:4px; cursor:pointer;">+</button>`;
            } else {
                 btnHtml = `<button disabled style="width:100%; margin-top:5px; background:#444; color:#777; border:none; padding:5px; border-radius:4px;">+</button>`;
            }

            col.innerHTML = `
                <div style="font-size:12px; font-weight:bold; color:#f1c40f; margin-bottom:5px;">${name}</div>
                <div style="font-size:10px; color:#bdc3c7; height:30px;">${desc}</div>
                <div style="font-size:14px; font-weight:bold; margin-top:5px;">Lvl ${currentLvl}</div>
                ${btnHtml}
            `;

            if(available > 0) {
                const btn = col.querySelector('.skill-up-btn');
                btn.onclick = () => { LogicRef.buyBotSkill(minerIndex, type); };
            }

            container.appendChild(col);
        };

        createSkillCol('dps', 'OVERCLOCK', '+20% Power');
        createSkillCol('cost', 'EFFICIENCY', '-2% Kosten');
        createSkillCol('synergy', 'NETZWERK', '+1% Global DPS');
    },

    // --- MAIN RENDER LOOP ---
    renderLoop: function() {
        if(!this.ctx) return;
        this.ctx.fillStyle = "#111"; 
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        let sx=0, sy=0;
        if(State.settings.animations && this.shake>0) { 
            sx=(Math.random()-0.5)*this.shake; sy=(Math.random()-0.5)*this.shake; 
            this.shake*=0.9; if(this.shake<0.5) this.shake=0; 
        }
        
        this.ctx.save(); 
        this.ctx.translate(sx, sy); 
        this.ctx.drawImage(this.blockCanvas, 0, 0);
        
        // DRAW CRACKS
        let act = State[State.activeWorld];
        let pct = 1 - (Math.max(0, act.currentHp) / act.maxHp);
        
        if (pct > 0 && State.impactX !== null) {
            let craterSize = pct * 40; 
            this.ctx.fillStyle = "rgba(0,0,0,0.8)"; 
            this.ctx.beginPath(); this.ctx.arc(State.impactX, State.impactY, craterSize, 0, Math.PI*2); this.ctx.fill();
            this.ctx.strokeStyle = "#111"; this.ctx.lineWidth = 4; this.ctx.lineCap = "round"; this.ctx.lineJoin = "round"; this.ctx.beginPath();
            State.cracks.forEach(path => {
                let maxPointIndex = Math.ceil(path.length * pct);
                if (maxPointIndex > 0) {
                    this.ctx.moveTo(path[0].x, path[0].y);
                    for(let j=1; j<maxPointIndex && j<path.length; j++) this.ctx.lineTo(path[j].x, path[j].y);
                }
            });
            this.ctx.stroke();
        }

        // Draw Pet
        if(State.activePet) {
            this.ctx.fillStyle = "#f1c40f"; 
            this.ctx.beginPath(); this.ctx.arc(260, 60 + Math.sin(Date.now()*0.005)*5, 10, 0, Math.PI*2); this.ctx.fill();
        }

        if (State.settings.animations) {
            for(let i=this.particles.length-1; i>=0; i--) {
                let p = this.particles[i];
                this.ctx.fillStyle = p.color; this.ctx.fillRect(p.x, p.y, p.size, p.size);
                p.x+=p.vx; p.y+=p.vy; p.life-=0.04; if(p.life<=0) this.particles.splice(i,1);
            }
            this.ctx.font = "bold 14px Courier New";
            for(let i=this.floaters.length-1; i>=0; i--) { 
                let f = this.floaters[i]; 
                this.ctx.fillStyle = f.color; this.ctx.fillText(f.text, f.x, f.y); 
                f.y-=1; f.life-=0.02; if(f.life<=0) this.floaters.splice(i,1); 
            }
        }
        this.ctx.restore();
    },

    // --- TEXTURES ---
    generateBlockTexture: function() {
        State.cracks = []; State.impactX = null; State.impactY = null;
        let act = State[State.activeWorld]; 
        let conf = Worlds[State.activeWorld];
        let totalMatIndex = Math.floor((act.depth - 1) / Worlds.STAGE_LENGTH);
        act.loopCount = Math.floor(totalMatIndex / conf.materials.length);
        act.matIndex = totalMatIndex % conf.materials.length;
        let mat = conf.materials[act.matIndex] || conf.materials[0];

        // Boss Logic
        if (State.activeWorld === 'christmas' && act.depth === 400) {
            State.isBoss = true; act.maxHp = 500000000; 
        } else {
            State.isBoss = (act.depth % Worlds.STAGE_LENGTH === 0);
        }
        State.isLucky = (!State.isBoss && Math.random() < 0.05);

        // HP Calculation
        let growth = (State.activeWorld === 'christmas') ? 1.045 : 1.055;
        let rawHp = 2 * Math.pow(growth, act.depth);
        if (State.isBoss && (State.activeWorld !== 'christmas' || act.depth !== 400)) rawHp *= 8;
        else if (State.isLucky) rawHp *= 0.5;
        act.maxHp = Math.floor(rawHp); act.currentHp = act.maxHp;

        // Draw Block
        this.blockCtx.clearRect(0,0,320,320);
        let baseColor = State.isLucky ? [255, 215, 0] : mat.color; 
        if (State.isBoss && State.activeWorld !== 'christmas') baseColor = [40, 0, 0];

        this.blockCtx.fillStyle = `rgb(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]})`;
        this.blockCtx.fillRect(0, 0, 320, 320);
        
        // Texture Logic
        if(State.activeWorld === 'forest') {
            this.blockCtx.strokeStyle = "rgba(0,0,0,0.1)"; this.blockCtx.lineWidth = 3;
            for(let r=20; r<240; r+=20) { this.blockCtx.beginPath(); this.blockCtx.arc(160, 160, r, 0, Math.PI*2); this.blockCtx.stroke(); }
        } else if (State.activeWorld === 'desert') {
             this.blockCtx.strokeStyle = "rgba(0,0,0,0.1)"; this.blockCtx.lineWidth = 4;
             for(let y=20; y<320; y+=40) {
                 this.blockCtx.beginPath(); this.blockCtx.moveTo(0, y);
                 this.blockCtx.bezierCurveTo(100, y-20, 220, y+20, 320, y); this.blockCtx.stroke();
             }
        } else if (State.activeWorld === 'ice') {
             this.blockCtx.strokeStyle = "rgba(255,255,255,0.2)"; this.blockCtx.lineWidth = 2;
             for(let i=0; i<5; i++) {
                 this.blockCtx.beginPath(); this.blockCtx.moveTo(Math.random()*320, 0); this.blockCtx.lineTo(Math.random()*320, 320); this.blockCtx.stroke();
             }
        } else if (State.activeWorld === 'christmas') {
             this.blockCtx.fillStyle = "rgba(255,255,255,0.3)";
             this.blockCtx.fillRect(140, 0, 40, 320); this.blockCtx.fillRect(0, 140, 320, 40);
        } else {
            for(let i=0; i<20; i++) { 
                this.blockCtx.fillStyle = `rgba(0,0,0,0.15)`; 
                this.blockCtx.beginPath(); this.blockCtx.arc(Math.random()*320, Math.random()*320, Math.random()*60+20, 0, Math.PI*2); this.blockCtx.fill(); 
            }
        }
        
        // Loop Border
        if(act.loopCount > 0) {
            this.blockCtx.strokeStyle = "rgba(0,0,0,0.3)"; this.blockCtx.lineWidth = 15;
            this.blockCtx.strokeRect(0,0,320,320);
        }
        
        // Evil Tree Override
        if (State.activeWorld === 'christmas' && act.depth === 400) {
            this.blockCtx.clearRect(0,0,320,320); 
            this.blockCtx.fillStyle = "#27ae60"; this.blockCtx.beginPath(); this.blockCtx.moveTo(160, 20); this.blockCtx.lineTo(280, 280); this.blockCtx.lineTo(40, 280); this.blockCtx.fill();
            this.blockCtx.fillStyle = "#c0392b"; this.blockCtx.beginPath(); this.blockCtx.moveTo(120, 150); this.blockCtx.lineTo(150, 180); this.blockCtx.lineTo(120, 180); this.blockCtx.fill();
            this.blockCtx.beginPath(); this.blockCtx.moveTo(200, 150); this.blockCtx.lineTo(170, 180); this.blockCtx.lineTo(200, 180); this.blockCtx.fill();
        }

        if (State.activeEvent === 'xmas') {
            this.blockCtx.fillStyle = "rgba(255,255,255,0.2)"; 
            this.blockCtx.beginPath();
            this.blockCtx.arc(Math.random()*320, Math.random()*320, 10, 0, Math.PI*2);
            this.blockCtx.arc(Math.random()*320, Math.random()*320, 15, 0, Math.PI*2);
            this.blockCtx.fill();
        }
        
        const layerEl = document.getElementById('layerNameDisplay');
        if(layerEl) {
            if(State.isBoss) { layerEl.innerText = "BOSS"; layerEl.style.color = "#e74c3c"; }
            else if(State.isLucky) { layerEl.innerText = "GLÜCK"; layerEl.style.color = "#f1c40f"; }
            else { layerEl.innerText = mat.name; layerEl.style.color = "rgba(255,255,255,0.5)"; }
        }
        
        // Background Color
        if(baseColor) {
             const r = Math.floor(baseColor[0] * 0.2);
             const g = Math.floor(baseColor[1] * 0.2);
             const b = Math.floor(baseColor[2] * 0.2);
             document.body.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
        }
    },

    showArtifactToast: function(artifact) {
        const toast = document.getElementById('achievement-toast');
        if(toast) {
            const msg = toast.querySelector('.toast-text small');
            const icon = toast.querySelector('.toast-icon');
            const title = toast.querySelector('.toast-text strong');
            
            if(msg) msg.innerText = `${artifact.name} gefunden!`;
            if(icon) icon.innerText = artifact.icon || '🏺';
            if(title) title.innerText = "NEUES ARTEFAKT";
            
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 4000);
        }
    },

    applyWorldTheme: function() {
        const conf = Worlds[State.activeWorld];
        if(conf && conf.bgTint) {
            document.body.style.backgroundColor = `rgb(${conf.bgTint[0]}, ${conf.bgTint[1]}, ${conf.bgTint[2]})`;
        }
    },

    update: function() {
        if (!LogicRef) return;
        const act = State[State.activeWorld];
        const conf = Worlds[State.activeWorld];
        const setText = (id, txt) => { const el = document.getElementById(id); if(el) el.innerText = txt; };
        
        const fabricEl = document.getElementById('fabric-hud-amount');
        if(fabricEl) fabricEl.innerText = State.fabric;
        
        const snowEl = document.getElementById('snowflake-display');
        if(snowEl) snowEl.innerText = State.snowflakes;
        
        if(document.getElementById('world-modal').style.display === 'flex') {
            this.checkWorldUnlock();
        }

        if(this.wrapper) {
            this.wrapper.classList.remove('buff-strength', 'buff-miner', 'buff-overdrive');
            if(Date.now() < act.buffs.str) this.wrapper.classList.add('buff-strength');
            if(Date.now() < act.buffs.min) this.wrapper.classList.add('buff-miner');
            if(Date.now() < act.buffs.od) this.wrapper.classList.add('buff-overdrive');
        }

        setText('depthDisplay', act.depth);
        setText('goldDisplayBig', LogicRef.formatNumber(act.gold));
        setText('dpsDisplay', LogicRef.formatNumber(LogicRef.calculateDPS()));
        
        let hpPercent = (Math.max(0, act.currentHp) / act.maxHp) * 100;
        const hpBar = document.getElementById('hp-bar-fill');
        if(hpBar) hpBar.style.width = hpPercent + "%";
        setText('hp-text-overlay', `${LogicRef.formatNumber(Math.max(0, act.currentHp))} / ${LogicRef.formatNumber(act.maxHp)}`);

        const leaveBtn = document.getElementById('leave-xmas-btn');
        const travelBtn = document.getElementById('btn-xmas-travel');
        if(State.activeWorld === 'christmas') {
            if(leaveBtn) leaveBtn.style.display = 'block';
            if(travelBtn) travelBtn.style.display = 'none';
        } else {
            if(leaveBtn) leaveBtn.style.display = 'none';
            if(travelBtn) travelBtn.style.display = 'block';
        }

        const prestigeBtn = document.getElementById('btn-prestige-main');
        if(prestigeBtn) {
            let reqDepth = 50 + (act.prestigeCount * 20);
            prestigeBtn.disabled = act.depth < reqDepth;
        }

        conf.miners.forEach((type, index) => {
            let m = act.miners[index];
            let costMult = 1;
            if(State.artifactsFound && State.artifactsFound.includes('fossil')) costMult = 0.9;
            if(m.skills && m.skills.cost) costMult -= (m.skills.cost * 0.02);
            let baseCost = (m.level === 0) ? type.baseCost : Math.floor(type.baseCost * Math.pow(1.20, m.level));
            let cost = Math.floor(baseCost * costMult);

            if(document.getElementById(`m-lvl-${index}`)) {
                document.getElementById(`m-lvl-${index}`).innerText = "Lvl " + m.level;
                let milestoneBonus = Math.pow(2, Math.floor(m.level / 10));
                let dpsVal = (m.level * type.basePower) * milestoneBonus;
                document.getElementById(`m-dps-${index}`).innerHTML = LogicRef.formatNumber(dpsVal);
                
                let btn = document.getElementById(`m-btn-${index}`);
                if(btn) {
                    btn.innerHTML = (m.level===0 ? "Kaufen" : "Upgr") + "<br>" + LogicRef.formatNumber(cost);
                    btn.disabled = act.gold < cost;
                }
            }
        });
        
        if(this.currentMainTab === 'skills') {
            conf.clickSkills.forEach((skill, index) => {
                let lvl = act.clickSkillLevels[index] || 0;
                let cost = Math.floor(skill.baseCost * Math.pow(1.5, lvl));
                if(document.getElementById('click-list').style.display !== 'none') {
                    this.renderClickSkills(); 
                }
            });
        }

        let nextPick = conf.picks[act.pickLevel + 1];
        let pickBtn = document.getElementById('btn-pick');
        if (pickBtn) {
            if (nextPick) { 
                let pCost = nextPick.cost; 
                pickBtn.innerHTML = `Upgrade: ${nextPick.name}<br><small>${LogicRef.formatNumber(pCost)} G</small>`;
                pickBtn.disabled = act.gold < pCost;
            } else { pickBtn.innerHTML = "MAX"; pickBtn.disabled = true; }
        }
        setText('cost-tnt', LogicRef.formatNumber(act.costs.tnt));
        setText('cost-str', LogicRef.formatNumber(act.costs.str));
        setText('cost-min', LogicRef.formatNumber(act.costs.min));
        setText('cost-od', LogicRef.formatNumber(act.costs.od));

        this.renderLoop();
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
        setTimeout(() => b.style.left = "110vw", 100);
        setTimeout(() => { if(b.parentNode) document.body.removeChild(b); }, 10000);
    },
    
    showArtifactToast: function(artifact) {
        const toast = document.getElementById('achievement-toast');
        if(toast) {
            const msg = toast.querySelector('.toast-text small');
            const icon = toast.querySelector('.toast-icon');
            const title = toast.querySelector('.toast-text strong');
            
            if(msg) msg.innerText = `${artifact.name} gefunden!`;
            if(icon) icon.innerText = artifact.icon || '🏺';
            if(title) title.innerText = "NEUES ARTEFAKT";
            
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 4000);
        }
    },
    
    updateActiveMiners: function() {
        const layer = document.getElementById('active-miners-layer'); 
        if(!layer || !State.settings.animations) { if(layer) layer.innerHTML = ""; return; }
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
        list.innerHTML = ""; 
        let conf = Worlds[State.activeWorld]; 
        
        conf.miners.forEach((type, index) => {
            let div = document.createElement('div'); div.className = "miner-card"; div.id = `miner-card-${index}`;
            div.innerHTML = `
            <div class="miner-icon-area"><div class="bot-body" id="bot-body-${index}"><div class="bot-arm"></div></div></div>
            <div class="miner-info"><h4 style="color:${type.color}">${type.name} <span id="m-lvl-${index}" style="color:#fff; font-size:10px;">Lvl 0</span></h4><p>DPS: <span id="m-dps-${index}">0</span></p></div>
            <div class="miner-actions"><button class="miner-btn" id="m-btn-${index}" onclick="GameLogic.buyMiner(${index})">Laden...</button><div class="gear-btn-square" onclick="GameLogic.openBotSkills(${index})">⚙️</div></div>`;
            list.appendChild(div);
        });

        this.update();
    },
    
    renderShop: function() {
        const grid = document.getElementById('shop-grid'); 
        if(!grid) return;
        grid.innerHTML = "";
        grid.style.display = 'grid'; 

        if(this.currentShopTab === 'stats') {
            grid.style.display = 'flex'; grid.style.flexDirection = 'column';
            const s = State.stats;
            const rows = [{ l: "Gesamt Klicks", v: s.totalClicks }, { l: "Gold gesamt", v: LogicRef.formatNumber(s.totalGold) }];
            rows.forEach(r => {
                let div = document.createElement('div'); div.className = "stat-list-row";
                div.innerHTML = `<span>${r.l}</span> <span class="stat-val">${r.v}</span>`;
                grid.appendChild(div);
            });
            return;
        }
        if(this.currentShopTab === 'artifacts') {
            Worlds.artifacts.forEach(art => {
                let found = State.artifactsFound.includes(art.id);
                let div = document.createElement('div'); div.className = `artifact-card ${found ? 'found' : 'locked'}`;
                div.innerHTML = `<div class="artifact-icon">${found ? art.icon : '❓'}</div><div>${found ? art.name : '???'}</div>`;
                grid.appendChild(div);
            });
            return;
        }
        const items = Worlds.cosmetics[this.currentShopTab] || [];
        items.forEach(item => {
            let owned = Avatar.unlocked.includes(item.id);
            let equipped = Avatar.equipped[this.currentShopTab] === item.id;
            let el = document.createElement('div'); el.className = `shop-item ${owned?'owned':''} ${equipped?'equipped':''}`;
            el.innerHTML = `<div class="item-name">${item.name}</div><div class="item-price">${equipped ? 'An' : (owned ? 'Wählen' : item.cost + ' 🧶')}</div>`;
            el.onclick = () => this.buyOrEquip(item);
            grid.appendChild(el);
        });
    },

    renderClickSkills: function() {
        const list = document.getElementById('click-list');
        list.innerHTML = "";
        let conf = Worlds[State.activeWorld];
        let act = State[State.activeWorld];
        conf.clickSkills.forEach((skill, index) => {
            let lvl = act.clickSkillLevels[index] || 0;
            let cost = Math.floor(skill.baseCost * Math.pow(1.5, lvl));
            let disabled = act.gold < cost;
            let div = document.createElement('div'); div.className = "miner-card";
            div.style.borderLeftColor = "#f1c40f";
            div.innerHTML = `<div class="miner-icon-area">${skill.icon}</div><div class="miner-info"><h4>${skill.name} Lvl ${lvl}</h4><p>${skill.desc}</p></div><button class="miner-btn" ${disabled ? 'disabled' : ''} onclick="GameLogic.buyClickSkill(${index})">Upgr<br>${LogicRef.formatNumber(cost)}</button>`;
            list.appendChild(div);
        });
    },

    renderAvatarPreview: function() {
        const c = document.getElementById('avatar-preview-canvas');
        if(c) this.drawAvatar(c.getContext('2d'), 400, 600);
    },
    renderAvatarIcon: function() {
        const c = document.getElementById('avatar-canvas-icon');
        if(c) this.drawAvatar(c.getContext('2d'), 128, 128);
    },
    
    drawAvatar: function(ctx, w, h) {
        ctx.clearRect(0,0,w,h);
        let cx = w/2; let cy = h/2; let scale = w / 24; 
        const roundRect = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x,y,w,h,r); ctx.fill(); };
        const get = (cat) => { let id = Avatar.equipped[cat]; return Worlds.cosmetics[cat].find(i => i.id === id) || { id: 'none', color: '#000' }; };
        let body = get('body'); let legs = get('legs'); let hat = get('hat');

        if(Avatar.equipped.wings !== 'none') { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(cx, cy-4*scale, 10*scale, 3*scale, 0, 0, Math.PI*2); ctx.fill(); }
        
        ctx.fillStyle = legs.color || '#2980b9'; roundRect(cx - 3.5*scale, cy + 6.5*scale, 3*scale, 6.5*scale, 0.5*scale); roundRect(cx + 0.5*scale, cy + 6.5*scale, 3*scale, 6.5*scale, 0.5*scale);
        
        ctx.fillStyle = body.color || '#7f8c8d'; roundRect(cx - 4.5*scale, cy - 2*scale, 9*scale, 9*scale, 1*scale);

        ctx.fillStyle = "#ffccaa"; 
        roundRect(cx - 6.5*scale, cy, 2*scale, 6*scale, 0.5*scale); 
        roundRect(cx + 4.5*scale, cy, 2*scale, 6*scale, 0.5*scale); 

        ctx.fillStyle = "#ffccaa"; roundRect(cx - 3.5*scale, cy - 8.5*scale, 7*scale, 7*scale, 1.5*scale);
        
        ctx.fillStyle = "#fff"; 
        ctx.beginPath(); ctx.arc(cx - 1.5*scale, cy - 6*scale, 1*scale, 0, Math.PI*2); ctx.fill(); 
        ctx.beginPath(); ctx.arc(cx + 1.5*scale, cy - 6*scale, 1*scale, 0, Math.PI*2); ctx.fill();
        
        ctx.fillStyle = "#000"; 
        ctx.beginPath(); ctx.arc(cx - 1.5*scale, cy - 6*scale, 0.3*scale, 0, Math.PI*2); ctx.fill(); 
        ctx.beginPath(); ctx.arc(cx + 1.5*scale, cy - 6*scale, 0.3*scale, 0, Math.PI*2); ctx.fill();

        if(hat.id !== 'none') { ctx.fillStyle = hat.color || '#fff'; roundRect(cx - 4*scale, cy - 9.5*scale, 8*scale, 3*scale, 1*scale); }
    }
};







