import { State, Avatar } from './state.js';
import { Worlds, STAGE_LENGTH, MIN_ARTIFACT_DEPTH } from './data.js';
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
                if (m.skills) {
                    if(m.skills.dps) skillMult += (m.skills.dps * 0.20);
                }
                dps += (conf.miners[i].basePower * m.level) * prestigeBonus * milestoneBonus * skillMult;
            }
        });

        dps *= (1 + globalSynergyBonus);
        
        let multiplier = 1;
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
            // Combo Logic could go here...
        }

        let basePower = dmg || 1; // Simplified calc, add full logic if needed
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

    breakBlock: function() {
        let act = this.getActive();
        let conf = this.getConfig();
        let mat = conf.materials[act.matIndex];
        
        // Reward
        let reward = mat.val;
        act.gold += reward;
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
        if(State.artifactsFound && State.artifactsFound.includes('fossil')) costMult = 0.9;
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

    openBotSkills: function(index) {
        alert("Skills Modal would open here for Miner " + index);
    },
    
    travelTo: function(world) {
        if(world === State.activeWorld) return;
        State.activeWorld = world; 
        UI.generateBlockTexture();
        UI.renderMinerList();
        UI.updateActiveMiners();
        UI.update();
        alert("Travelled to " + world);
    },

    saveGame: function() {
        const saveObj = { state: State, avatar: Avatar };
        localStorage.setItem('DeepDigSave', JSON.stringify(saveObj));
    },

    loadGame: function() {
        const raw = localStorage.getItem('DeepDigSave');
        if(raw) {
            const data = JSON.parse(raw);
            Object.assign(State, data.state);
            Object.assign(Avatar, data.avatar);
            return true;
        }
        return false;
    }

// Add to logic.js inside GameLogic = { ... }
    
    clickBubble: function() {
        let rand = Math.random();
        let act = this.getActive();
        
        if (rand < 0.4) {
            // activateBuff('str') - simplified here
            act.buffs.str = Date.now() + 15000;
            UI.spawnFloater(window.innerWidth/2, window.innerHeight/2, "STÄRKE BOOST!", "#9b59b6");
        } else if (rand < 0.8) {
            act.buffs.min = Date.now() + 15000;
            UI.spawnFloater(window.innerWidth/2, window.innerHeight/2, "ROBO ÖL!", "#00d2d3");
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
            const t = document.getElementById('xmas-toggle');
            if(t) t.classList.remove('active');
            const shopBtn = document.getElementById('event-shop-btn');
            if(shopBtn) shopBtn.style.display = 'none';
        } else {
            State.activeEvent = ev;
            document.body.classList.add('theme-xmas');
            const t = document.getElementById('xmas-toggle');
            if(t) t.classList.add('active');
            const shopBtn = document.getElementById('event-shop-btn');
            if(shopBtn) shopBtn.style.display = 'flex';
        }
        UI.generateBlockTexture();
        UI.update();
    },

    // Add tryUnlock wrappers
    tryUnlockForest: function(cost) {
        if(State.mine.gold >= cost) { State.mine.gold -= cost; State.forest.unlocked = true; this.travelTo('forest'); }
    },
    tryUnlockDesert: function(cost) {
        if(State.forest.gold >= cost) { State.forest.gold -= cost; State.desert.unlocked = true; this.travelTo('desert'); }
    },
    tryUnlockIce: function(cost) {
        if(State.desert.gold >= cost) { State.desert.gold -= cost; State.ice.unlocked = true; this.travelTo('ice'); }
    },
};