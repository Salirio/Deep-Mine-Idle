import { State, Avatar } from './state.js';
import { Worlds } from './data.js';
import { AudioController } from './audio.js';
import { UI } from './ui.js';

export const GameLogic = {
    getActive: () => State[State.activeWorld],
    getConfig: () => Worlds[State.activeWorld],
    
    formatNumber: function(num) {
        if (num < 1000000) return Math.floor(num).toLocaleString('de-DE');
        if (num < 1e9) return (num / 1e6).toFixed(2) + " Mio";
        if (num < 1e12) return (num / 1e9).toFixed(2) + " Mrd";
        if (num < 1e15) return (num / 1e12).toFixed(2) + " Bio";
        if (num < 1e18) return (num / 1e15).toFixed(2) + " Brd";
        return num.toExponential(2);
    },

    calculateDPS: function() {
        let act = this.getActive();
        let conf = this.getConfig();
        let dps = 0;
        let globalSynergyBonus = 0;

        act.miners.forEach((m, i) => {
            if (m.level > 0 && m.skills && m.skills.synergy) {
                globalSynergyBonus += (m.skills.synergy * 0.01);
            }
        });

        act.miners.forEach((m, i) => {
            if (m.level > 0) {
                let prestigeBonus = (act.minerUpgrades && act.minerUpgrades[i]) ? (1 + act.minerUpgrades[i]) : 1;
                let milestoneBonus = Math.pow(2, Math.floor(m.level / 10));
                let skillMult = 1;
                if (m.skills && m.skills.dps) skillMult += (m.skills.dps * 0.20);
                dps += (conf.miners[i].basePower * m.level) * prestigeBonus * milestoneBonus * skillMult;
            }
        });

        dps *= (1 + globalSynergyBonus);
        
        let multiplier = 1;
        if (Date.now() < act.buffs.min) multiplier *= 2;
        if (Date.now() < act.buffs.od) multiplier *= 3;
        if (State.artifactsFound.includes('root_heart')) multiplier += 0.05;
        if (State.artifactsFound.includes('christmas_star')) multiplier += 0.50;
        
        let prestigeMult = 1 + (act.prestige * 0.25);
        return dps * multiplier * prestigeMult;
    },

    hitBlock: function(x, y, dmg = null, isAuto = false) {
        let act = this.getActive();
        
        if(!isAuto) {
            AudioController.init();
            AudioController.playHit(State.activeWorld);
            State.stats.totalClicks++;
            
            // Generate Cracks on first manual hit
            if (State.impactX === null) {
                State.impactX = x; State.impactY = y;
                this.generateCracks(x, y);
            }
        }

        let basePower = dmg || 1; 
        if(!isAuto && !dmg) {
             let conf = this.getConfig();
             basePower = conf.picks[act.pickLevel].power;
             // Skills logic placeholder
             if (act.clickUpgrade) basePower *= (1 + act.clickUpgrade);
             
             if (Date.now() < act.buffs.str) basePower *= 2;
             if (Date.now() < act.buffs.od) basePower *= 3;
        }

        act.currentHp -= basePower;

        if (State.settings.animations) {
             UI.shake = isAuto ? 0 : 4;
             if(!isAuto || Math.random() > 0.8) UI.spawnFloater(x, y, `-${this.formatNumber(basePower)}`, "#fff");
             if(!isAuto) UI.spawnParticles(x, y, 5);
        }

        if (act.currentHp <= 0) {
            this.breakBlock();
        }
        UI.update();
    },

    // NEW: Crack Generation Logic restored
    generateCracks: function(originX, originY) {
        State.cracks = []; 
        for(let i=0; i<8; i++) { 
            let path = []; let cx = originX; let cy = originY; 
            path.push({x: cx, y: cy}); 
            let radius = 0; 
            while(radius < 450) { 
                radius += Math.random()*30+10; 
                let wiggle = (Math.random()-0.5)*1.0; 
                let angle = (Math.PI * 2 * i) / 8 + wiggle; 
                path.push({x: cx + Math.cos(angle)*radius, y: cy + Math.sin(angle)*radius}); 
            } 
            State.cracks.push(path); 
        }
    },

    breakBlock: function() {
        let act = this.getActive();
        let conf = this.getConfig();
        let mat = conf.materials[act.matIndex];
        
        let reward = mat.val;
        let loopMult = Math.pow(10, act.loopCount);
        act.gold += (reward * loopMult);
        act.depth++;
        
        if(act.depth > act.maxDepth) act.maxDepth = act.depth;
        
        UI.generateBlockTexture();
        this.saveGame();
    },
    
    buyMiner: function(index) {
        let act = this.getActive();
        let conf = this.getConfig();
        let m = act.miners[index];
        let type = conf.miners[index];
        
        let costMult = 1;
        if(State.artifactsFound.includes('fossil')) costMult = 0.9;
        if(m.skills && m.skills.cost) costMult -= (m.skills.cost * 0.02);

        let baseCost = (m.level === 0) ? type.baseCost : Math.floor(type.baseCost * Math.pow(1.20, m.level));
        let cost = Math.floor(baseCost * costMult);
        
        if (act.gold >= cost) {
            act.gold -= cost;
            m.level++;
            UI.update();
            UI.updateActiveMiners();
        }
    },

    buyPickUpgrade: function() {
        let act = this.getActive(); 
        let conf = this.getConfig();
        let next = conf.picks[act.pickLevel + 1];
        let costMult = State.artifactsFound.includes('fossil') ? 0.9 : 1;
        
        if (next) {
            let cost = Math.floor(next.cost * costMult);
            if (act.gold >= cost) {
                act.gold -= cost;
                act.pickLevel++;
                UI.update();
            }
        }
    },

    buyTNT: function() {
        let act = this.getActive();
        if(act.gold >= act.costs.tnt) {
            act.gold -= act.costs.tnt;
            act.costs.tnt = Math.floor(act.costs.tnt * 1.6);
            this.hitBlock(160, 160, act.maxHp * 0.25);
            UI.spawnFloater(160, 160, "BOOM!", "#e74c3c");
            UI.update();
        }
    },
    activateBuff: function(type) {
        let act = this.getActive();
        act.buffs[type] = Date.now() + 15000;
        UI.update();
    },
    buyPotionStrength: function() { let act=this.getActive(); if(act.gold >= act.costs.str) { act.gold -= act.costs.str; act.costs.str*=1.8; this.activateBuff('str'); } },
    buyPotionMiner: function() { let act=this.getActive(); if(act.gold >= act.costs.min) { act.gold -= act.costs.min; act.costs.min*=1.8; this.activateBuff('min'); } },
    buyPotionOverdrive: function() { let act=this.getActive(); if(act.gold >= act.costs.od) { act.gold -= act.costs.od; act.costs.od*=2; this.activateBuff('od'); } },

    buyClickSkill: function(index) {
        let act = this.getActive(); let conf = this.getConfig();
        let skill = conf.clickSkills[index];
        let lvl = act.clickSkillLevels[index] || 0;
        let cost = Math.floor(skill.baseCost * Math.pow(1.5, lvl));
        
        if (act.gold >= cost && (!skill.max || lvl < skill.max)) {
            act.gold -= cost;
            act.clickSkillLevels[index]++;
            UI.update();
        }
    },

    openBotSkills: function(index) { UI.openBotSkills(index); },
    
    travelTo: function(world) {
        if(world === State.activeWorld) return;
        State.activeWorld = world; 
        UI.generateBlockTexture();
        UI.renderMinerList();
        UI.updateActiveMiners();
        UI.update();
        UI.closeWorldTravel();
    },

    tryUnlockForest: function(cost) { if(State.mine.gold >= cost) { State.mine.gold -= cost; State.forest.unlocked = true; this.travelTo('forest'); } },
    tryUnlockDesert: function(cost) { if(State.forest.gold >= cost) { State.forest.gold -= cost; State.desert.unlocked = true; this.travelTo('desert'); } },
    tryUnlockIce: function(cost) { if(State.desert.gold >= cost) { State.desert.gold -= cost; State.ice.unlocked = true; this.travelTo('ice'); } },

    doPrestige: function() {
        let act = this.getActive();
        let reqDepth = 50 + (act.prestigeCount * 20);
        if (act.depth < reqDepth) return;
        
        let reward = Math.floor(act.depth / 20);
        act.prestige += reward; 
        act.prestigeCount++;
        
        act.gold = 0; act.depth = 1; act.currentHp = 1; act.pickLevel = 0;
        act.miners.forEach(m => m.level = 0);
        
        UI.generateBlockTexture();
        UI.renderMinerList();
        UI.update();
        UI.closePrestige();
    },

    hardReset: function() {
        if(confirm("Alles löschen?")) {
            if(State.username) localStorage.removeItem('DeepDigSave_' + State.username);
            location.reload();
        }
    },

    saveGame: function() {
        if(!State.username) return; 
        const saveObj = { state: State, avatar: Avatar };
        try {
            const jsonString = JSON.stringify(saveObj);
            const encoded = btoa(unescape(encodeURIComponent(jsonString)));
            localStorage.setItem('DeepDigSave_' + State.username, encoded);
        } catch(e) { console.error("Save Fail", e); }
    },

    loadGame: function() {
        if(!State.username) return false;
        const raw = localStorage.getItem('DeepDigSave_' + State.username);
        if(raw) {
            try {
                let jsonString = raw;
                if (!raw.trim().startsWith('{')) {
                    try { jsonString = decodeURIComponent(escape(atob(raw))); } catch (e) { jsonString = raw; }
                }
                const data = JSON.parse(jsonString);
                if(data.state) Object.assign(State, data.state);
                if(data.avatar) Object.assign(Avatar, data.avatar);
                return true;
            } catch(e) { return false; }
        }
        return false;
    },

    clickBubble: function() {
        let rand = Math.random();
        let act = this.getActive();
        if (rand < 0.4) {
            act.buffs.str = Date.now() + 15000;
            UI.spawnFloater(window.innerWidth/2, window.innerHeight/2, "STÄRKE!", "#9b59b6");
        } else if (rand < 0.8) {
            act.buffs.min = Date.now() + 15000;
            UI.spawnFloater(window.innerWidth/2, window.innerHeight/2, "ÖL!", "#00d2d3");
        } else {
            let reward = this.calculateDPS() * 300; 
            if(reward < 100) reward = 1000 * act.depth; 
            act.gold += reward;
            UI.spawnFloater(window.innerWidth/2, window.innerHeight/2, "JACKPOT!", "#f1c40f");
        }
        UI.update();
    },
    
    toggleEvent: function(ev) {
        if (State.activeEvent === ev) {
            State.activeEvent = null;
            document.body.classList.remove('theme-xmas');
        } else {
            State.activeEvent = ev;
            document.body.classList.add('theme-xmas');
        }
        UI.generateBlockTexture();
        UI.update();
    },

    enterChristmasWorld: function() { State.prevWorld = State.activeWorld; this.travelTo('christmas'); },
    leaveChristmasWorld: function() { this.travelTo(State.prevWorld || 'mine'); },
    
    trade: function(percent) {
        const sellType = document.getElementById('ex-sell-select').value;
        const buyType = document.getElementById('ex-buy-select').value;
        if(sellType === buyType) return;
        
        let sellSource = State[sellType];
        let buySource = State[buyType];
        let amount = Math.floor(sellSource.gold * percent);
        
        if(amount > 0) {
            sellSource.gold -= amount;
            let rate = 0.001; 
            buySource.gold += Math.floor(amount * rate);
            UI.update();
            UI.updateExchangeRate();
        }
    }
};
