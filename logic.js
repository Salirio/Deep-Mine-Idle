import { State, Avatar } from './state.js';
import { Worlds, STAGE_LENGTH, MIN_ARTIFACT_DEPTH } from './data.js';
import { AudioController } from './audio.js';
import { UI } from './ui.js';

export const GameLogic = {
    getActive: () => State[State.activeWorld],
    getConfig: () => Worlds[State.activeWorld],

    getPetBonus: function(type) {
        let mult = 0;
        State.ownedPets.forEach(id => {
            let pet = Worlds.pets.find(p => p.id === id);
            if(pet && pet.type === type) mult += pet.val;
        });
        return mult;
    },
    
    formatNumber: function(num) {
        // Standard Zahlen (Deutsch)
        if (num < 1000000) return Math.floor(num).toLocaleString('de-DE');
        if (num < 1e9) return (num / 1e6).toFixed(2) + " Mio";
        if (num < 1e12) return (num / 1e9).toFixed(2) + " Mrd";
        if (num < 1e15) return (num / 1e12).toFixed(2) + " Bio";
        if (num < 1e18) return (num / 1e15).toFixed(2) + " Brd"; // Bis Billiarde
        
        // --- NEU: Idle-Game Notation (aa, ab, ac...) ab 1e18 ---
        
        // Das Alphabet für die Suffixe
        const alphabet = "abcdefghijklmnopqrstuvwxyz";
        
        // Wir starten bei 1e18 (Trillion), das ist unser "Nullpunkt" für Buchstaben
        let exponent = Math.floor(Math.log10(num));
        // Alle 3 Nullen (1000er Schritt) gibt es einen neuen Buchstaben-Code
        let step = Math.floor((exponent - 18) / 3); 
        
        // Wir berechnen die zwei Buchstaben (z.B. Index 0 = 'aa', Index 1 = 'ab')
        // Das erlaubt Kombinationen bis 'zz' (das ist riesig!)
        let char1 = Math.floor(step / 26);
        let char2 = step % 26;
        
        // Falls die Zahl SO riesig ist, dass wir über 'zz' hinausgehen, fallback:
        if (char1 >= 26) return num.toExponential(2);

        let suffix = alphabet[char1] + alphabet[char2];
        
        // Den Wert runterrechnen, damit er lesbar ist (z.B. 12.50 ab)
        let denominator = Math.pow(10, 18 + (step * 3));
        return (num / denominator).toFixed(2) + " " + suffix;
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
        if (Date.now() < act.buffs.min) multiplier *= 2;
        if (Date.now() < act.buffs.od) multiplier *= 3;
        if (State.artifactsFound.includes('root_heart')) multiplier += 0.05;
        if (State.artifactsFound.includes('christmas_star')) multiplier += 0.50;
        
        let prestigeMult = 1 + (act.prestige * 0.25);
        dps *= (1 + this.getPetBonus('dps'));
        return dps * multiplier * prestigeMult;
    },

    hitBlock: function(x, y, dmg = null, isAuto = false) {
        let act = this.getActive();
        
        if(!isAuto) {
            AudioController.init(); 
            AudioController.playHit(State.activeWorld);
            State.stats.totalClicks++;
            
            // Mark block as touched by player for artifact chance
            act.wasTouchedByPlayer = true;
            
            if (State.impactX === null) {
                State.impactX = x; State.impactY = y;
                this.generateCracks(x, y);
            }
        }

        let basePower = dmg || 1; 
        if(!isAuto && !dmg) {
             let conf = this.getConfig();
             basePower = conf.picks[act.pickLevel].power;

             // --- FIX START: APPLY CLICK SKILLS ---
             
             // Skill 1: Base Boost (+10% per level)
             let lvlBase = act.clickSkillLevels[0] || 0;
             if (lvlBase > 0) basePower *= (1 + (lvlBase * 0.10));

             // Skill 3: Titan Multiplier (+5% per level)
             let lvlMulti = act.clickSkillLevels[2] || 0;
             if (lvlMulti > 0) basePower *= (1 + (lvlMulti * 0.05));

             // Aetherium Prestige Bonus
             if (act.clickUpgrade) basePower *= (1 + act.clickUpgrade);
             
             // Buffs
             if (Date.now() < act.buffs.str) basePower *= 2;
             if (Date.now() < act.buffs.od) basePower *= 3;

             // Skill 2: Critical Hits (+1% Chance per level)
             let lvlCrit = act.clickSkillLevels[1] || 0;
             let critChance = (lvlCrit * 0.01); 
             
             // Check Artifact for Crit Bonus (+5%)
             if (State.artifactsFound.includes('compass')) critChance += 0.05;

             // Roll for Crit (3x Damage)
             if (Math.random() < critChance) {
                 basePower *= 3;
                 // Visual Pop-up for Crit
                 UI.spawnFloater(x, y-20, "CRIT!", "#f1c40f");
             }
                // --- FIX END ---
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
        let loopMult = Math.pow(100000000, act.loopCount);
        let petGold = 1 + this.getPetBonus('gold');
        reward *= petGold; // Apply pet bonus to gold
        act.gold += (reward * loopMult);
        act.depth++;

        // 1. Calculate Chance (Base 0.1%)
        let fabricChance = 0.01; // 1%
        
        // 2. Add Artifact Bonus (Djinn Lamp)
        if (State.artifactsFound.includes('djinn_lamp')) {
             fabricChance += 0.05; // 5%
        }

        // --- FIX: STOFF AUCH WIRKLICH GEBEN ---
        if (Math.random() < fabricChance) {
            State.fabric++;
            // Visuelles Feedback, damit man es sieht!
            UI.spawnFloater(window.innerWidth/2, window.innerHeight/2, "+1 STOFF 🧶", "#fff");
        }
        
        if(act.depth > act.maxDepth) act.maxDepth = act.depth;
        
        // --- ARTIFACT LOGIC ---
        let dropArtifact = false;
        
        // 1. Check Dev Override (Vorrang)
        if (State.forceNextArtifactDrop) {
            dropArtifact = true;
            State.forceNextArtifactDrop = false; // Reset flag
        } 
        // 2. Check Standard Chance
        else if (act.depth > 200 && State.activeWorld !== 'christmas' && act.wasTouchedByPlayer) {
             // 1 : 4000 Chance
             if(Math.random() < (1 / 4000)) {
                 dropArtifact = true;
             }
        }

        if (dropArtifact) {
            // Pick a random artifact not yet owned
            // First try current world, then global
            const allArts = Worlds.artifacts.filter(a => a.world !== 'christmas'); 
            const worldArts = allArts.filter(a => a.world === State.activeWorld);
            
            let candidates = worldArts.filter(a => !State.artifactsFound.includes(a.id));
            if(candidates.length === 0) {
                // If all in world found, try global
                candidates = allArts.filter(a => !State.artifactsFound.includes(a.id));
            }

            if(candidates.length > 0) {
                let art = candidates[Math.floor(Math.random() * candidates.length)];
                State.artifactsFound.push(art.id);
                UI.showArtifactToast(art);
                this.saveGame();
            }
        }
        
        // Reset touch flag for next block
        act.wasTouchedByPlayer = false;

        // --- CHRISTMAS EVENT END ---
        // If we just beat the boss at 400 (depth is now 401)
        if (State.activeWorld === 'christmas' && act.depth > 400) {
             this.finishChristmasEvent();
        }

        // Event Check (Snowflakes)
        if(State.activeEvent === 'xmas' || State.activeWorld === 'christmas') {
            if(Math.random() > 0.7) State.snowflakes++;
        }

        UI.generateBlockTexture();
        this.saveGame();
    },
    
    finishChristmasEvent: function() {
         // 1. Mark Event as Completed
         // FIX: Ensure eventsCompleted object exists before setting property
         if (!State.eventsCompleted) State.eventsCompleted = {};
         State.eventsCompleted.christmas = true;
         
         // 2. Reward Artifact
         if(!State.artifactsFound.includes('christmas_star')) {
             State.artifactsFound.push('christmas_star');
             // Show Artifact Toast
             const star = Worlds.artifacts.find(a => a.id === 'christmas_star');
             if(star) UI.showArtifactToast(star);
         }
         
         // 3. Show Full Screen Win Overlay
         const overlay = document.getElementById('event-win-overlay');
         if(overlay) {
             overlay.style.display = 'flex';
             // Leave after 5 seconds
             setTimeout(() => {
                 overlay.style.display = 'none';
                 this.leaveChristmasWorld();
             }, 5000);
         } else {
             this.leaveChristmasWorld();
         }
    }, // <--- Vital Comma
    
    buyMiner: function(index) {
        let act = this.getActive();
        let conf = this.getConfig();

        if (!act.miners[index]) {
            act.miners[index] = { level: 0, skills: { dps: 0, cost: 0, synergy: 0 } };
        }

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
    
    // --- WIEDERHERGESTELLT: Bot Skill Kauf ---
    buyBotSkill: function(minerIndex, skillType) {
        let act = this.getActive();
        let m = act.miners[minerIndex];
        if(!m) return;

        // Calculate points
        let totalPoints = Math.floor(m.level / 20);
        let usedPoints = (m.skills.dps || 0) + (m.skills.cost || 0) + (m.skills.synergy || 0);
        let available = totalPoints - usedPoints;

        if(available > 0) {
            if(!m.skills[skillType]) m.skills[skillType] = 0;
            m.skills[skillType]++;

            // Re-render UI
            UI.renderBotSkillTree(minerIndex);
            UI.update();
        }
    },
    // ------------------------------------------

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
        
        // Audio Change
        AudioController.playBGM(world);

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
        
        let reward = Math.floor(act.depth / 15);
        act.prestige += reward; 
        act.prestigeCount++;
        
        act.gold = 0; act.depth = 1; act.currentHp = 1; act.pickLevel = 0;
        // FIX: Reset Click Skills to 0
        act.clickSkillLevels = [0, 0, 0];
        act.miners.forEach(m => {
            m.level = 0;
            m.skills = { dps: 0, cost: 0, synergy: 0 };
        });
        
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

        State.lastSaveTime = Date.now();

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
                // Fix for double-encoding issues
                if (!raw.trim().startsWith('{')) {
                    try { jsonString = decodeURIComponent(escape(atob(raw))); } catch (e) { jsonString = raw; }
                }
                const data = JSON.parse(jsonString);
                
                // --- 1. SAFE MERGE (Der wichtige Fix!) ---
                
                // A) Wir retten deine NEUEN Defaults, bevor das Savegame sie überschreibt
                const defaultSettings = { ...State.settings };
                const defaultStats = { ...State.stats };

                if(data.state) {
                    // B) Jetzt laden wir brutal drüber (State ist nun "alt")
                    Object.assign(State, data.state);
                    
                    // C) Jetzt reparieren wir Settings & Stats (Basis: Neu, Overlay: Alt)
                    if (data.state.settings) {
                        State.settings = { ...defaultSettings, ...data.state.settings };
                    }
                    if (data.state.stats) {
                        State.stats = { ...defaultStats, ...data.state.stats };
                    }
                }
                if(data.avatar) Object.assign(Avatar, data.avatar);

                // --- 2. MIGRATION FIX (Fehlende Miner ergänzen) ---
                const activeWorldConf = Worlds[State.activeWorld];
                if (activeWorldConf && State[State.activeWorld].miners.length < activeWorldConf.miners.length) {
                    console.log("Migrating Save: Adding missing miners...");
                    for (let i = State[State.activeWorld].miners.length; i < activeWorldConf.miners.length; i++) {
                        State[State.activeWorld].miners.push({ level: 0, skills: { dps: 0, cost: 0, synergy: 0 } });
                        if(State[State.activeWorld].minerUpgrades) State[State.activeWorld].minerUpgrades.push(0);
                    }
                }
                // Dasselbe für Klick-Skills
                if (activeWorldConf && State[State.activeWorld].clickSkillLevels.length < activeWorldConf.clickSkills.length) {
                    for (let i = State[State.activeWorld].clickSkillLevels.length; i < activeWorldConf.clickSkills.length; i++) {
                        State[State.activeWorld].clickSkillLevels.push(0);
                    }
                }
                
                // --- 3. OFFLINE PROGRESSION ---
                if (State.lastSaveTime) {
                    const now = Date.now();
                    const secondsOffline = Math.floor((now - State.lastSaveTime) / 1000);
                    
                    if (secondsOffline > 60) {
                        const dps = this.calculateDPS();
                        const cappedSeconds = Math.min(secondsOffline, 86400); // Max 24h
                        const offlineGold = dps * cappedSeconds;
                        
                        if (offlineGold > 0) {
                            State[State.activeWorld].gold += offlineGold;
                            setTimeout(() => {
                                alert(`🏠 WILLKOMMEN ZURÜCK!\n\nDu warst ${secondsOffline} Sekunden weg.\nDeine Miner haben ${this.formatNumber(offlineGold)} Gold gesammelt!`);
                            }, 500);
                        }
                    }
                }

                // 4. Resume Audio
                setTimeout(() => AudioController.playBGM(State.activeWorld), 1000);

                return true;
            } catch(e) { console.error("Load Error", e); return false; }
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
        // UI Toggle Logic
        const btn = document.getElementById('xmas-toggle');
        
        if (State.activeEvent === ev) {
            State.activeEvent = null;
            document.body.classList.remove('theme-xmas');
            if(btn) btn.classList.remove('active');
            const shopBtn = document.getElementById('event-shop-btn');
            if(shopBtn) shopBtn.style.display = 'none';
        } else {
            State.activeEvent = ev;
            document.body.classList.add('theme-xmas');
            if(btn) btn.classList.add('active');
            const shopBtn = document.getElementById('event-shop-btn');
            if(shopBtn) shopBtn.style.display = 'flex';
        }
        UI.generateBlockTexture();
        UI.update();
    },

    enterChristmasWorld: function() { 
        State.prevWorld = State.activeWorld; 
        
        // Show Transition
        const trans = document.getElementById('gift-transition');
        if(trans) {
            trans.style.display = 'flex';
            UI.closeEventCenter(); // Close modal
            
            // Wait for animation
            setTimeout(() => {
                this.travelTo('christmas'); 
                // Hide after travel
                setTimeout(() => {
                    trans.style.display = 'none';
                }, 500);
            }, 2000);
        } else {
            this.travelTo('christmas');
        }
    },

    leaveChristmasWorld: function() { this.travelTo(State.prevWorld || 'mine'); },
    
    trade: function(percent) {
        const sellType = document.getElementById('ex-sell-select').value;
        const buyType = document.getElementById('ex-buy-select').value;
        if(sellType === buyType) return;
        
        let sellSource = State[sellType];
        let buySource = State[buyType];

        // FIX 1: Prevent trading if the target world is locked!
        if (!buySource.unlocked) {
            alert("Du hast diese Welt noch nicht entdeckt!");
            return;
        }

        let amount = Math.floor(sellSource.gold * percent);
        
        if(amount > 0) {
            sellSource.gold -= amount;
            // FIX 2: Adjusted Rate (10 Million to 1) to prevent game breaking
            let rate = 0.0000001; 
            buySource.gold += Math.floor(amount * rate);
            UI.update();
            UI.updateExchangeRate();
        }
        
        // Inside trade function
    let resultAmount = Math.floor(amount * rate);
    
    if(resultAmount < 1) {
        alert("Betrag zu klein für den Wechselkurs!");
        return;
    }
    
    sellSource.gold -= amount;
    buySource.gold += resultAmount;
    }
};
