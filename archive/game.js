    let devMode = false;

    function updateDevModeUI() {
        document.body.classList.toggle('dev-mode', devMode);
    }

    document.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.altKey && (event.key === 'D' || event.key === 'd')) {
            devMode = !devMode;
            updateDevModeUI();
        }
    });

    // --- AUDIO SYSTEM (BLOCK 1) ---
    const AudioController = {
        ctx: null,
        masterGain: null,
        bgmOscillators: [],
        isMuted: false,
        volume: 0.3, // Default volume
        isPlaying: false,
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
            
            // Start BGM loop after init
            this.startMusic();
        },
        
        // ADDED: Volume setter
        setVolume: function(val) {
            this.volume = val;
            if(this.masterGain) this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
        },

        // ADDED: Play Hit Sound
        playHit: function(type) {
             if(!this.ctx || this.isMuted || this.volume <= 0) return;
             const t = this.ctx.currentTime;
             const g = this.ctx.createGain();
             g.connect(this.masterGain);
             
             // Short decay for all hits
             g.gain.setValueAtTime(0.2, t);
             g.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

             if (type === 'mine') { 
                 // Stone: Square wave click
                 const o = this.ctx.createOscillator(); o.type = 'square';
                 o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.1);
                 o.connect(g); o.start(t); o.stop(t + 0.1);
             } else if (type === 'forest') { 
                 // Wood: Triangle thud (softer)
                 const o = this.ctx.createOscillator(); o.type = 'triangle';
                 o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.1);
                 o.connect(g); o.start(t); o.stop(t + 0.1);
             } else if (type === 'desert') {
                 // Sand: Noise burst
                 const bSize = this.ctx.sampleRate * 0.1;
                 const b = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate);
                 const d = b.getChannelData(0); for(let i=0; i<bSize; i++) d[i] = Math.random() * 2 - 1;
                 const src = this.ctx.createBufferSource(); src.buffer = b;
                 const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 800;
                 src.connect(f); f.connect(g); src.start(t);
             } else if (type === 'ice') {
                 // Ice: High pitch sine "ting"
                 const o = this.ctx.createOscillator(); o.type = 'sine';
                 o.frequency.setValueAtTime(800, t); o.frequency.exponentialRampToValueAtTime(1200, t + 0.05);
                 const o2 = this.ctx.createOscillator(); o2.type = 'triangle'; // Add some crunch
                 o2.frequency.setValueAtTime(400, t); o2.frequency.exponentialRampToValueAtTime(100, t + 0.1);
                 o.connect(g); o2.connect(g);
                 o.start(t); o.stop(t + 0.1); o2.start(t); o2.stop(t + 0.1);
             }
        },

        playTone: function(freq, duration, type = 'square', vol = 0.1, detune = 0) {
            if(!this.ctx) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            osc.detune.value = detune;
            
            gain.gain.setValueAtTime(vol, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        },

        startMusic: function() {
            if(this.bgmInterval) return;
            // Simple 8-bit loop
            const notes = [
                { f: 130.81, d: 0.2 }, { f: 0, d: 0.2 }, { f: 130.81, d: 0.2 }, { f: 155.56, d: 0.2 },
                { f: 196.00, d: 0.2 }, { f: 0, d: 0.2 }, { f: 196.00, d: 0.2 }, { f: 233.08, d: 0.2 }
            ];
            let i = 0;
            this.bgmInterval = setInterval(() => {
                if(!this.ctx || this.ctx.state !== 'running') return;
                const n = notes[i % notes.length];
                if(n.f > 0) {
                    // Bass
                    this.playTone(n.f, 0.15, 'square', 0.15);
                    // Harmony
                    if(i % 4 === 0) this.playTone(n.f * 1.5, 0.4, 'triangle', 0.05);
                }
                i++;
            }, 250); // 100ish BPM
        }
    };

    // --- GAME LOGIC MODULE ---
    const GameLogic = {
        state: {
            activeWorld: 'mine',
            // NEW: Previous World Memory
            prevWorld: 'mine',
            // NEW: Username for Save/Load
            username: null,
            
            // NEW: Global Currencies
            fabric: 0,
            trophies: 0,
            silk: 0, // NEW: Seide for Christmas Event
            
            // NEW: Track Completed Events
            eventsCompleted: { christmas: false },
            
            // NEW: Lock for Win Sequence (Prevent double trigger)
            winSequenceActive: false,

            // NEW: Artifacts Found
            artifactsFound: [],
            
            // NEW: Statistics Tracking
            stats: { 
                totalClicks: 0, 
                totalGold: 0, 
                blocksBroken: 0, 
                maxCombo: 0,
                startTime: Date.now() 
            },
            
            // NEW: Achievements Levels (id -> current tier index)
            achievementLevels: { depth: 0, gold: 0, clicks: 0, boss: 0, prestige: 0 },
            
            // NEW: Pets
            ownedPets: [], // List of IDs
            activePet: null, // ID of equipped pet

            // NEW: Combo System
            combo: 0,
            comboMult: 1,
            lastClickTime: 0,

            activeEvent: null, // 'xmas' or null
            forceNextArtifactDrop: false, // DEV-ONLY artifact drop override
            // ADDED: volume setting
            settings: { animations: true, volume: 0.3 },
            mine: {
                gold: 0, prestige: 0, prestigeCount: 0,
                depth: 1, maxDepth: 1, pickLevel: 0, currentHp: 1, maxHp: 1, // Start HP 1
                matIndex: 0, loopCount: 0, bossKills: 0,
                miners: Worlds.mine.miners.map(() => ({ level: 0 })),
                // NEW: Miner Prestige Upgrades
                minerUpgrades: Worlds.mine.miners.map(() => 0),
                // NEW: Click Skill Levels [Base, Crit, Multi]
                clickSkillLevels: [0, 0, 0],
                // NEW: Click Prestige Upgrade
                clickUpgrade: 0,
                costs: { tnt: 50, str: 100, min: 250, od: 1000 },
                buffs: { str: 0, min: 0, od: 0 },
                wasTouchedByPlayer: false
            },
            forest: {
                unlocked: false,
                gold: 0, prestige: 0, prestigeCount: 0,
                depth: 1, maxDepth: 1, pickLevel: 0, currentHp: 1, maxHp: 1, // Start HP 1
                matIndex: 0, loopCount: 0, bossKills: 0,
                miners: Worlds.forest.miners.map(() => ({ level: 0 })),
                // NEW
                minerUpgrades: Worlds.forest.miners.map(() => 0),
                clickSkillLevels: [0, 0, 0],
                clickUpgrade: 0,
                costs: { tnt: 50, str: 100, min: 250, od: 1000 },
                buffs: { str: 0, min: 0, od: 0 },
                wasTouchedByPlayer: false
            },
            // --- NEUER WÜSTEN STATE ---
            desert: {
                unlocked: false,
                gold: 0, prestige: 0, prestigeCount: 0,
                depth: 1, maxDepth: 1, pickLevel: 0, currentHp: 1, maxHp: 1,
                matIndex: 0, loopCount: 0, bossKills: 0,
                miners: Worlds.desert.miners.map(() => ({ level: 0 })),
                // NEW
                minerUpgrades: Worlds.desert.miners.map(() => 0),
                clickSkillLevels: [0, 0, 0],
                clickUpgrade: 0,
                costs: { tnt: 50, str: 100, min: 250, od: 1000 },
                buffs: { str: 0, min: 0, od: 0 },
                wasTouchedByPlayer: false
            },
            // --- NEUE EIS WELT STATE ---
            ice: {
                unlocked: false,
                gold: 0, prestige: 0, prestigeCount: 0,
                depth: 1, maxDepth: 1, pickLevel: 0, currentHp: 1, maxHp: 1,
                matIndex: 0, loopCount: 0, bossKills: 0,
                miners: Worlds.ice.miners.map(() => ({ level: 0 })),
                minerUpgrades: Worlds.ice.miners.map(() => 0),
                clickSkillLevels: [0, 0, 0],
                clickUpgrade: 0,
                costs: { tnt: 50, str: 100, min: 250, od: 1000 },
                buffs: { str: 0, min: 0, od: 0 },
                wasTouchedByPlayer: false
            },
            // --- NEW: CHRISTMAS EVENT STATE ---
            christmas: {
                unlocked: true, // Always open during event
                gold: 0, prestige: 0, prestigeCount: 0,
                depth: 1, maxDepth: 1, pickLevel: 0, currentHp: 50, maxHp: 50,
                matIndex: 0, loopCount: 0, bossKills: 0,
                miners: Worlds.christmas.miners.map(() => ({ level: 0 })),
                minerUpgrades: Worlds.christmas.miners.map(() => 0),
                clickSkillLevels: [0, 0, 0],
                clickUpgrade: 0,
                costs: { tnt: 50, str: 100, min: 250, od: 1000 },
                buffs: { str: 0, min: 0, od: 0 },
                wasTouchedByPlayer: false
            },
            snowflakes: 0,
            impactX: null, impactY: null, isBoss: false, isLucky: false, cracks: [], lastBgMatIndex: -1
        },

        // --- RESTORED MISSING AVATAR OBJECT ---
        avatar: {
            name: "Spieler 1",
            equipped: { hat: 'none', glasses: 'none', body: 'basic_grey', legs: 'basic_jeans', wings: 'none' },
            unlocked: ['none', 'basic_grey', 'basic_jeans']
        },

        // --- RESTORED MISSING HELPER FUNCTIONS ---
        getActive: function() { return this.state[this.state.activeWorld]; },
        getConfig: function() { return Worlds[this.state.activeWorld]; },

        // NEW: Check if event is active based on date
        isEventActive: function() {
            const now = new Date();
            const start = new Date('2025-12-12T00:00:00');
            const end = new Date('2026-01-04T23:59:59');
            return now >= start && now <= end;
        },

        formatNumber: function(num) {
            if (num < 1000000) return Math.floor(num).toLocaleString('de-DE');
            if (num < 1e9) return (num / 1e6).toFixed(2) + " Mio";
            if (num < 1e12) return (num / 1e9).toFixed(2) + " Mrd";
            if (num < 1e15) return (num / 1e12).toFixed(2) + " Bio";
            if (num < 1e18) return (num / 1e15).toFixed(2) + " Brd";
            if (num < 1e21) return (num / 1e18).toFixed(2) + " Tril";
            return num.toExponential(2);
        },

        getLoopInfo: function(loop) {
            if (loop === 0) return { prefix: "", color: null };
            if (loop === 1) return { prefix: "Gehärtet ", color: "#bdc3c7" };
            if (loop === 2) return { prefix: "Elite ", color: "#f1c40f" };
            if (loop === 3) return { prefix: "Albtraum ", color: "#c0392b" };
            if (loop === 4) return { prefix: "Höllisch ", color: "#8e44ad" };
            return { prefix: "Göttlich ", color: "#00d2d3" };
        },

        // NEW: Enter Christmas World
        enterChristmasWorld: function() {
            // CHANGED: Prevent entry if not active time
            if (!this.isEventActive()) {
                alert("Dieses Event ist momentan nicht verfügbar!");
                return;
            }

            // CHANGED: Prevent entry AND force visual update if completed
            if(this.state.eventsCompleted && this.state.eventsCompleted.christmas) {
                alert("Event bereits abgeschlossen! 🎄✅");
                
                // FORCE UPDATE BUTTON IMMEDIATELY
                const btn = document.getElementById('btn-xmas-travel');
                if(btn) {
                    btn.innerHTML = "ABGESCHLOSSEN 🔒";
                    btn.style.background = "#7f8c8d";
                    btn.style.cursor = "not-allowed";
                    btn.onclick = (e) => { e.preventDefault(); return false; };
                }
                return;
            }
            
            if(this.state.activeWorld === 'christmas') return;
            
            this.state.prevWorld = this.state.activeWorld; // Save previous world
            
            // UI Transition
            const overlay = document.getElementById('gift-transition');
            if(overlay) overlay.style.display = 'flex';
            document.getElementById('event-modal').style.display = 'none'; // Close modal
            
            // Wait for Animation
            setTimeout(() => {
                this.state.activeWorld = 'christmas';
                this.initWorldState();
                if(overlay) overlay.style.display = 'none';
                UI.spawnFloater(window.innerWidth/2, window.innerHeight/2, "HO HO HO!", "#c0392b");
                
                // Show Leave Button in Event Modal next time
                const leaveBtn = document.getElementById('leave-xmas-btn');
                if(leaveBtn) leaveBtn.style.display = 'block';

                // FIXED: FORCE UI UPDATE HERE to switch icons immediately
                UI.update();
            }, 2500);
        },

        // NEW: Leave Christmas World
        leaveChristmasWorld: function() {
            if(this.state.activeWorld !== 'christmas') return;
            
            this.state.activeWorld = this.state.prevWorld || 'mine';
            this.initWorldState();
            
            const leaveBtn = document.getElementById('leave-xmas-btn');
            if(leaveBtn) leaveBtn.style.display = 'none';
            document.getElementById('event-modal').style.display = 'none';
            
            // AGGRESSIVE OVERLAY CLEANUP
            const winOverlay = document.getElementById('event-win-overlay');
            const giftOverlay = document.getElementById('gift-transition');
            if(winOverlay) { winOverlay.style.display = 'none'; winOverlay.style.opacity = '0'; } // Force hide
            if(giftOverlay) { giftOverlay.style.display = 'none'; giftOverlay.style.opacity = '0'; }
            
            UI.spawnFloater(window.innerWidth/2, window.innerHeight/2, "WILLKOMMEN ZURÜCK", "#fff");
            
            // Save immediately to lock in progress
            this.saveGame();
            
            // Force Update UI to refresh buttons
            UI.update();
        },

        calculateDPS: function() {
            let act = this.getActive();
            
            // STOP DPS IN CHRISTMAS WORLD IF DONE
            if (this.state.activeWorld === 'christmas' && (act.depth > 400 || (this.state.eventsCompleted && this.state.eventsCompleted.christmas))) {
                return 0; 
            }

            let conf = this.getConfig();
            let dps = 0;
            let globalSynergyBonus = 0;

            // FIRST PASS: Calculate Synergy from all bots
            act.miners.forEach((m, i) => {
                if (m.level > 0 && m.skills && m.skills.synergy) {
                    // +1% Global DPS per Synergy Point
                    globalSynergyBonus += (m.skills.synergy * 0.01);
                }
            });

            act.miners.forEach((m, i) => { 
                if (m.level > 0) {
                    // NEW: Apply Aetherium Upgrade Multiplier (Base * Level * (1 + UpgradeLevel))
                    let prestigeBonus = (act.minerUpgrades && act.minerUpgrades[i]) ? (1 + act.minerUpgrades[i]) : 1;
                    
                    // CHANGED: Milestone Bonus! x2 Damage every 10 Levels
                    let milestoneBonus = Math.pow(2, Math.floor(m.level / 10));

                    // NEW: Skill Tree Bonuses
                    let skillMult = 1;
                    if (m.skills) {
                        // Overclock: +20% per point
                        if(m.skills.dps) skillMult += (m.skills.dps * 0.20);
                    }

                    dps += (conf.miners[i].basePower * m.level) * prestigeBonus * milestoneBonus * skillMult;
                }
            });

            // Apply Global Synergy
            dps *= (1 + globalSynergyBonus);

            let multiplier = 1;
            if (Date.now() < act.buffs.min) multiplier *= 2;
            if (Date.now() < act.buffs.od) multiplier *= 3;
            
            // Apply Pet DPS Bonus
            this.state.ownedPets.forEach(pid => {
                let p = Worlds.pets.find(x => x.id === pid);
                if(p && p.type === 'dps') multiplier += p.val;
            });
            
            // NEW: Artifact DPS Bonus (Including Christmas Star)
            if (this.state.artifactsFound.includes('root_heart')) multiplier += 0.05;
            if (this.state.artifactsFound.includes('christmas_star')) multiplier += 0.50; // +50% Global

            // CHANGED: Rebalanced Prestige (Miner 50% -> 25%)
            let prestigeMult = 1 + (act.prestige * 0.25); 
            return dps * multiplier * prestigeMult;
        },

        hitBlock: function(x, y, dmg = null, isAuto = false) {
            // STOP MINING IN CHRISTMAS WORLD IF DONE
            if (this.state.activeWorld === 'christmas' && (this.getActive().depth > 400 || (this.state.eventsCompleted && this.state.eventsCompleted.christmas))) {
                return; // Do nothing
            }

            let act = this.getActive(); let conf = this.getConfig();

            // TRY INIT AUDIO ON CLICK
            if (!isAuto) {
                AudioController.init();
                // Play sound based on world
                AudioController.playHit(this.state.activeWorld);

                // Track clicks
                if(!this.state.stats) this.state.stats = { totalClicks: 0, totalGold: 0, blocksBroken: 0, maxCombo: 0, startTime: Date.now() };
                this.state.stats.totalClicks++;
                if (dmg === null) act.wasTouchedByPlayer = true;
                this.checkAchievements(); // Check click achievements

                // --- NEW: COMBO LOGIC (Arcade Style) ---
                let now = Date.now();
                // NEW: Artifact Combo Time Bonus
                let comboWindow = 800;
                if(this.state.artifactsFound.includes('frozen_flame')) comboWindow += 100;

                if (now - this.state.lastClickTime < comboWindow) { // Must click within window
                    this.state.combo++;
                    if(this.state.combo > this.state.stats.maxCombo) this.state.stats.maxCombo = this.state.combo;
                } else {
                    this.state.combo = 1; // Reset
                }
                this.state.lastClickTime = now;

                // Calculate Multiplier & Check Level Up
                let oldMult = this.state.comboMult;
                
                if (this.state.combo >= 30) this.state.comboMult = 3;
                else if (this.state.combo >= 10) this.state.comboMult = 2;
                else this.state.comboMult = 1;

                // Visual Pop for Combo Level Up
                if (this.state.comboMult > oldMult) {
                    UI.spawnFloater(x, y - 50, "COMBO UP!", "#f1c40f");
                    AudioController.playTone(400 + (this.state.comboMult * 200), 0.2, 'square', 0.1);
                }
            }

            // NEW: Silk Drop Logic (Only in Christmas World)
            if (this.state.activeWorld === 'christmas' && !isAuto && Math.random() < 0.02) { // 2% Silk Chance
                this.state.silk++;
                if (this.state.settings.animations) {
                    UI.spawnFloater(x, y - 40, "+1 🧣", "#fab1a0");
                }
            }

            // NEW: Fabric Drop Logic (Only on manual clicks, NOT in Xmas world maybe? Or both?)
            // Let's keep fabric in other worlds
            let fabricChance = 0.01;
            if(this.state.artifactsFound.includes('djinn_lamp')) fabricChance += 0.01; // +1% Chance

            if (this.state.activeWorld !== 'christmas' && !isAuto && Math.random() < fabricChance) { 
                this.state.fabric++;
                if (this.state.settings.animations) {
                    UI.spawnFloater(x, y - 40, "+1 🧶", "#fff");
                }
                UI.update(); // Update HUD
            }

            if (this.state.impactX === null) {
                this.state.impactX = x; this.state.impactY = y;
                this.generateCracks(x, y);
            }
            let basePower = dmg || conf.picks[act.pickLevel].power;
            
            if (!dmg && !isAuto) {
                // Apply Combo Multiplier
                basePower *= this.state.comboMult;

                // --- NEW CLICK SKILL LOGIC ---
                // 1. Add Flat Damage (SCALED NOW)
                if (act.clickSkillLevels) {
                    // CHANGED: Base skill now scales with pickaxe power (1 + 10% of pick power per level)
                    let skillLvl = (act.clickSkillLevels[0] || 0);
                    let scaleBonus = Math.floor(conf.picks[act.pickLevel].power * 0.1);
                    basePower += skillLvl * (1 + scaleBonus);
                }

                let buffMultiplier = 1 + (act.bossKills * 0.10); 
                // NEW: Artifact Boss DMG
                if(this.state.isBoss && this.state.artifactsFound.includes('mammoth_tusk')) buffMultiplier += 0.2;

                if (Date.now() < act.buffs.str) buffMultiplier *= 2; 
                if (Date.now() < act.buffs.od) buffMultiplier *= 3; 
                basePower *= buffMultiplier;
                
                // 2. Add Percentage Multiplier (Skill 3)
                if (act.clickSkillLevels && act.clickSkillLevels[2] > 0) {
                     let multi = 1 + (act.clickSkillLevels[2] * conf.clickSkills[2].val);
                     basePower *= multi;
                }
                
                // NEW: Artifact Click Bonus
                if(this.state.artifactsFound.includes('scarab_amulet')) basePower *= 1.1;

                // Prestige applies to manual clicks (10% per point)
                // CHANGED: Buffed Click Prestige to 25% (was 10%)
                let prestigeMult = 1 + (act.prestige * 0.25); 
                basePower *= prestigeMult;

                // NEW: Apply Click Prestige Upgrade
                if(act.clickUpgrade) {
                    basePower *= (1 + act.clickUpgrade);
                }

                // 3. Crit Chance (Skill 2) - overrides isLucky
                let critChance = 0.05; // Base 5%
                if (act.clickSkillLevels) {
                    critChance += (act.clickSkillLevels[1] || 0) * (conf.clickSkills[1].val / 100);
                }
                
                // Pet Crit Bonus
                this.state.ownedPets.forEach(pid => {
                    let p = Worlds.pets.find(x => x.id === pid);
                    if(p && p.type === 'crit') critChance += p.val;
                });
                
                // NEW: Artifact Crit Bonus
                if(this.state.artifactsFound.includes('compass')) critChance += 0.05;

                // Cap Crit at 50%
                if (critChance > 0.5) critChance = 0.5;

                this.state.isLucky = Math.random() < critChance;
                // If lucky, apply 5x damage (can be upgraded later?)
                if(this.state.isLucky) basePower *= 5;
            }
            
            act.currentHp -= basePower;
            
            // Visuals via UI module
            if (this.state.settings.animations) {
                let pColor = (Date.now() < act.buffs.od) ? "#e74c3c" : null;
                if (!pColor && isAuto) pColor = "#e67e22";
                if (!isAuto || Math.random() > 0.7) UI.spawnParticles(x, y, isAuto ? 1 : 5, pColor);
                if(!isAuto) UI.shake = 4;
                if(!isAuto || Math.random() > 0.8) UI.spawnFloater(x, y, `-${this.formatNumber(basePower)}`, "#fff");
            }
            
            if (act.currentHp <= 0) {
                // CHANGED: Simply call breakBlock. We handle the win logic INSIDE breakBlock
                // to ensure loot is given and logic is consistent for bots & clicks.
                this.breakBlock();
            }
            UI.update();
        },

        // NEW: Helper to complete event cleanly
        completeChristmasEvent: function() {
            // Prevent multiple triggers
            if(this.state.eventsCompleted.christmas) return;
            
            this.state.artifactsFound.push('christmas_star');
            this.state.eventsCompleted.christmas = true;
            
            // Show Win UI
            UI.showEventWinSequence();
        },

        breakBlock: function() {
            let act = this.getActive(); 
            let conf = this.getConfig();
            let mat = conf.materials[act.matIndex];
            
            // CHANGED: Custom Loop Multiplier for Christmas (Gentle Scaling)
            // CHANGED: Wall fix! Reduced 50M base to 30.
            let loopBase = 30; // Was 50000000
            if (this.state.activeWorld === 'christmas') loopBase = 10; // Gentle event scaling
            let loopMultiplier = Math.pow(loopBase, act.loopCount);
            
            // Pet Gold Bonus
            let petGoldMult = 1;
            this.state.ownedPets.forEach(pid => {
                let p = Worlds.pets.find(x => x.id === pid);
                if(p && p.type === 'gold') petGoldMult += p.val;
            });
            
            // NEW: Artifact Gold Bonus
            if (this.state.artifactsFound.includes('amber_fly')) petGoldMult += 0.1;

            let reward = mat.val * loopMultiplier * petGoldMult;
            let ex = this.state.impactX || 160; let ey = this.state.impactY || 160;
            
            // XMAS SNOWFLAKE DROP
            if (this.state.activeEvent === 'xmas' && Math.random() < 0.3) {
                this.state.snowflakes++;
                if (this.state.settings.animations) {
                     UI.spawnFloater(ex, ey - 50, "+1 ❄️", "#a2d9ff");
                }
            }

            // FIXED: ABSOLUTE PRIORITY EVENT WIN LOGIC
            // Intercepts logic BEFORE depth increment
            if (this.state.activeWorld === 'christmas' && act.depth === 400) {
                // 1. Give Loot
                act.gold += reward;
                
                // 2. Mark Event Complete & Award Artifact
                if (!this.state.eventsCompleted.christmas) {
                    this.state.eventsCompleted.christmas = true;
                    if (!this.state.artifactsFound.includes('christmas_star')) {
                        this.state.artifactsFound.push('christmas_star');
                    }
                    
                    // 3. Trigger Win UI sequence
                    UI.showEventWinSequence();
                }
                
                // 4. Advance Depth (so we are past the boss)
                act.depth++;
                if(act.depth > act.maxDepth) act.maxDepth = act.depth;
                
                // 5. Update UI for Gold but STOP there (don't generate next block yet)
                UI.update();
                return; 
            }
            const canRollArtifacts = !this.state.isBoss && act.wasTouchedByPlayer && act.depth >= MIN_ARTIFACT_DEPTH && this.state.activeWorld !== 'christmas';
            const forceArtifactDrop = this.state.forceNextArtifactDrop;

            // NEW: Artifact Drop Logic
            if (canRollArtifacts) {
                this.state.forceNextArtifactDrop = false;
                let forcedApplied = false;
                Worlds.artifacts.forEach(art => {
                    // Check world and if not already found
                    if(art.world === this.state.activeWorld && !this.state.artifactsFound.includes(art.id)) {
                        const shouldForce = forceArtifactDrop && !forcedApplied;
                        if(shouldForce || Math.random() < art.chance) {
                            this.state.artifactsFound.push(art.id);
                            UI.spawnFloater(ex, ey+50, "ARTEFAKT GEFUNDEN!", "#f1c40f");
                            // Modal Popup or Notification could be added here
                            setTimeout(() => alert(`🏺 ARTEFAKT GEFUNDEN: ${art.name}\n${art.bonus}`), 100);
                            if(shouldForce) forcedApplied = true;
                        }
                    }
                });
            } else if (this.state.forceNextArtifactDrop) {
                this.state.forceNextArtifactDrop = false;
            }

            if (this.state.settings.animations) {
                if (this.state.isBoss) { reward *= 20; act.bossKills++; UI.spawnFloater(ex, 160, "BOSS BESIEGT!", "#e74c3c"); } 
                else if(this.state.isLucky) { reward *= 5; UI.spawnFloater(ex, 160, `+${this.formatNumber(reward)}`, "#f1c40f"); } 
                else UI.spawnFloater(ex, 160, `+${this.formatNumber(reward)}`, "#f1c40f");
                UI.spawnSparkles(ex, ey, 20); 
            } else {
                if(this.state.isBoss) { reward *= 20; act.bossKills++; } else if(this.state.isLucky) reward *= 5;
            }
            
            // Standard Logic
            act.gold += reward; 
            act.depth++; 
            if(act.depth > act.maxDepth) act.maxDepth = act.depth; 
            
            // Track Total Gold
            if(!this.state.stats) this.state.stats = {};
            this.state.stats.totalGold = (this.state.stats.totalGold || 0) + reward;
            this.state.stats.blocksBroken = (this.state.stats.blocksBroken || 0) + 1;

            UI.generateBlockTexture();
            this.checkWorldUnlock();
            this.checkAchievements();
        },

        buyPickUpgrade: function() {
            let act = this.getActive(); let conf = this.getConfig();
            let next = conf.picks[act.pickLevel + 1];
            
            // NEW: Artifact Cost Reduction
            let costMult = 1;
            if(this.state.artifactsFound.includes('fossil')) costMult = 0.9;
            
            if (next) {
                let cost = Math.floor(next.cost * costMult);
                if (act.gold >= cost) { act.gold -= cost; act.pickLevel++; if(this.state.settings.animations) UI.spawnFloater(160, 280, "Upgrade!", "#2ecc71"); UI.update(); UI.updateCursor(); }
            }
        },
        
        buyMiner: function(index) {
            let act = this.getActive(); let conf = this.getConfig();
            let m = act.miners[index]; let type = conf.miners[index];
            let baseCost = (m.level === 0) ? type.baseCost : Math.floor(type.baseCost * Math.pow(1.20, m.level));
            
            // NEW: Artifact Cost Reduction
            let costMult = 1;
            if(this.state.artifactsFound.includes('fossil')) costMult = 0.9;
            
            // NEW: Skill Tree Cost Reduction
            if(m.skills && m.skills.cost) {
                // -2% per point
                let discount = m.skills.cost * 0.02;
                if(discount > 0.5) discount = 0.5; // Cap at 50%
                costMult -= discount;
            }

            let cost = Math.floor(baseCost * costMult);

            if (act.gold >= cost) { act.gold -= cost; m.level++; UI.update(); UI.updateActiveMiners(); }
        },

        // NEW: BOT SKILL LOGIC
        openBotSkills: function(index) {
            this.currentSkillBotIndex = index;
            let act = this.getActive();
            let m = act.miners[index];
            
            // Init skills if missing
            if(!m.skills) m.skills = { dps: 0, cost: 0, synergy: 0 };
            
            UI.openBotSkills(index);
        },

        buyBotSkill: function(skillType) {
            let index = this.currentSkillBotIndex;
            let act = this.getActive();
            let m = act.miners[index];
            
            // Calculate available points
            let totalPoints = Math.floor(m.level / 20);
            let usedPoints = (m.skills.dps||0) + (m.skills.cost||0) + (m.skills.synergy||0);
            let available = totalPoints - usedPoints;
            
            if (available > 0) {
                // Check Max Levels
                if (skillType === 'cost' && m.skills.cost >= 25) return; // Max 50%
                if (skillType === 'synergy' && m.skills.synergy >= 10) return; // Max 10%

                m.skills[skillType]++;
                UI.spawnFloater(window.innerWidth/2, window.innerHeight/2, "MODUL INSTALLIERT!", "#00d2d3");
                UI.openBotSkills(index); // Refresh UI
                UI.update(); // Update DPS/Cost displays
            }
        },

        // --- RESTORED MISSING FUNCTIONS ---
        
        generateCracks: function(originX, originY) {
            this.state.cracks = []; 
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
                this.state.cracks.push(path); 
            }
        },

        checkAchievements: function() {
            let act = this.getActive();
            // Ensure objects exist
            if(!this.state.achievementLevels) this.state.achievementLevels = { depth:0, gold:0, clicks:0, boss:0, prestige:0 };
            if(!this.state.stats) this.state.stats = { totalClicks: 0 };

            Worlds.achievements.forEach(ach => {
                let currentTier = this.state.achievementLevels[ach.id] || 0;
                let goal = Math.floor(ach.baseGoal * Math.pow(ach.scale, currentTier));
                
                // For Prestige, scale differently (linear + 1)
                if(ach.type === 'prestige') goal = ach.baseGoal + currentTier; 

                let currentVal = 0;
                if(ach.type === 'depth') currentVal = act.depth;
                if(ach.type === 'gold') currentVal = act.gold;
                if(ach.type === 'clicks') currentVal = this.state.stats.totalClicks;
                if(ach.type === 'boss') currentVal = act.bossKills;
                if(ach.type === 'prestige') currentVal = act.prestigeCount;

                if (currentVal >= goal) {
                    this.unlockAchievement(ach, currentTier + 1);
                }
            });
        },

        unlockAchievement: function(ach, newTier) {
            this.state.achievementLevels[ach.id] = newTier;
            
            // Give Reward (Trophies)
            let reward = ach.baseReward + (newTier - 1); 
            this.state.trophies += reward;

            // UI Notification
            UI.showAchievementToast(ach.name, `Stufe ${newTier} erreicht!`, reward);
            UI.update(); 
            // If Modal is open, refresh it
            if(document.getElementById('achieve-modal').style.display === 'flex') {
                UI.renderAchievements();
            }
        },

        buyPet: function(petId) {
            let pet = Worlds.pets.find(p => p.id === petId);
            if(pet && this.state.trophies >= pet.cost) {
                this.state.trophies -= pet.cost;
                this.state.ownedPets.push(petId);
                // Auto equip first pet
                if(this.state.ownedPets.length === 1) this.state.activePet = petId;
                
                UI.update();
                UI.renderPetShop();
                UI.spawnFloater(window.innerWidth/2, window.innerHeight/2, "NEUER BEGLEITER!", pet.color);
            }
        },
        
        equipPet: function(petId) {
            if(this.state.ownedPets.includes(petId)) {
                this.state.activePet = petId;
                UI.renderPetShop();
            }
        },

        trade: function(percent) {
            const sellType = document.getElementById('ex-sell-select').value;
            const buyType = document.getElementById('ex-buy-select').value;
            
            if(sellType === buyType) return; // Same type check

            // Check unlock
            if (buyType === 'forest' && !this.state.forest.unlocked) { alert("Zielwelt nicht freigeschaltet!"); return; }
            if (buyType === 'desert' && !this.state.desert.unlocked) { alert("Zielwelt nicht freigeschaltet!"); return; }
            if (buyType === 'ice' && !this.state.ice.unlocked) { alert("Zielwelt nicht freigeschaltet!"); return; }

            // Currency references
            let sellSource = this.state[sellType];
            let buySource = this.state[buyType];
            
            let sellAmount = Math.floor(sellSource.gold * percent);
            if(sellAmount <= 0) return;

            // Calculate Rate
            // Tier definition: Mine=1, Forest=2, Desert=3, Ice=4
            const tiers = { mine: 1, forest: 2, desert: 3, ice: 4 };
            let sTier = tiers[sellType];
            let bTier = tiers[buyType];
            
            let rate = 0;
            
            if (bTier > sTier) {
                // Buying higher tier (expensive - NERFED)
                let diff = bTier - sTier;
                let costFactor = Math.pow(200000000, diff); // 200 Million Base
                rate = 1 / costFactor; 
            } else {
                // Buying lower tier (profitable but taxed)
                let diff = sTier - bTier;
                let gainFactor = Math.pow(20000000, diff); // 20 Million Base
                rate = gainFactor;
            }

            let buyAmount = Math.floor(sellAmount * rate);
            
            if(buyAmount > 0) {
                sellSource.gold -= sellAmount;
                buySource.gold += buyAmount;
                
                UI.spawnFloater(window.innerWidth/2, window.innerHeight/2, "HANDEL ERFOLGREICH!", "#2ecc71");
                AudioController.playTone(600, 0.1, 'sine', 0.1);
                
                UI.update();
                UI.updateExchangeRate(); // Refresh balances
            } else {
                UI.spawnFloater(window.innerWidth/2, window.innerHeight/2, "NICHT GENUG WERT!", "#e74c3c");
            }
        },

        buyTNT: function() {
            let act = this.getActive();
            if(act.gold >= act.costs.tnt) { 
                act.gold -= act.costs.tnt; act.costs.tnt = Math.floor(act.costs.tnt * 1.6); 
                let dmg = Math.floor(act.maxHp * 0.25); let cap = Math.floor(act.currentHp * 0.5); 
                this.hitBlock(160, 160, Math.max(500, Math.min(dmg, cap))); 
                if(this.state.settings.animations) UI.spawnFloater(160, 160, "BUMM!", "#e74c3c"); 
                UI.update();
            }
        },
        
        // BUFF LOGIC
        activateBuff: function(type) {
            let act = this.getActive();
            act.buffs[type] = Date.now() + 15000;
            UI.update();
        },
        buyPotionStrength: function() { let act = this.getActive(); if(act.gold >= act.costs.str) { act.gold -= act.costs.str; act.costs.str = Math.floor(act.costs.str * 1.8); this.activateBuff('str'); } },
        buyPotionMiner: function() { let act = this.getActive(); if(act.gold >= act.costs.min) { act.gold -= act.costs.min; act.costs.min = Math.floor(act.costs.min * 1.8); this.activateBuff('min'); } },
        buyPotionOverdrive: function() { let act = this.getActive(); if(act.gold >= act.costs.od) { act.gold -= act.costs.od; act.costs.od = Math.floor(act.costs.od * 2.0); this.activateBuff('od'); } },

        // BUBBLE LOGIC
        checkBubbleSpawn: function() {
            if (Date.now() > this.state.nextBubbleTime) {
                UI.spawnBubbleElement(() => { this.clickBubble(); });
                this.state.nextBubbleTime = Date.now() + (Math.random() * 10 + 5) * 60 * 1000; 
            }
        },
        clickBubble: function() {
            let rand = Math.random();
            let act = this.getActive();
            
            if (rand < 0.4) {
                this.activateBuff('str'); UI.spawnFloater(window.innerWidth/2, window.innerHeight/2, "STÄRKE BOOST!", "#9b59b6");
            } else if (rand < 0.8) {
                this.activateBuff('min'); UI.spawnFloater(window.innerWidth/2, window.innerHeight/2, "ROBO ÖL!", "#00d2d3");
            } else if (rand < 0.9) {
                this.activateBuff('od'); UI.spawnFloater(window.innerWidth/2, window.innerHeight/2, "OVERDRIVE!", "#e74c3c");
            } else {
                let reward = this.calculateDPS() * 300; 
                if(reward < 100) reward = 1000 * act.depth; 
                act.gold += reward;
                UI.spawnFloater(window.innerWidth/2, window.innerHeight/2, `JACKPOT! +${this.formatNumber(reward)}`, "#f1c40f");
                UI.spawnSparkles(window.innerWidth/2, window.innerHeight/2, 50);
            }
            UI.update();
        },
        
        // EVENT LOGIC
        toggleEvent: function(eventName) {
            if (this.state.activeEvent === eventName) {
                this.state.activeEvent = null;
                document.body.classList.remove('theme-xmas');
                const t = document.getElementById('xmas-toggle');
                if(t) t.classList.remove('active');
                const shopBtn = document.getElementById('event-shop-btn');
                if(shopBtn) shopBtn.style.display = 'none';
            } else {
                this.state.activeEvent = eventName;
                document.body.classList.add('theme-xmas');
                const t = document.getElementById('xmas-toggle');
                if(t) t.classList.add('active');
                const shopBtn = document.getElementById('event-shop-btn');
                if(shopBtn) shopBtn.style.display = 'flex';
            }
            UI.generateBlockTexture(); // Redraw block with present style
            UI.update();
        },
        buyEventItem: function(itemId) {
            // Find item in cosmetics
            let foundItem = null;
            let category = '';
            for(let cat in Worlds.cosmetics) {
                let item = Worlds.cosmetics[cat].find(i => i.id === itemId);
                if(item) { foundItem = item; category = cat; break; }
            }
            
            if(foundItem) {
                if(this.avatar.unlocked.includes(itemId)) {
                    this.avatar.equipped[category] = itemId;
                    UI.renderEventShop(); UI.renderAvatarPreview(); UI.renderAvatarIcon();
                } else {
                    if (this.state.snowflakes >= foundItem.cost) {
                        this.state.snowflakes -= foundItem.cost;
                        this.avatar.unlocked.push(itemId);
                        this.avatar.equipped[category] = itemId;
                        UI.renderEventShop(); UI.renderAvatarPreview(); UI.renderAvatarIcon(); UI.update();
                    }
                }
            }
        },

        checkWorldUnlock: function() {
            const COST = 1e12; 
            if(this.state.mine.maxDepth >= 1000) {
                document.getElementById('world-btn').className = "hud-btn";
                document.getElementById('world-btn').classList.remove('locked');
            } else {
                 document.getElementById('world-btn').className = "hud-btn locked";
            }
            document.getElementById('card-mine').className = this.state.activeWorld === 'mine' ? 'world-card active' : 'world-card';
            document.getElementById('card-forest').className = this.state.activeWorld === 'forest' ? 'world-card active' : 'world-card';
            
            // Desert Check logic
            const desertBtn = document.getElementById('btn-desert-action');
            document.getElementById('card-desert').className = this.state.activeWorld === 'desert' ? 'world-card active' : 'world-card';

            if (this.state.desert.unlocked) {
                desertBtn.innerText = "REISEN"; 
                desertBtn.className = "btn-travel"; 
                desertBtn.onclick = () => this.travelTo('desert'); 
                desertBtn.disabled = this.state.activeWorld === 'desert';
            } else {
                if (this.state.forest.maxDepth >= 1000) {
                     desertBtn.innerText = "FREISCHALTEN (1 Bio. Harz)";
                     desertBtn.className = "btn-unlock";
                     desertBtn.onclick = () => this.tryUnlockDesert(COST);
                     desertBtn.disabled = this.state.forest.gold < COST;
                } else {
                     desertBtn.innerText = "Benötigt: Wald Tiefe 1000";
                     desertBtn.className = "btn-unlock";
                     desertBtn.disabled = true;
                }
            }

            // Ice World Check Logic
            const iceBtn = document.getElementById('btn-ice-action');
            document.getElementById('card-ice').className = this.state.activeWorld === 'ice' ? 'world-card active' : 'world-card';

            if (this.state.ice.unlocked) {
                iceBtn.innerText = "REISEN"; 
                iceBtn.className = "btn-travel"; 
                iceBtn.onclick = () => this.travelTo('ice'); 
                iceBtn.disabled = this.state.activeWorld === 'ice';
            } else {
                if (this.state.desert.maxDepth >= 1000) {
                     iceBtn.innerText = "FREISCHALTEN (1 Bio. Skara)";
                     iceBtn.className = "btn-unlock";
                     iceBtn.onclick = () => this.tryUnlockIce(COST);
                     iceBtn.disabled = this.state.desert.gold < COST;
                } else {
                     iceBtn.innerText = "Benötigt: Wüste Tiefe 1000";
                     iceBtn.className = "btn-unlock";
                     iceBtn.disabled = true;
                }
            }

            const mineBtn = document.getElementById('btn-mine-action');
            if (this.state.activeWorld === 'mine') { 
                mineBtn.innerText = "AKTIV"; 
                mineBtn.disabled = true; 
            } else { 
                mineBtn.innerText = "REISEN"; 
                mineBtn.onclick = () => this.travelTo('mine');
                mineBtn.disabled = false; 
            }
            
            const forestBtn = document.getElementById('btn-forest-action');
            if (this.state.forest.unlocked) {
                forestBtn.innerText = "REISEN"; forestBtn.className = "btn-travel"; forestBtn.onclick = () => this.travelTo('forest'); forestBtn.disabled = this.state.activeWorld === 'forest';
            } else {
                forestBtn.innerText = "FREISCHALTEN (1 Bio. Gold)"; forestBtn.className = "btn-unlock"; forestBtn.onclick = () => this.tryUnlockForest(COST); forestBtn.disabled = this.state.mine.gold < COST;
            }
        },

        tryUnlockForest: function(cost) {
            if(this.state.mine.gold >= cost) { this.state.mine.gold -= cost; this.state.forest.unlocked = true; this.travelTo('forest'); }
        },
        tryUnlockDesert: function(cost) {
            if(this.state.forest.gold >= cost) { this.state.forest.gold -= cost; this.state.desert.unlocked = true; this.travelTo('desert'); }
        },
        tryUnlockIce: function(cost) {
            if(this.state.desert.gold >= cost) { this.state.desert.gold -= cost; this.state.ice.unlocked = true; this.travelTo('ice'); }
        },

        // NEW ACTION: Buy Click Skill
        buyClickSkill: function(index) {
            let act = this.getActive(); let conf = this.getConfig();
            let skill = conf.clickSkills[index];
            // Safe guard if array doesn't exist in save
            if(!act.clickSkillLevels) act.clickSkillLevels = [0,0,0];
            
            let lvl = act.clickSkillLevels[index];
            if(skill.max && lvl >= skill.max) return; // Max level check
            
            // Cost scaling: Base * 1.5^Level
            let cost = Math.floor(skill.baseCost * Math.pow(1.5, lvl));
            
            if (act.gold >= cost) {
                act.gold -= cost;
                act.clickSkillLevels[index]++;
                UI.update();
                UI.renderClickSkills(); // Refresh list to show new prices
                UI.spawnFloater(160, 280, "Skill Up!", "#2ecc71");
            }
        },

        buyAetheriumUpgrade: function(index) {
            let act = this.getActive();
            let currentLvl = act.minerUpgrades[index] || 0;
            let cost = 1 + (currentLvl * 2);
            
            if(act.prestige >= cost) {
                act.prestige -= cost;
                act.minerUpgrades[index] = currentLvl + 1;
                UI.update();
                UI.renderAetheriumShop();
                UI.spawnFloater(window.innerWidth/2, window.innerHeight/2, "UPGRADE!", "#00d2d3");
            }
        },

        buyAetheriumClickUpgrade: function() {
            let act = this.getActive();
            let currentLvl = act.clickUpgrade || 0;
            let cost = 1 + (currentLvl * 2);
            
            if(act.prestige >= cost) {
                act.prestige -= cost;
                act.clickUpgrade = currentLvl + 1;
                UI.update();
                UI.renderAetheriumShop();
                UI.spawnFloater(window.innerWidth/2, window.innerHeight/2, "CLICK POWER UP!", "#e74c3c");
            }
        },

        travelTo: function(world) {
            if(world === this.state.activeWorld) return;
            this.state.activeWorld = world; 
            this.initWorldState(); 
            UI.closeWorldTravel(); 
            UI.spawnFloater(160, 160, "WELT GEWECHSELT!", "#fff");
            
            // NEW: Reset UI Tabs to Miners when switching world
            UI.switchMainTab('miners');
        },
        doPrestige: function() {
            let act = this.getActive();
            let reqDepth = 50 + (act.prestigeCount * 20);
            if (act.depth < reqDepth) return;
            let reward = Math.floor(act.depth / 20);
            act.prestige += reward; act.prestigeCount++;
            act.gold = 0; act.depth = 1; act.pickLevel = 0; act.matIndex = 0;
            act.loopCount = 0; act.bossKills = 0;
            act.miners.forEach(m => m.level = 0);
            // RESET CLICK SKILLS ON PRESTIGE (They are gold upgrades)
            act.clickSkillLevels = [0, 0, 0];
            
            // NOTE: We do NOT reset minerUpgrades or clickUpgrade here, they are permanent!
            act.costs = { tnt: 50, str: 100, min: 250, od: 1000 };
            this.state.lastBgMatIndex = -1; 
            UI.generateBlockTexture(); UI.update(); 
            // Re-render lists
            UI.renderMinerList(); 
            UI.renderClickSkills();
            UI.updateActiveMiners(); UI.updateCursor();
            UI.closePrestige(); UI.spawnFloater(160, 160, "AUFSTIEG ERFOLGREICH!", this.getConfig().config.themeColor);
        },
        initWorldState: function() {
             // Reset volatile state
            this.state.lastBgMatIndex = -1; 
            this.state.impactX = null; 
            this.state.impactY = null; 
            this.state.cracks = []; 
            UI.particles = []; 
            UI.floaters = [];
            
            // Sync UI
            UI.syncWorldTheme();
            
            // Re-render
            UI.renderMinerList();
            UI.generateBlockTexture();
            UI.updateActiveMiners();
            UI.updateCursor();
            UI.renderAvatarIcon();
        },

        // --- SAVE SYSTEM ---
        saveGame: function() {
            if (!this.username) return; // Don't save if not logged in

            const saveObject = {
                version: 1.4, // Version bump
                timestamp: Date.now(),
                state: {
                    mine: this.state.mine,
                    forest: this.state.forest,
                    desert: this.state.desert, 
                    ice: this.state.ice, 
                    christmas: this.state.christmas, 
                    
                    fabric: this.state.fabric,
                    trophies: this.state.trophies,
                    silk: this.state.silk, 
                    
                    // Save Artifacts & Stats
                    artifactsFound: this.state.artifactsFound,
                    stats: this.state.stats,
                    eventsCompleted: this.state.eventsCompleted, 

                    achievementLevels: this.state.achievementLevels,
                    ownedPets: this.state.ownedPets,
                    activePet: this.state.activePet,
                    
                    activeWorld: this.state.activeWorld,
                    prevWorld: this.state.prevWorld, 
                    snowflakes: this.state.snowflakes,
                    settings: this.state.settings,
                    activeEvent: this.state.activeEvent
                },
                avatar: this.avatar
            };
            try {
                // CHANGED: Base64 Encode the Save String (Security Obfuscation)
                // We use encodeURIComponent to handle Emojis/UTF-8 correctly before base64
                const jsonString = JSON.stringify(saveObject);
                const encodedString = btoa(unescape(encodeURIComponent(jsonString)));
                
                localStorage.setItem('DeepDigSave_' + this.username, encodedString);
                
                if(UI && UI.spawnFloater) UI.spawnFloater(window.innerWidth/2, 50, "GESPEICHERT 💾", "#2ecc71");
                console.log("Spiel gespeichert (Secure) für " + this.username);
            } catch(e) { console.error("Speichern fehlgeschlagen:", e); }
        },

        loadGame: function() {
            if (!this.username) return false;

            const savedString = localStorage.getItem('DeepDigSave_' + this.username);
            if (!savedString) return false;

            try {
                let jsonString;
                
                // CHANGED: Check if legacy save (starts with {) or Base64
                if (savedString.trim().startsWith('{')) {
                    // Legacy Save (Plain JSON)
                    jsonString = savedString;
                    console.log("Legacy Save detected - Migrating on next save.");
                } else {
                    // Encoded Save - Decode it
                    try {
                        jsonString = decodeURIComponent(escape(atob(savedString)));
                    } catch(e) {
                        console.error("Save file decoding failed, trying plain text fallback...");
                        jsonString = savedString;
                    }
                }

                const saved = JSON.parse(jsonString);
                
                if(saved.avatar) this.avatar = saved.avatar;

                if(saved.state) {
                    const safeLoad = (target, source) => {
                        Object.assign(target, source);
                        if(!target.clickSkillLevels) target.clickSkillLevels = [0,0,0];
                        if(!target.minerUpgrades) target.minerUpgrades = target.miners.map(() => 0);
                    };

                    if(saved.state.mine) safeLoad(this.state.mine, saved.state.mine);
                    if(saved.state.forest) safeLoad(this.state.forest, saved.state.forest);
                    if(saved.state.desert) safeLoad(this.state.desert, saved.state.desert);
                    if(saved.state.ice) safeLoad(this.state.ice, saved.state.ice); 
                    if(saved.state.christmas) safeLoad(this.state.christmas, saved.state.christmas); 
                    
                    if(saved.state.activeWorld) this.state.activeWorld = saved.state.activeWorld;
                    if(saved.state.prevWorld) this.state.prevWorld = saved.state.prevWorld; 
                    if(saved.state.snowflakes !== undefined) this.state.snowflakes = saved.state.snowflakes;
                    
                    if(saved.state.fabric !== undefined) this.state.fabric = saved.state.fabric;
                    if(saved.state.silk !== undefined) this.state.silk = saved.state.silk; 
                    if(saved.state.trophies !== undefined) this.state.trophies = saved.state.trophies;
                    if(saved.state.achievementLevels) this.state.achievementLevels = saved.state.achievementLevels;
                    else this.state.achievementLevels = { depth:0, gold:0, clicks:0, boss:0, prestige:0 };
                    
                    if(saved.state.ownedPets) this.state.ownedPets = saved.state.ownedPets;
                    else this.state.ownedPets = [];
                    if(saved.state.activePet) this.state.activePet = saved.state.activePet;

                    if(saved.state.artifactsFound) this.state.artifactsFound = saved.state.artifactsFound;
                    else this.state.artifactsFound = [];
                    if(saved.state.eventsCompleted) this.state.eventsCompleted = saved.state.eventsCompleted;
                    else this.state.eventsCompleted = { christmas: false };
                    
                    if(saved.state.stats) this.state.stats = saved.state.stats;
                    else this.state.stats = { totalClicks: 0, totalGold: 0, blocksBroken: 0, maxCombo: 0, startTime: Date.now() };

                    if(saved.state.settings) {
                        this.state.settings = saved.state.settings;
                        if(this.state.settings.volume !== undefined) {
                            AudioController.volume = this.state.settings.volume;
                        }
                    }
                    if(saved.state.activeEvent) this.state.activeEvent = saved.state.activeEvent;
                }
                
                // --- OFFLINE PROGRESS ---
                if(saved.timestamp) {
                    const now = Date.now();
                    const secondsOffline = (now - saved.timestamp) / 1000;
                    
                    if(secondsOffline > 60) {
                        const dps = this.calculateDPS();
                        
                        if(dps > 0) {
                            const act = this.getActive();
                            const conf = this.getConfig();
                            
                            const mat = conf.materials[act.matIndex] || conf.materials[0];
                            const loopMultiplier = Math.pow(50000000, act.loopCount);
                            const blockValue = mat.val * loopMultiplier;
                            const blockHp = act.maxHp > 0 ? act.maxHp : 10; 
                            
                            const totalDamage = dps * secondsOffline * 0.50;
                            const blocksBroken = totalDamage / blockHp;
                            const earnings = Math.floor(blocksBroken * blockValue);
                            
                            if(earnings > 0) {
                                act.gold += earnings;
                                setTimeout(() => {
                                    alert(`💤 WILLKOMMEN ZURÜCK!\n\nDeine Crew hat in deiner Abwesenheit weitergearbeitet (50% Effizienz).\n\nZeit: ${(secondsOffline/60).toFixed(1)} Min.\nEinnahmen: +${this.formatNumber(earnings)} ${conf.config.currency}`);
                                }, 500);
                            }
                        }
                    }
                }
                
                return true;
            } catch(e) {
                console.error("Laden fehlgeschlagen:", e);
                return false;
            }
        },

        hardReset: function() {
            // FIXED: Replaced blocked confirm() with button state check
            const btn = document.getElementById('btn-reset-game');
            
            // First Click: Arm the button
            if (btn.innerText.includes("RESET")) {
                const originalText = btn.innerHTML;
                btn.innerText = "⚠️ WIRKLICH?";
                btn.style.background = "#ff0000"; // Hellrot zur Warnung
                
                // Reset to normal if not clicked again within 3 seconds
                setTimeout(() => {
                    if(btn) {
                        btn.innerHTML = originalText;
                        btn.style.background = "#c0392b";
                    }
                }, 3000);
                return;
            }
            
            // Second Click: Execute Reset
            if(this.username) localStorage.removeItem('DeepDigSave_' + this.username);
            location.reload();
        }
    };

    // --- UI MODULE ---
    const UI = {
        particles: [],
        floaters: [],
        shake: 0,
        currentShopTab: 'hat',
        // NEW: Mouse tracking for Combo Text
        mouseX: 0,
        mouseY: 0,
        
        blockCanvas: document.createElement('canvas'),
        bgPatternCanvas: document.createElement('canvas'),
        
        init: function() {
            this.blockCanvas.width = 320; this.blockCanvas.height = 320;
            this.bgPatternCanvas.width = 128; this.bgPatternCanvas.height = 128;
            this.blockCtx = this.blockCanvas.getContext('2d');
            this.bgPatternCtx = this.bgPatternCanvas.getContext('2d');
            this.canvas = document.getElementById('gameCanvas');
            this.ctx = this.canvas.getContext('2d');
            this.wrapper = document.getElementById('game-wrapper');
            
            // Track Mouse for Combo Text
            if(this.wrapper) {
                this.wrapper.addEventListener('mousemove', (e) => {
                    const rect = this.canvas.getBoundingClientRect();
                    this.mouseX = e.clientX - rect.left;
                    this.mouseY = e.clientY - rect.top;
                });
            }
        },

        // --- RENDERERS ---
        renderMinerList: function() {
            const list = document.getElementById('miner-list'); list.innerHTML = ""; 
            let conf = GameLogic.getConfig(); let act = GameLogic.getActive();
            conf.miners.forEach((type, index) => {
                let m = act.miners[index];
                let lvl = m.level;
                
                // NEW: Initialize Skills if undefined (visual fix)
                if(!m.skills) m.skills = { dps: 0, cost: 0, synergy: 0 };

                let baseCost = (m.level === 0) ? type.baseCost : Math.floor(type.baseCost * Math.pow(1.20, m.level));
                
                // NEW: Cost Reduction Display logic
                let costMult = 1;
                if(GameLogic.state.artifactsFound && GameLogic.state.artifactsFound.includes('fossil')) costMult = 0.9;
                if(m.skills && m.skills.cost) costMult -= (m.skills.cost * 0.02);
                let cost = Math.floor(baseCost * costMult);

                // CHANGED: Display correct DPS with Milestone Bonus AND SKILLS
                let milestoneBonus = Math.pow(2, Math.floor(lvl / 10));
                let skillMult = 1 + (m.skills.dps * 0.20);
                
                let dps = (lvl * type.basePower) * milestoneBonus * skillMult;
                
                // Show boost text if level >= 10
                let boostText = (lvl >= 10) ? `<span style="color:#f1c40f; font-size:9px;">(x${milestoneBonus})</span>` : "";
                if(m.skills.dps > 0) boostText += ` <span style="color:#e74c3c; font-size:9px;">(+${m.skills.dps*20}%)</span>`;

                // NEW: Calculate Tech Points for visual cue
                let totalPoints = Math.floor(m.level / 20);
                let usedPoints = (m.skills.dps||0) + (m.skills.cost||0) + (m.skills.synergy||0);
                let hasPoints = (totalPoints - usedPoints) > 0;

                let div = document.createElement('div'); div.className = "miner-card"; div.id = `miner-card-${index}`;
                
                // CHANGED: Improved Class Logic
                let gearClass = "gear-btn-square";
                let gearTitle = "Module konfigurieren";
                
                if (lvl === 0) {
                    gearClass += " disabled";
                    gearTitle = "Erst Bot kaufen!";
                } else if (hasPoints) {
                    gearClass += " has-points";
                    gearTitle = "Punkte verfügbar!";
                }
                
                // Action: Only if bought
                let gearAction = lvl > 0 ? `GameLogic.openBotSkills(${index})` : "";

                div.innerHTML = `
                <div class="miner-icon-area">
                    <div class="bot-body" id="bot-body-${index}"><div class="bot-arm"></div></div>
                    <div class="locked-icon" id="locked-icon-${index}">?</div>
                </div>
                <div class="miner-info">
                    <h4 style="color:${type.color}">${type.name} <span id="m-lvl-${index}" style="color:#fff; font-size:10px;">Lvl ${lvl}</span></h4>
                    <p>DPS: <span id="m-dps-${index}">${GameLogic.formatNumber(dps)}</span> ${boostText}</p>
                </div>
                <!-- NEW: Action Group (Button + Gear) -->
                <div class="miner-actions">
                    <button class="miner-btn" id="m-btn-${index}" onclick="GameLogic.buyMiner(${index})">${lvl===0?"Kaufen":"Upgr"}<br>${GameLogic.formatNumber(cost)}</button>
                    <!-- CHANGED: Added ID to gear button for live updates -->
                    <div id="gear-btn-${index}" class="${gearClass}" onclick="${gearAction}" title="${gearTitle}">⚙️</div>
                </div>`;
                list.appendChild(div);
            });
        },
        
        // NEW: Render Bot Skills Modal
        openBotSkills: function(index) {
            let act = GameLogic.getActive(); let conf = GameLogic.getConfig();
            let m = act.miners[index];
            let type = conf.miners[index];

            document.getElementById('bot-skill-modal').style.display = 'flex';
            document.getElementById('bot-skill-title').innerText = type.name.toUpperCase() + " MODULE";
            document.getElementById('bot-skill-title').style.color = type.color;

            // Render Preview
            let preview = document.getElementById('bot-skill-preview');
            preview.innerHTML = `<div class="bot-body" style="background:${type.color}; transform:scale(1.5);"><div class="bot-arm" style="display:block; animation: arm-swing 0.5s infinite alternate;"></div></div>`;
            
            // Calc Points
            let totalPoints = Math.floor(m.level / 20);
            let usedPoints = (m.skills.dps||0) + (m.skills.cost||0) + (m.skills.synergy||0);
            let available = totalPoints - usedPoints;
            
            document.getElementById('tp-display').innerText = available;

            // Render Tree
            const grid = document.getElementById('skill-tree-grid');
            grid.innerHTML = "";

            // 1. OVERCLOCK (DPS)
            this.createSkillNode(grid, "Overclock", "🔴", `+20% Schaden für diesen Bot.`, m.skills.dps, available > 0, () => GameLogic.buyBotSkill('dps'));

            // 2. EFFICIENCY (COST)
            let costMaxed = m.skills.cost >= 25;
            this.createSkillNode(grid, "Effizienz", "🔵", `-2% Kosten (Max -50%).`, m.skills.cost, available > 0 && !costMaxed, () => GameLogic.buyBotSkill('cost'), costMaxed);

            // 3. SYNERGY (GLOBAL) - Unlocks at Lvl 50
            let locked = m.level < 50;
            let synMaxed = m.skills.synergy >= 10;
            this.createSkillNode(grid, "Netzwerk", "🟡", `+1% Globaler Schaden pro Level.`, m.skills.synergy, available > 0 && !locked && !synMaxed, () => GameLogic.buyBotSkill('synergy'), synMaxed, locked, "Lvl 50");
        },

        createSkillNode: function(parent, name, icon, desc, level, canBuy, onClick, isMax = false, isLocked = false, lockText = "") {
            let div = document.createElement('div');
            div.className = `skill-node ${isLocked ? 'locked' : ''}`;
            if(canBuy) div.style.borderColor = "#fff";
            
            let btnText = isMax ? "MAX" : (isLocked ? lockText : "+");
            let btnColor = canBuy ? "#2ecc71" : "#555";
            if(isMax) btnColor = "#f1c40f";
            
            div.innerHTML = `
                <div class="skill-icon">${icon}</div>
                <div class="skill-name">${name}</div>
                <div class="skill-desc">${desc}</div>
                <div class="skill-level">Stufe ${level}</div>
                ${!isLocked && !isMax && canBuy ? `<div style="margin-top:5px; background:${btnColor}; color:#fff; border-radius:4px; padding:2px 8px; font-size:10px;">Upgrade</div>` : ''}
                ${isMax ? `<div style="margin-top:5px; color:#f1c40f; font-size:10px;">MAXIMAL</div>` : ''}
                ${isLocked ? `<div style="margin-top:5px; color:#e74c3c; font-size:10px;">🔒 ${lockText}</div>` : ''}
            `;
            
            if(!isLocked && !isMax && canBuy) {
                div.onclick = onClick;
            }
            parent.appendChild(div);
        },

        closeBotSkills: function() { document.getElementById('bot-skill-modal').style.display = 'none'; },

        // NEW: Render Click Skills
        renderClickSkills: function() {
            const list = document.getElementById('click-list'); 
            if(!list) return;
            list.innerHTML = "";
            let conf = GameLogic.getConfig(); let act = GameLogic.getActive();
            
            // Guard for save games
            if(!act.clickSkillLevels) act.clickSkillLevels = [0,0,0];

            conf.clickSkills.forEach((skill, index) => {
                let lvl = act.clickSkillLevels[index] || 0;
                let cost = Math.floor(skill.baseCost * Math.pow(1.5, lvl));
                
                let isMax = (skill.max && lvl >= skill.max);
                
                let div = document.createElement('div'); 
                div.className = "miner-card"; 
                div.style.borderLeftColor = "#f1c40f"; // Gold border for skills
                
                let btnTxt = isMax ? "MAX" : `Upgr<br>${GameLogic.formatNumber(cost)}`;
                
                div.innerHTML = `
                <div class="miner-icon-area" style="font-size:24px;">${skill.icon}</div>
                <div class="miner-info">
                    <h4 style="color:#f1c40f">${skill.name} <span style="color:#fff; font-size:10px;">Lvl ${lvl}</span></h4>
                    <p>${skill.desc}</p>
                </div>
                <button class="miner-btn" id="c-skill-btn-${index}" onclick="GameLogic.buyClickSkill(${index})" ${isMax ? 'disabled' : ''}>${btnTxt}</button>
                `;
                list.appendChild(div);
            });
            this.updateClickSkills();
        },

        // FIXED: Re-added missing logic and closing braces here
        updateClickSkills: function() {
            let conf = GameLogic.getConfig(); let act = GameLogic.getActive();
            if(!act.clickSkillLevels) return;
            
            conf.clickSkills.forEach((skill, index) => {
                 let lvl = act.clickSkillLevels[index] || 0;
                 let cost = Math.floor(skill.baseCost * Math.pow(1.5, lvl));
                 let btn = document.getElementById(`c-skill-btn-${index}`);
                 if(btn && !(skill.max && lvl >= skill.max)) {
                     btn.disabled = act.gold < cost;
                 }
            });
        },

        // --- RESTORED MISSING FUNCTION: switchMainTab ---
        switchMainTab: function(tab) {
            const mList = document.getElementById('miner-list');
            const cList = document.getElementById('click-list');
            const tabMiners = document.getElementById('tab-miners');
            const tabSkills = document.getElementById('tab-skills');
            
            if(tab === 'miners') {
                mList.style.display = 'flex';
                cList.style.display = 'none';
                tabMiners.classList.add('active');
                tabSkills.classList.remove('active');
            } else {
                mList.style.display = 'none';
                cList.style.display = 'flex';
                tabMiners.classList.remove('active');
                tabSkills.classList.add('active');
                this.renderClickSkills(); // Render when opening
            }
        },

        // NEW: Event Win Sequence
        showEventWinSequence: function() {
            const overlay = document.getElementById('event-win-overlay');
            overlay.style.display = 'flex';
            
            // Sound
            AudioController.playTone(300, 0.2, 'square', 0.1);
            setTimeout(() => AudioController.playTone(400, 0.2, 'square', 0.1), 200);
            setTimeout(() => AudioController.playTone(500, 0.4, 'square', 0.1), 400);
            
            // Auto Leave after 4s
            setTimeout(() => {
                overlay.style.display = 'none';
                GameLogic.leaveChristmasWorld();
                alert("BELOHNUNG ERHALTEN:\n\n🌟 Weihnachtsstern 🌟\n(+50% Schaden auf ALLES)");
            }, 4000);
        },

        update: function() {
            let act = GameLogic.getActive(); let conf = GameLogic.getConfig();
            
            // GUARDS for elements
            const setTxt = (id, txt) => { const el = document.getElementById(id); if(el) el.innerText = txt; }
            
            // CHANGED: SIMPLIFIED ROBUST CHECK
            const xmasBtn = document.getElementById('btn-xmas-travel');
            if(xmasBtn) {
                // Check if done
                const hasArtifact = GameLogic.state.artifactsFound && GameLogic.state.artifactsFound.includes('christmas_star');
                const hasFlag = GameLogic.state.eventsCompleted && GameLogic.state.eventsCompleted.christmas;
                
                if (hasArtifact || hasFlag) {
                    // Force Closed State
                    // Only update if not already set to avoid flickering/loops
                    if(xmasBtn.innerHTML !== "ABGESCHLOSSEN 🔒") {
                        xmasBtn.innerHTML = "ABGESCHLOSSEN 🔒";
                        xmasBtn.style.background = "#7f8c8d";
                        xmasBtn.style.cursor = "not-allowed";
                        xmasBtn.disabled = true;
                        // Nuke the click listener
                        xmasBtn.onclick = (e) => { e.preventDefault(); return false; };
                    }
                } else {
                    // Force Open State
                    if(xmasBtn.innerHTML !== "REISEN") {
                        xmasBtn.innerHTML = "REISEN";
                        xmasBtn.style.background = "#c0392b";
                        xmasBtn.style.cursor = "pointer";
                        xmasBtn.disabled = false;
                        xmasBtn.onclick = () => GameLogic.enterChristmasWorld();
                    }
                }
            }

            setTxt('depthDisplay', act.depth);
            setTxt('goldDisplay', GameLogic.formatNumber(act.gold));
            setTxt('goldDisplayBig', GameLogic.formatNumber(act.gold));
            
            // CHANGED: Update HP Bar Width & Text Overlay
            let hpPercent = (Math.max(0, act.currentHp) / act.maxHp) * 100;
            const hpBar = document.getElementById('hp-bar-fill');
            const hpText = document.getElementById('hp-text-overlay');
            
            if(hpBar) hpBar.style.width = hpPercent + "%";
            if(hpText) hpText.innerText = GameLogic.formatNumber(Math.max(0, act.currentHp)) + " / " + GameLogic.formatNumber(act.maxHp);

            // OLD LINE REMOVED: setTxt('hpDisplay', ...);

            setTxt('dpsDisplay', GameLogic.formatNumber(GameLogic.calculateDPS()));
            setTxt('bossKillDisplay', act.bossKills);
            setTxt('bossBuffDisplay', (act.bossKills * 10));
            setTxt('aetheriumDisplay', act.prestige);
            setTxt('multDisplay', (act.prestige * 10).toLocaleString());
            setTxt('snowflake-display', GameLogic.state.snowflakes);
            
            // NEW: Update Fabric HUD
            setTxt('fabric-hud-amount', GameLogic.state.fabric);

            let nextPick = conf.picks[act.pickLevel + 1];
            let pickBtn = document.getElementById('btn-pick');
            if (pickBtn) {
                if (nextPick) { pickBtn.innerHTML = `Werkzeug Upgraden: <b>${nextPick.name}</b><br><small>${GameLogic.formatNumber(nextPick.cost)} G</small>`; pickBtn.disabled = act.gold < nextPick.cost; } 
                else { pickBtn.innerHTML = "MAX LEVEL"; pickBtn.disabled = true; }
            }

            setTxt('cost-tnt', GameLogic.formatNumber(act.costs.tnt)); 
            const btnTnt = document.getElementById('btn-tnt'); if(btnTnt) btnTnt.disabled = act.gold < act.costs.tnt;

            setTxt('cost-str', GameLogic.formatNumber(act.costs.str)); 
            const btnStr = document.getElementById('btn-pot-str'); if(btnStr) btnStr.disabled = act.gold < act.costs.str;

            setTxt('cost-min', GameLogic.formatNumber(act.costs.min)); 
            const btnMin = document.getElementById('btn-pot-min'); if(btnMin) btnMin.disabled = act.gold < act.costs.min;

            setTxt('cost-od', GameLogic.formatNumber(act.costs.od)); 
            const btnOd = document.getElementById('btn-pot-od'); if(btnOd) btnOd.disabled = act.gold < act.costs.od;

            if(this.wrapper) {
                this.wrapper.className = ""; 
                if(Date.now() < act.buffs.od) this.wrapper.classList.add('buff-overdrive');
                else if(Date.now() < act.buffs.str) this.wrapper.classList.add('buff-strength');
                else if(Date.now() < act.buffs.min) this.wrapper.classList.add('buff-miner');
            }

            conf.miners.forEach((type, index) => {
                let m = act.miners[index];
                let cost = (m.level===0) ? type.baseCost : Math.floor(type.baseCost * Math.pow(1.20, m.level));
                let btn = document.getElementById(`m-btn-${index}`);
                let card = document.getElementById(`miner-card-${index}`);
                let botBody = document.getElementById(`bot-body-${index}`);
                let lockedIcon = document.getElementById(`locked-icon-${index}`);
                
                if(document.getElementById(`m-lvl-${index}`)) {
                    document.getElementById(`m-lvl-${index}`).innerText = "Lvl " + m.level;
                    document.getElementById(`m-dps-${index}`).innerText = GameLogic.formatNumber(m.level * type.basePower);
                    if (m.level === 0) {
                        btn.innerHTML = `Kaufen<br>${GameLogic.formatNumber(cost)}`; 
                        if(card) { card.style.borderLeftColor = "#333"; card.classList.add('locked'); }
                        if(lockedIcon) lockedIcon.style.display = "block"; 
                        if(botBody) botBody.style.backgroundColor = "#333";
                    } else {
                        btn.innerHTML = `Upgr<br>${GameLogic.formatNumber(cost)}`; 
                        if(card) { card.style.borderLeftColor = type.color; card.classList.remove('locked'); }
                        if(lockedIcon) lockedIcon.style.display = "none"; 
                        if(botBody) botBody.style.backgroundColor = type.color;
                    }
                    btn.disabled = act.gold < cost;
                }
            });
            // NEW: Update Click Skills too if they are visible
            if(document.getElementById('click-list').style.display !== 'none') {
                this.updateClickSkills();
            }
            GameLogic.checkWorldUnlock();
        },
        
        spawnBubbleElement: function(callback) {
            let b = document.createElement('div');
            b.className = 'mystery-bubble';
            b.style.top = (Math.random() * 80 + 10) + "%";
            b.style.left = "-80px"; 
            b.onclick = () => {
                this.spawnParticles(b.getBoundingClientRect().left + 30, b.getBoundingClientRect().top + 30, 20, "#fff");
                document.body.removeChild(b);
                callback(); 
            };
            document.body.appendChild(b);
            
            let start = Date.now();
            let duration = 15000; 
            
            const animateBubble = () => {
                if(!b.parentNode) return; 
                let p = (Date.now() - start) / duration;
                if(p >= 1) {
                    if(b.parentNode) document.body.removeChild(b);
                    return;
                }
                b.style.left = (p * 110 - 10) + "vw";
                requestAnimationFrame(animateBubble);
            };
            requestAnimationFrame(animateBubble);
        },

        syncWorldTheme: function() {
            let conf = GameLogic.getConfig();
            let state = GameLogic.state;
            
            const setClass = (id, cls) => { const el = document.getElementById(id); if(el) el.className = cls; }
            const setTxt = (id, txt) => { const el = document.getElementById(id); if(el) el.innerText = txt; }
            
            // Reset Tabs to Miner when world changes (visual cue)
            const tabMiners = document.getElementById('tab-miners');
            const tabSkills = document.getElementById('tab-skills');
            if(tabMiners) tabMiners.innerHTML = "🤖 MINERS"; // Could customize per world
            if(tabSkills) tabSkills.innerHTML = "💪 SKILLS";

            setClass('game-logo', `logo-container ${state.activeWorld}`);
            setTxt('game-title', conf.config.name);
            
            const icon1 = document.querySelector('.logo-icon'); 
            if(icon1) {
                if (state.activeWorld === 'mine') icon1.innerText = '👷';
                else if (state.activeWorld === 'forest') icon1.innerText = '🪓';
                else if (state.activeWorld === 'desert') icon1.innerText = '👳';
                else if (state.activeWorld === 'ice') icon1.innerText = '🥶'; // New Icon
            }
            const icon2 = document.querySelector('.logo-icon.right'); 
            if(icon2) {
                if (state.activeWorld === 'mine') icon2.innerText = '⛏️';
                else if (state.activeWorld === 'forest') icon2.innerText = '🌲';
                else if (state.activeWorld === 'desert') icon2.innerText = '🐪';
                else if (state.activeWorld === 'ice') icon2.innerText = '🏔️'; // New Icon
            }
            
            setTxt('currency-name', conf.config.currency);
            setTxt('prestige-mini-icon', conf.config.prestigeIcon);
            setTxt('prestige-currency-icon', conf.config.prestigeIcon);
            setTxt('prestige-icon', conf.config.prestigeIcon);
            
            let pTitle = "REINKARNATION";
            if(state.activeWorld === 'forest') pTitle = "WALD GEIST";
            if(state.activeWorld === 'desert') pTitle = "SAND STURM";
            if(state.activeWorld === 'ice') pTitle = "EWIGES EIS"; // New Title
            setTxt('prestige-title', pTitle);
            
            let mHeader = "Mining Flotte";
            if(state.activeWorld === 'forest') mHeader = "Holzfäller Crew";
            if(state.activeWorld === 'desert') mHeader = "Ausgrabungs Team";
            if(state.activeWorld === 'ice') mHeader = "Frost Brecher"; // New Header
            setTxt('miner-header', mHeader);
        },

        generateBackgroundPattern: function(mat) {
            this.bgPatternCtx.clearRect(0,0,128,128);
            if (!mat || !mat.color) return;
            // BRIGHTER BACKGROUND LOGIC
            // Use 0.8 factor instead of 0.5 to make colors pop more
            this.bgPatternCtx.fillStyle = `rgb(${mat.color[0]*0.8}, ${mat.color[1]*0.8}, ${mat.color[2]*0.8})`;
            this.bgPatternCtx.fillRect(0,0,128,128);
            for(let i=0; i<10; i++) {
                this.bgPatternCtx.fillStyle = "rgba(0,0,0,0.1)"; // Lighter overlay for texture
                this.bgPatternCtx.beginPath();
                let x = Math.random()*128; let y = Math.random()*128; let s = Math.random()*30+10;
                
                if (GameLogic.state.activeWorld === 'forest') {
                    // Organic shapes for forest
                    this.bgPatternCtx.ellipse(x, y, s, s/2, Math.random()*Math.PI, 0, Math.PI*2);
                } else if (GameLogic.state.activeWorld === 'desert') {
                    // Triangle / Pyramid shapes for desert
                    this.bgPatternCtx.moveTo(x, y);
                    this.bgPatternCtx.lineTo(x+s, y);
                    this.bgPatternCtx.lineTo(x+s/2, y-s);
                    this.bgPatternCtx.closePath();
                } else if (GameLogic.state.activeWorld === 'ice') {
                    // Sharp Crystal Shapes for Ice
                    this.bgPatternCtx.moveTo(x, y);
                    this.bgPatternCtx.lineTo(x+s/2, y-s);
                    this.bgPatternCtx.lineTo(x+s, y);
                    this.bgPatternCtx.lineTo(x+s/2, y+s);
                    this.bgPatternCtx.closePath();
                } else {
                    // Rocky shapes for mine
                    this.bgPatternCtx.rect(x, y, s, s);
                }
                this.bgPatternCtx.fill();
            }
            document.body.style.backgroundImage = `url(${this.bgPatternCanvas.toDataURL()})`;
        },

        generateBlockTexture: function() {
            GameLogic.state.cracks = []; GameLogic.state.impactX = null; GameLogic.state.impactY = null;
            let act = GameLogic.getActive(); let conf = GameLogic.getConfig();
            let totalMatIndex = Math.floor((act.depth - 1) / Worlds.STAGE_LENGTH);
            act.loopCount = Math.floor(totalMatIndex / conf.materials.length);
            act.matIndex = totalMatIndex % conf.materials.length;
            let mat = conf.materials[act.matIndex];
            act.wasTouchedByPlayer = false;
            // Safe guard if mat is undefined
            if (!mat) mat = conf.materials[0];
            
            let loopInfo = GameLogic.getLoopInfo(act.loopCount);
            
            if (act.matIndex !== GameLogic.state.lastBgMatIndex) {
                this.generateBackgroundPattern(mat); GameLogic.state.lastBgMatIndex = act.matIndex;
            }

            // NEW: CHRISTMAS BOSS AT DEPTH 400
            if (GameLogic.state.activeWorld === 'christmas' && act.depth === 400) {
                GameLogic.state.isBoss = true;
                // Special Fixed HP for Final Event Boss
                act.maxHp = 500000000; 
            } else {
                GameLogic.state.isBoss = (act.depth % Worlds.STAGE_LENGTH === 0);
            }

            GameLogic.state.isLucky = false;
            
            // --- NEW HP CALCULATION (BALANCED CURVE) ---
            // 1. Determine Growth Factor (How much HP increases per block)
            // CHANGED: Lowered from 1.06 to 1.055 to soften the curve significantly in late game
            let growth = 1.055;
            let baseHp = 2; // Start with 2 HP
            
            // Gentler curve for Xmas event to make it grindable for everyone
            if (GameLogic.state.activeWorld === 'christmas') {
                growth = 1.045; 
                baseHp = 50; 
            }

            // 2. Calculate smooth curve based on DEPTH (not material)
            // Formula: Base * (Growth ^ Depth)
            let rawHp = baseHp * Math.pow(growth, act.depth);

            // 3. Apply Boss Multiplier
            // Boss needs to be significantly harder than the NEXT block (Depth + 1)
            // Since 1.06 is small, a 8x Boss Multiplier guarantees Boss > Next Stage Start
            if (GameLogic.state.isBoss && (GameLogic.state.activeWorld !== 'christmas' || act.depth !== 400)) {
                rawHp *= 8;
                this.spawnFloater(160, 50, "☠️ BOSS! ☠️", "#e74c3c");
            } else if (!GameLogic.state.isBoss) {
                // Lucky Block Chance (Non-Boss only)
                GameLogic.state.isLucky = Math.random() < 0.05;
                if(GameLogic.state.isLucky) { 
                    rawHp *= 0.5; // Lucky block has LESS HP now (easier break)
                    this.spawnFloater(160, 50, "🍀 GLÜCK! 🍀", "#f1c40f"); 
                }
            }

            act.maxHp = Math.floor(rawHp);
            act.currentHp = act.maxHp;
            // --- END NEW HP CALCULATION ---

            this.blockCtx.clearRect(0,0,320,320);
            let baseColor = GameLogic.state.isLucky ? [255, 215, 0] : mat.color; 
            if (GameLogic.state.isBoss && GameLogic.state.activeWorld !== 'christmas') baseColor = [40, 0, 0];

            // ALWAYS SQUARE (fillRect)
            this.blockCtx.fillStyle = `rgb(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]})`;
            this.blockCtx.fillRect(0, 0, 320, 320);
            
            // Texture overlay
            if(GameLogic.state.activeWorld === 'forest') {
                // Rings for wood
                this.blockCtx.strokeStyle = "rgba(0,0,0,0.1)"; this.blockCtx.lineWidth = 3;
                for(let r=20; r<240; r+=20) { this.blockCtx.beginPath(); this.blockCtx.arc(160, 160, r, 0, Math.PI*2); this.blockCtx.stroke(); }
            } else if (GameLogic.state.activeWorld === 'desert') {
                 // Dunes / Wavy lines
                 this.blockCtx.strokeStyle = "rgba(0,0,0,0.1)"; this.blockCtx.lineWidth = 4;
                 for(let y=20; y<320; y+=40) {
                     this.blockCtx.beginPath();
                     this.blockCtx.moveTo(0, y);
                     this.blockCtx.bezierCurveTo(100, y-20, 220, y+20, 320, y);
                     this.blockCtx.stroke();
                 }
            } else if (GameLogic.state.activeWorld === 'ice') {
                 // Cracks / Jagged lines
                 this.blockCtx.strokeStyle = "rgba(255,255,255,0.2)"; this.blockCtx.lineWidth = 2;
                 for(let i=0; i<5; i++) {
                     this.blockCtx.beginPath();
                     this.blockCtx.moveTo(Math.random()*320, 0);
                     this.blockCtx.lineTo(Math.random()*320, 320);
                     this.blockCtx.stroke();
                 }
            } else if (GameLogic.state.activeWorld === 'christmas') {
                 // GIFT RIBBONS
                 this.blockCtx.fillStyle = "rgba(255,255,255,0.3)";
                 this.blockCtx.fillRect(140, 0, 40, 320);
                 this.blockCtx.fillRect(0, 140, 320, 40);
            } else {
                for(let i=0; i<20; i++) { this.blockCtx.fillStyle = `rgba(0,0,0,0.15)`; this.blockCtx.beginPath(); this.blockCtx.arc(Math.random()*320, Math.random()*320, Math.random()*60+20, 0, Math.PI*2); this.blockCtx.fill(); }
            }
            
            // XMAS GIFT WRAP OVERRIDE FOR EVENT
            if(GameLogic.state.activeEvent === 'xmas') {
                this.blockCtx.fillStyle = "rgba(192, 57, 43, 0.8)"; // Red ribbon
                this.blockCtx.fillRect(140, 0, 40, 320);
                this.blockCtx.fillRect(0, 140, 320, 40);
                
                // Bow center
                this.blockCtx.fillStyle = "#e74c3c";
                this.blockCtx.beginPath(); this.blockCtx.arc(160,160,30,0,Math.PI*2); this.blockCtx.fill();
            }

            if (act.loopCount > 0) { 
                this.blockCtx.strokeStyle = loopInfo.color || "rgba(0,0,0,0)"; this.blockCtx.lineWidth = 15; 
                this.blockCtx.strokeRect(0, 0, 320, 320); 
            }

            const layerNameEl = document.getElementById('layerNameDisplay');

            if (GameLogic.state.isBoss) {
                // EVIL TREE FOR XMAS WORLD
                if (GameLogic.state.activeWorld === 'christmas' && act.depth === 400) {
                    this.blockCtx.clearRect(0,0,320,320); // Clear box for tree shape
                    // Tree Body
                    this.blockCtx.fillStyle = "#27ae60";
                    this.blockCtx.beginPath(); this.blockCtx.moveTo(160, 20); this.blockCtx.lineTo(280, 280); this.blockCtx.lineTo(40, 280); this.blockCtx.fill();
                    // Evil Eyes
                    this.blockCtx.fillStyle = "#c0392b";
                    this.blockCtx.beginPath(); this.blockCtx.moveTo(120, 150); this.blockCtx.lineTo(150, 180); this.blockCtx.lineTo(120, 180); this.blockCtx.fill();
                    this.blockCtx.beginPath(); this.blockCtx.moveTo(200, 150); this.blockCtx.lineTo(170, 180); this.blockCtx.lineTo(200, 180); this.blockCtx.fill();
                    // Mouth
                    this.blockCtx.strokeStyle = "#000"; this.blockCtx.lineWidth = 5;
                    this.blockCtx.beginPath(); this.blockCtx.arc(160, 220, 30, Math.PI, 0); this.blockCtx.stroke();
                    
                    if(layerNameEl) { layerNameEl.innerText = "BÖSER BAUM"; layerNameEl.style.color = "#27ae60"; }
                } else {
                    // Standard Boss Icon
                    this.blockCtx.fillStyle = "#000"; this.blockCtx.beginPath(); this.blockCtx.moveTo(80, 100); this.blockCtx.lineTo(140, 120); this.blockCtx.lineTo(80, 140); this.blockCtx.moveTo(240, 100); this.blockCtx.lineTo(180, 120); this.blockCtx.lineTo(240, 140); this.blockCtx.fill();
                    this.blockCtx.fillStyle = "#f00"; this.blockCtx.beginPath(); this.blockCtx.arc(100, 120, 5, 0, Math.PI*2); this.blockCtx.arc(220, 120, 5, 0, Math.PI*2); this.blockCtx.fill();
                    this.blockCtx.fillStyle = "#111"; this.blockCtx.beginPath(); this.blockCtx.moveTo(80, 200); this.blockCtx.lineTo(100, 240); this.blockCtx.lineTo(120, 200); this.blockCtx.lineTo(140, 240); this.blockCtx.lineTo(160, 200); this.blockCtx.lineTo(180, 240); this.blockCtx.lineTo(200, 200); this.blockCtx.lineTo(220, 240); this.blockCtx.lineTo(240, 200); this.blockCtx.lineTo(160, 260); this.blockCtx.closePath(); this.blockCtx.fill();
                    if(layerNameEl) { layerNameEl.innerText = loopInfo.prefix + "BOSS"; layerNameEl.style.color = "#e74c3c"; }
                }
            }
            else if(GameLogic.state.isLucky) {
                this.blockCtx.strokeStyle = "rgba(0,0,0,0.3)"; this.blockCtx.lineWidth = 4;
                this.blockCtx.strokeRect(20, 20, 280, 280); this.blockCtx.beginPath(); this.blockCtx.moveTo(20,20); this.blockCtx.lineTo(300,300); this.blockCtx.moveTo(300,20); this.blockCtx.lineTo(20,300); this.blockCtx.stroke();
                if(layerNameEl) { layerNameEl.innerText = "SCHATZ"; layerNameEl.style.color = "#f1c40f"; }
            } 
            else {
                // Gems ONLY in Mine AND NOT XMAS (Xmas has ribbons)
                if (GameLogic.state.activeWorld === 'mine' && GameLogic.state.activeEvent !== 'xmas') {
                    let gemCount = 8;
                    for(let i=0; i<gemCount; i++) {
                        let gx = Math.random() * 260 + 30; let gy = Math.random() * 260 + 30; let size = Math.random() * 15 + 10;
                        let grd = this.blockCtx.createRadialGradient(gx, gy, 1, gx, gy, size + 10);
                        grd.addColorStop(0, `rgba(${mat.speck.join(',')}, 0.8)`); grd.addColorStop(1, "rgba(0,0,0,0)");
                        this.blockCtx.fillStyle = grd; this.blockCtx.beginPath(); this.blockCtx.arc(gx, gy, size + 10, 0, Math.PI*2); this.blockCtx.fill();
                        this.blockCtx.fillStyle = `rgb(${mat.speck.join(',')})`; this.blockCtx.beginPath(); this.blockCtx.moveTo(gx, gy-size); this.blockCtx.lineTo(gx+size, gy); this.blockCtx.lineTo(gx, gy+size); this.blockCtx.lineTo(gx-size, gy); this.blockCtx.fill();
                        this.blockCtx.fillStyle = "rgba(255,255,255,0.9)"; this.blockCtx.beginPath(); this.blockCtx.arc(gx-size*0.3, gy-size*0.3, size*0.2, 0, Math.PI*2); this.blockCtx.fill();
                    }
                }
                if(layerNameEl) { 
                    layerNameEl.innerText = loopInfo.prefix + mat.name; 
                    layerNameEl.style.color = "rgba(255, 255, 255, 0.5)";
                }
            }
        },

        spawnParticles: function(x, y, amount, color = null) {
            if (!GameLogic.state.settings.animations) return;
            let mat = GameLogic.getConfig().materials[GameLogic.getActive().matIndex]; 
            // Guard
            if (!mat) return;
            let c = color ? color : `rgb(${mat.speck.join(',')})`;
            if (GameLogic.state.isLucky && !color) c = "rgb(255, 215, 0)"; 
            if (GameLogic.state.isBoss && !color) c = "#e74c3c";
            for(let i=0; i<amount; i++) { this.particles.push({ x: x, y: y, vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10, life: 1.0, color: c, size: Math.random()*5+2, type: 'square' }); }
        },
        spawnSparkles: function(x, y, amount) {
            if (!GameLogic.state.settings.animations) return;
            for(let i=0; i<amount; i++) {
                let isGold = Math.random() > 0.5; let color = isGold ? "#f1c40f" : "#ffffff";
                this.particles.push({ x: x, y: y, vx: (Math.random()-0.5)*20, vy: (Math.random()-0.5)*20, life: 1.2, color: color, size: Math.random()*8+4, type: 'sparkle', angle: Math.random() * Math.PI });
            }
        },
        spawnFloater: function(x, y, text, color) { 
            if (GameLogic.state.settings.animations) this.floaters.push({ x, y, text, color, life: 1.0 }); 
        },

        // --- MISSING FUNCTIONS RESTORED ---
        updateActiveMiners: function() {
            const layer = document.getElementById('active-miners-layer'); 
            if(!layer) return;
            layer.innerHTML = ""; 
            
            if (!GameLogic.state.settings.animations) return;
            let act = GameLogic.getActive();
            let conf = GameLogic.getConfig();
            act.miners.forEach((m, i) => {
                if (m.level > 0) {
                    let side = Math.floor(i / 3); let posInSide = i % 3; let type = conf.miners[i];
                    let div = document.createElement('div'); div.className = "field-miner anim-active";
                    div.innerHTML = `<div class="bot-body" style="background-color: ${type.color}"><div class="bot-arm"></div></div>`;
                    let offset = 40 + (posInSide * 80); 
                    if (side === 0) { div.style.bottom = "10px"; div.style.left = offset + "px"; div.style.transform = "rotate(0deg)"; } 
                    else if (side === 1) { div.style.left = "10px"; div.style.top = offset + "px"; div.style.transform = "rotate(90deg)"; } 
                    else if (side === 2) { div.style.right = "10px"; div.style.top = offset + "px"; div.style.transform = "rotate(-90deg)"; } 
                    else { div.style.top = "10px"; div.style.left = offset + "px"; div.style.transform = "rotate(180deg)"; }
                    layer.appendChild(div);
                }
            });
        },
        
        updateCursor: function() {
            let act = GameLogic.getActive(); let conf = GameLogic.getConfig();
            let pick = conf.picks[act.pickLevel];
            let cCanvas = document.createElement('canvas'); cCanvas.width = 32; cCanvas.height = 32;
            let cCtx = cCanvas.getContext('2d');
            cCtx.translate(16, 16); cCtx.rotate(-Math.PI / 4); cCtx.translate(-16, -16);
            cCtx.fillStyle = "#8d6e63"; cCtx.fillRect(14, 10, 4, 18);
            cCtx.fillStyle = pick.color; 
            
            // XMAS OVERRIDE
            if(GameLogic.state.activeEvent === 'xmas') {
                cCtx.fillStyle = "#e74c3c"; // Candy cane red
                // Draw hook
                cCtx.beginPath(); cCtx.arc(22, 10, 6, Math.PI, 0); cCtx.lineWidth=4; cCtx.strokeStyle="#e74c3c"; cCtx.stroke();
                cCtx.fillRect(20, 10, 4, 20); // stick
                // Stripes
                cCtx.fillStyle = "#fff";
                cCtx.fillRect(20, 14, 4, 2); cCtx.fillRect(20, 20, 4, 2); cCtx.fillRect(20, 26, 4, 2);
            } else {
                if(GameLogic.state.activeWorld === 'mine') { cCtx.fillRect(6, 6, 20, 4); cCtx.fillRect(6, 8, 4, 4); cCtx.fillRect(22, 8, 4, 4); } 
                else { cCtx.fillRect(14, 6, 8, 12); cCtx.fillRect(10, 6, 4, 8); }
                cCtx.strokeStyle = "rgba(0,0,0,0.5)"; cCtx.lineWidth = 1; cCtx.strokeRect(6, 6, 20, 4);
            }
            if(this.canvas) this.canvas.style.cursor = `url(${cCanvas.toDataURL()}) 16 16, auto`;
        },

        // --- RENDER LOOP ---
        renderLoop: function() {
            if(!this.ctx) return;
            this.ctx.fillStyle = "#111"; this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            let sx=0, sy=0;
            if(GameLogic.state.settings.animations && this.shake>0) { sx=(Math.random()-0.5)*this.shake; sy=(Math.random()-0.5)*this.shake; this.shake*=0.9; if(this.shake<0.5) this.shake=0; }
            this.ctx.save(); this.ctx.translate(sx, sy); this.ctx.drawImage(this.blockCanvas, 0, 0);

            // --- DRAW ACTIVE PET NEXT TO BLOCK ---
            if(GameLogic.state.activePet) {
                let pet = Worlds.pets.find(p => p.id === GameLogic.state.activePet);
                if(pet) {
                    let time = Date.now() * 0.003;
                    let floatY = Math.sin(time) * 10;
                    // Position: Top Right relative to block
                    let px = 260; 
                    let py = 60 + floatY;
                    
                    this.ctx.save();
                    this.ctx.translate(px, py);
                    
                    // Simple shape rendering based on pet type
                    this.ctx.fillStyle = pet.color;
                    this.ctx.strokeStyle = "#000";
                    this.ctx.lineWidth = 2;
                    
                    if(pet.shape === 'slime') {
                        this.ctx.beginPath(); this.ctx.arc(0, 0, 15, Math.PI, 0); 
                        this.ctx.bezierCurveTo(15, 10, -15, 10, -15, 0); this.ctx.fill(); this.ctx.stroke();
                        this.ctx.fillStyle = "#fff"; this.ctx.fillRect(-5, -5, 4, 4); this.ctx.fillRect(3, -5, 4, 4);
                    } else if (pet.shape === 'bat') {
                        this.ctx.beginPath(); this.ctx.arc(0, 0, 10, 0, Math.PI*2); this.ctx.fill(); this.ctx.stroke();
                        this.ctx.beginPath(); this.ctx.moveTo(-10, -5); this.ctx.lineTo(-25, -15); this.ctx.lineTo(-10, 5); this.ctx.fill(); this.ctx.stroke();
                        this.ctx.beginPath(); this.ctx.moveTo(10, -5); this.ctx.lineTo(25, -15); this.ctx.lineTo(10, 5); this.ctx.fill(); this.ctx.stroke();
                        this.ctx.fillStyle = "#fff"; this.ctx.fillRect(-4, -2, 2, 2); this.ctx.fillRect(2, -2, 2, 2);
                    } else if (pet.shape === 'fairy') {
                        this.ctx.fillStyle = "rgba(255, 255, 255, 0.5)"; 
                        this.ctx.beginPath(); this.ctx.ellipse(-10, -5, 8, 4, -0.5, 0, Math.PI*2); this.ctx.fill();
                        this.ctx.beginPath(); this.ctx.ellipse(10, -5, 8, 4, 0.5, 0, Math.PI*2); this.ctx.fill();
                        this.ctx.fillStyle = pet.color; this.ctx.beginPath(); this.ctx.arc(0, 0, 8, 0, Math.PI*2); this.ctx.fill();
                    } else {
                        // Default cube/box
                        this.ctx.fillRect(-12, -12, 24, 24); this.ctx.strokeRect(-12, -12, 24, 24);
                        this.ctx.fillStyle = "#fff"; this.ctx.fillRect(-6, -6, 4, 4); this.ctx.fillRect(2, -6, 4, 4);
                    }
                    
                    this.ctx.restore();
                }
            }

            let pct = 1 - (GameLogic.getActive().currentHp / GameLogic.getActive().maxHp);
            if (pct > 0 && GameLogic.state.impactX !== null) {
                let craterSize = pct * 40; this.ctx.fillStyle = "rgba(0,0,0,0.8)"; this.ctx.beginPath(); 
                this.ctx.arc(GameLogic.state.impactX, GameLogic.state.impactY, craterSize, 0, Math.PI*2); this.ctx.fill();
                this.ctx.strokeStyle = "#111"; this.ctx.lineWidth = 4; this.ctx.lineCap = "round"; this.ctx.lineJoin = "round"; this.ctx.beginPath();
                GameLogic.state.cracks.forEach(path => {
                    let maxPointIndex = Math.ceil(path.length * pct);
                    if (maxPointIndex > 0) {
                        this.ctx.moveTo(path[0].x, path[0].y);
                        for(let j=1; j<maxPointIndex && j<path.length; j++) this.ctx.lineTo(path[j].x, path[j].y);
                    }
                });
                this.ctx.stroke();
            }

            // --- DRAW COMBO TEXT NEXT TO CURSOR ---
            // Only draw if combo multiplier is active (>1) and we are not in auto-reset
            if (GameLogic.state.comboMult > 1 && (Date.now() - GameLogic.state.lastClickTime < 1000)) {
                let txt = `x${GameLogic.state.comboMult}`;
                let color = GameLogic.state.comboMult === 3 ? "#e74c3c" : "#f1c40f";
                
                this.ctx.save();
                this.ctx.font = "bold 20px 'Press Start 2P', cursive";
                this.ctx.fillStyle = color;
                this.ctx.shadowColor = "black";
                this.ctx.shadowBlur = 4;
                
                // Add slight pulse animation
                let scale = 1 + Math.sin(Date.now() * 0.015) * 0.1;
                
                // Position relative to mouse, slightly offset to right
                this.ctx.translate(this.mouseX + 25, this.mouseY + 10); 
                this.ctx.scale(scale, scale);
                this.ctx.fillText(txt, 0, 0);
                
                if(GameLogic.state.comboMult === 3) {
                    this.ctx.font = "10px 'Press Start 2P'";
                    this.ctx.fillStyle = "#fff";
                    this.ctx.fillText("MAX!", 0, 15);
                }
                
                this.ctx.restore();
            }

            if (GameLogic.state.settings.animations) {
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
            let act = GameLogic.getActive();
            // Just update UI text here to keep timer sync
            if(Date.now() > act.buffs.od && this.wrapper && this.wrapper.classList.contains('buff-overdrive')) this.update();
            else if(Date.now() > act.buffs.str && this.wrapper && this.wrapper.classList.contains('buff-strength')) this.update();
            else if(Date.now() > act.buffs.min && this.wrapper && this.wrapper.classList.contains('buff-miner')) this.update();
            
            // Check Combo Timeout in Render Loop for visual feedback
            if (Date.now() - GameLogic.state.lastClickTime > 800 && GameLogic.state.combo > 0) {
                GameLogic.state.combo = 0;
                GameLogic.state.comboMult = 1;
            }
        },

        // --- MODAL & MISC ---
        openSettings: function() { 
            document.getElementById('settings-modal').style.display = 'flex';
            // ADDED: Sync slider with state
            const vol = GameLogic.state.settings.volume !== undefined ? GameLogic.state.settings.volume : 0.3;
            document.getElementById('vol-slider').value = Math.floor(vol * 100);
            document.getElementById('vol-display').innerText = Math.floor(vol * 100);
        },
        closeSettings: function() { document.getElementById('settings-modal').style.display = 'none'; },
        
        togglePerformance: function() {
            GameLogic.state.settings.animations = !GameLogic.state.settings.animations;
            const toggle = document.getElementById('anim-toggle');
            if (GameLogic.state.settings.animations) toggle.classList.add('active'); 
            else toggle.classList.remove('active');
            
            this.updateActiveMiners(); 
            
            if(!GameLogic.state.settings.animations) { 
                this.particles = []; 
                this.floaters = []; 
            }
        },
        
        openEventCenter: function() { 
            document.getElementById('event-modal').style.display = 'flex'; 
            
            // NEW: Hide/Show Christmas Event based on date
            const xmasContainer = document.getElementById('xmas-event-container');
            if (xmasContainer) {
                if (GameLogic.isEventActive()) {
                    xmasContainer.style.display = 'block';
                } else {
                    xmasContainer.style.display = 'none';
                }
            }
        },
        closeEventCenter: function() { document.getElementById('event-modal').style.display = 'none'; },
        
        openEventShop: function() { 
            document.getElementById('event-shop-modal').style.display = 'flex'; 
            this.renderEventShop(); 
        },
        closeEventShop: function() { document.getElementById('event-shop-modal').style.display = 'none'; },
        
        toggleEvent: function(ev) {
            GameLogic.toggleEvent(ev);
        },
        
        renderEventShop: function() {
            const grid = document.getElementById('event-shop-grid');
            if(!grid) return;
            grid.innerHTML = "";
            const eventItems = [];
            // Collect event items from all categories
            for(let cat in Worlds.cosmetics) {
                Worlds.cosmetics[cat].forEach(item => {
                    if(item.currency === 'snowflakes') eventItems.push({...item, category: cat});
                });
            }
            
            eventItems.forEach(item => {
                let el = document.createElement('div'); el.className = "shop-item";
                let isOwned = GameLogic.avatar.unlocked.includes(item.id);
                let isEquipped = GameLogic.avatar.equipped[item.category] === item.id;
                if (isOwned) el.classList.add('owned'); if (isEquipped) el.classList.add('equipped');
                let btnText = isEquipped ? "An" : (isOwned ? "Wählen" : `${item.cost} ❄️`);
                el.innerHTML = `<div class="item-name">${item.name}</div><div style="font-size:24px;">🎁</div><div class="item-price">${btnText}</div>`;
                el.onclick = () => GameLogic.buyEventItem(item.id); 
                grid.appendChild(el);
            });
        },
        
        // NEW: Achievements UI
        openAchievements: function() {
            document.getElementById('achieve-modal').style.display = 'flex';
            this.renderAchievements();
        },
        closeAchievements: function() { document.getElementById('achieve-modal').style.display = 'none'; },
        
        renderAchievements: function() {
            const list = document.getElementById('achieve-list');
            list.innerHTML = "";
            
            Worlds.achievements.forEach(ach => {
                // Calculate current goal based on tier
                let currentTier = GameLogic.state.achievementLevels[ach.id] || 0;
                let goal = Math.floor(ach.baseGoal * Math.pow(ach.scale, currentTier));
                if(ach.type === 'prestige') goal = ach.baseGoal + currentTier;

                // Current progress val
                let currentVal = 0;
                let act = GameLogic.getActive();
                if(ach.type === 'depth') currentVal = act.depth;
                if(ach.type === 'gold') currentVal = act.gold;
                if(ach.type === 'clicks') currentVal = GameLogic.state.stats.totalClicks;
                if(ach.type === 'boss') currentVal = act.bossKills;
                if(ach.type === 'prestige') currentVal = act.prestigeCount;

                let progressPct = Math.min(100, (currentVal / goal) * 100);
                
                let div = document.createElement('div');
                div.className = `achieve-row`;
                
                div.innerHTML = `
                    <div class="achieve-icon">${ach.icon}</div>
                    <div class="achieve-desc">
                        <strong style="color: #fff">${ach.name} <span style="font-size:10px; color:#aaa">(${currentTier + 1})</span></strong><br>
                        <small style="color: #ccc">${ach.desc}: ${GameLogic.formatNumber(currentVal)} / ${GameLogic.formatNumber(goal)}</small>
                        <div class="achieve-progress-bar"><div class="achieve-progress-fill" style="width:${progressPct}%"></div></div>
                    </div>
                    <div class="achieve-reward">+${ach.baseReward + currentTier} 🏆</div>
                `;
                list.appendChild(div);
            });
        },

        showAchievementToast: function(title, msg, reward) {
            const toast = document.getElementById('achievement-toast');
            const txt = document.querySelector('.toast-text');
            txt.innerHTML = `<strong>${title}</strong><small>${msg} (+${reward} 🏆)</small>`;
            
            toast.classList.add('show');
            
            // Play Sound
            AudioController.playTone(600, 0.1, 'square', 0.1);
            setTimeout(() => AudioController.playTone(800, 0.2, 'square', 0.1), 150);

            // Hide after 3s
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        },

        // NEW: Pet Shop UI
        openPetShop: function() {
            document.getElementById('pet-modal').style.display = 'flex';
            this.renderPetShop();
        },
        closePetShop: function() { document.getElementById('pet-modal').style.display = 'none'; },
        
        renderPetShop: function() {
            const list = document.getElementById('pet-list');
            list.innerHTML = "";
            document.getElementById('trophy-display').innerText = GameLogic.state.trophies;
            
            Worlds.pets.forEach(pet => {
                let isOwned = GameLogic.state.ownedPets.includes(pet.id);
                let isActive = GameLogic.state.activePet === pet.id;
                
                let div = document.createElement('div');
                div.className = `pet-card ${isOwned ? 'owned' : ''} ${isActive ? 'active-pet' : ''}`;
                
                let btnTxt = isOwned ? (isActive ? "Aktiv" : "Ausrüsten") : `${pet.cost} 🏆`;
                
                // Create mini canvas for icon preview
                let canvasId = `pet-cvs-${pet.id}`;
                
                div.innerHTML = `
                    <div style="font-size:24px; margin-bottom:5px;">${pet.shape === 'bat' ? '🦇' : (pet.shape === 'slime' ? '🦠' : (pet.shape==='fairy' ? '🧚' : (pet.shape==='phoenix' ? '🔥' : '📦')))}</div>
                    <div class="pet-name" style="color:${pet.color}">${pet.name}</div>
                    <div class="pet-bonus">${pet.bonus}</div>
                    <div class="pet-cost">${btnTxt}</div>
                `;
                
                div.onclick = () => {
                    if(isOwned) GameLogic.equipPet(pet.id);
                    else GameLogic.buyPet(pet.id);
                };
                
                list.appendChild(div);
            });
        },
        
        // NEW: Exchange UI Methods
        openExchange: function() {
            document.getElementById('exchange-modal').style.display = 'flex';
            this.updateExchangeRate();
        },
        closeExchange: function() { document.getElementById('exchange-modal').style.display = 'none'; },
        
        updateExchangeRate: function() {
            const sellSelect = document.getElementById('ex-sell-select');
            const buySelect = document.getElementById('ex-buy-select');
            const sellType = sellSelect.value;
            const buyType = buySelect.value;
            
            // Update Balances
            const names = { mine: "Gold", forest: "Harz", desert: "Skara", ice: "Eis" };
            document.getElementById('ex-sell-balance').innerText = `${names[sellType]}: ${GameLogic.formatNumber(GameLogic.state[sellType].gold)}`;
            document.getElementById('ex-buy-balance').innerText = `${names[buyType]}: ${GameLogic.formatNumber(GameLogic.state[buyType].gold)}`;

            // Calculate Rate
            // Updated Tiers for Exchange
            const tiers = { mine: 1, forest: 2, desert: 3, ice: 4 }; 
            let sTier = tiers[sellType];
            let bTier = tiers[buyType];
            
            let rateText = "";
            
            if(sellType === buyType) {
                rateText = "Wähle unterschiedliche Währungen";
            } else if (bTier > sTier) {
                let diff = bTier - sTier;
                let cost = Math.pow(200000000, diff); // Display Nerfed Rate
                rateText = `${GameLogic.formatNumber(cost)} ${names[sellType]} = 1 ${names[buyType]}`;
            } else {
                let diff = sTier - bTier;
                let gain = Math.pow(20000000, diff); // Display Nerfed Gain
                rateText = `1 ${names[sellType]} = ${GameLogic.formatNumber(gain)} ${names[buyType]}`;
            }
            
            document.getElementById('ex-rate-display').innerText = rateText;
        },

        openWorldTravel: function() { document.getElementById('world-modal').style.display = 'flex'; GameLogic.checkWorldUnlock(); },
        closeWorldTravel: function() { document.getElementById('world-modal').style.display = 'none'; },
        
        openPrestige: function() { 
            document.getElementById('prestige-modal').style.display = 'flex'; 
            this.updatePrestigeUI(); 
            this.renderDanceFloor(); 
        },
        closePrestige: function() { document.getElementById('prestige-modal').style.display = 'none'; },
        
        // NEW: Aetherium Shop UI
        openAetheriumShop: function() {
            document.getElementById('aetherium-modal').style.display = 'flex';
            this.renderAetheriumShop();
        },
        closeAetheriumShop: function() { document.getElementById('aetherium-modal').style.display = 'none'; },
        
        renderAetheriumShop: function() {
            const grid = document.getElementById('aetherium-list');
            if(!grid) return;
            grid.innerHTML = "";
            let act = GameLogic.getActive();
            let conf = GameLogic.getConfig();
            
            document.getElementById('aetherium-shop-display').innerText = act.prestige;

            // --- RENDER CLICK UPGRADE (Highlight Item) ---
            let cLvl = act.clickUpgrade || 0;
            let cCost = 1 + (cLvl * 2);
            let cBonus = (1 + cLvl) * 100;
            
            let clickEl = document.createElement('div'); 
            clickEl.className = "shop-item";
            clickEl.style.border = "2px solid #e74c3c"; // Red border for Attack
            clickEl.style.background = "linear-gradient(135deg, #2c3e50, #000)";
            
            clickEl.innerHTML = `
                <div style="font-size:10px; color:#e74c3c; font-weight:bold;">TITANEN GRIFF</div>
                <div style="font-size:20px; margin:5px 0;">💪 ${cLvl}</div>
                <div style="font-size:10px; color:#fff;">Click: ${cBonus}%</div>
                <div class="item-price" style="color: ${act.prestige >= cCost ? '#fff' : '#555'}">${cCost} 💎</div>
            `;
            clickEl.onclick = () => GameLogic.buyAetheriumClickUpgrade();
            grid.appendChild(clickEl);

            // --- RENDER MINER UPGRADES ---
            conf.miners.forEach((type, index) => {
                let lvl = act.minerUpgrades[index] || 0;
                let cost = 1 + (lvl * 2);
                let bonus = (1 + lvl) * 100; // Display as % (100% = x1, 200% = x2)
                
                let el = document.createElement('div'); 
                el.className = "shop-item";
                // Show as green border if affordable
                if(act.prestige >= cost) el.style.borderColor = "#2ecc71";
                
                el.innerHTML = `
                    <div style="font-size:10px; color:#aaa;">${type.name}</div>
                    <div style="font-size:18px; margin:5px 0;">⚡ ${lvl}</div>
                    <div style="font-size:10px; color:#00d2d3;">Power: ${bonus}%</div>
                    <div class="item-price" style="color: ${act.prestige >= cost ? '#fff' : '#555'}">${cost} 💎</div>
                `;
                el.onclick = () => GameLogic.buyAetheriumUpgrade(index);
                grid.appendChild(el);
            });
        },

        renderDanceFloor: function() {
            const floor = document.getElementById('dance-floor');
            while(floor.children.length > 1) floor.removeChild(floor.lastChild);
            let dancerCount = 0; let act = GameLogic.getActive(); let conf = GameLogic.getConfig();
            act.miners.forEach((m, i) => {
                if (m.level > 0 && dancerCount < 6) { 
                    let type = conf.miners[i];
                    let div = document.createElement('div'); div.className = "dancer";
                    div.innerHTML = `<div class="bot-body" style="background-color: ${type.color}"><div class="bot-arm"></div></div>`;
                    div.style.left = (Math.random() * 80 + 10) + "%"; div.style.top = (Math.random() * 60 + 20) + "px";
                    floor.appendChild(div); dancerCount++;
                }
            });
        },
        updatePrestigeUI: function() {
            let act = GameLogic.getActive();
            let reward = Math.floor(act.depth / 20);
            let reqDepth = 50 + (act.prestigeCount * 20); 
            document.getElementById('prestige-reward-amount').innerText = reward;
            document.getElementById('prestige-req').innerText = reqDepth;
            document.getElementById('btn-prestige-main').disabled = act.depth < reqDepth;
        },

        // --- AVATAR UI METHODS (Bridged) ---
        openPlayerCard: function() {
            document.getElementById('player-modal').style.display = 'flex';
            document.getElementById('stat-max-depth').innerText = GameLogic.getActive().maxDepth;
            document.getElementById('stat-aetherium').innerText = GameLogic.getActive().prestige;
            document.getElementById('stat-bosses').innerText = GameLogic.getActive().bossKills;
            this.renderAvatarPreview(); this.renderShop();
        },
        closePlayerCard: function() { document.getElementById('player-modal').style.display = 'none'; },
        updateName: function() { GameLogic.avatar.name = document.getElementById('player-name-input').value; },
        switchTab: function(tab) {
            this.currentShopTab = tab;
            document.querySelectorAll('.shop-tab').forEach(el => el.classList.remove('active'));
            event.target.classList.add('active');
            this.renderShop();
        },
        renderShop: function() {
            const grid = document.getElementById('shop-grid'); 
            grid.innerHTML = "";
            grid.style.display = 'grid'; // Reset display style
            
            // NEW: Handle Artifacts Tab
            if (this.currentShopTab === 'artifacts') {
                Worlds.artifacts.forEach(art => {
                    let isFound = GameLogic.state.artifactsFound.includes(art.id);
                    let div = document.createElement('div');
                    div.className = `artifact-card ${isFound ? 'found' : 'locked'}`;
                    
                    div.innerHTML = `
                        <div class="artifact-world">${art.world.toUpperCase()}</div>
                        <div class="artifact-icon">${isFound ? art.icon : '❓'}</div>
                        <div class="item-name" style="color:${isFound ? '#fff' : '#555'}">${isFound ? art.name : '???'}</div>
                        ${isFound ? `<div class="artifact-bonus">${art.bonus}</div>` : ''}
                    `;
                    grid.appendChild(div);
                });
                return;
            }

            // NEW: Handle Stats Tab
            if (this.currentShopTab === 'stats') {
                grid.style.display = 'flex'; // Switch to flex for list
                grid.style.flexDirection = 'column';
                
                const s = GameLogic.state.stats;
                const rows = [
                    { l: "Gesamt Klicks", v: GameLogic.formatNumber(s.totalClicks) },
                    { l: "Abgebaute Blöcke", v: GameLogic.formatNumber(s.blocksBroken) },
                    { l: "Gesammeltes Gold", v: GameLogic.formatNumber(s.totalGold) },
                    { l: "Max Combo", v: s.maxCombo },
                    { l: "Spielzeit", v: ((Date.now() - (s.startTime||Date.now())) / 60000).toFixed(1) + " Min" },
                    { l: "Pets gesammelt", v: `${GameLogic.state.ownedPets.length} / ${Worlds.pets.length}` },
                    { l: "Artefakte gefunden", v: `${GameLogic.state.artifactsFound.length} / ${Worlds.artifacts.length}` }
                ];
                
                rows.forEach(r => {
                    let div = document.createElement('div');
                    div.className = "stat-list-row";
                    div.innerHTML = `<span>${r.l}</span> <span class="stat-val">${r.v}</span>`;
                    grid.appendChild(div);
                });
                return;
            }

            // Cosmetics Logic
            Worlds.cosmetics[this.currentShopTab].forEach(item => {
                // Filter out special currency items from normal shop if tab is not 'christmas' special logic?
                // Actually keep them but handle currency display
                
                let el = document.createElement('div'); el.className = "shop-item";
                let isOwned = GameLogic.avatar.unlocked.includes(item.id);
                let isEquipped = GameLogic.avatar.equipped[this.currentShopTab] === item.id;
                if (isOwned) el.classList.add('owned'); if (isEquipped) el.classList.add('equipped');
                
                // CHANGE: Display cost in correct currency
                let costTxt = `${item.cost} 🧶`; // Default Fabric
                if (item.currency === 'snowflakes') costTxt = `${item.cost} ❄️`;
                if (item.currency === 'silk') costTxt = `${item.cost} 🧣`; // Silk
                
                let btnText = isEquipped ? "An" : (isOwned ? "Wählen" : costTxt);
                
                el.innerHTML = `<div class="item-name">${item.name}</div><div style="font-size:24px;">${this.getItemIcon(item)}</div><div class="item-price">${btnText}</div>`;
                el.onclick = () => this.buyOrEquip(item); grid.appendChild(el);
            });
        },
        update: function() {
            let act = GameLogic.getActive(); let conf = GameLogic.getConfig();
            
            // GUARDS for elements
            const setTxt = (id, txt) => { const el = document.getElementById(id); if(el) el.innerText = txt; }
            
            // --- XMAS BUTTON LOGIC (Fixed) ---
            const xmasBtn = document.getElementById('btn-xmas-travel');
            if(xmasBtn) {
                const hasArtifact = GameLogic.state.artifactsFound && GameLogic.state.artifactsFound.includes('christmas_star');
                const hasFlag = GameLogic.state.eventsCompleted && GameLogic.state.eventsCompleted.christmas;
                
                if (hasArtifact || hasFlag) {
                    if(xmasBtn.innerHTML !== "ABGESCHLOSSEN 🔒") {
                        xmasBtn.innerHTML = "ABGESCHLOSSEN 🔒";
                        xmasBtn.style.background = "#7f8c8d";
                        xmasBtn.style.cursor = "not-allowed";
                        xmasBtn.disabled = true;
                        xmasBtn.onclick = (e) => { e.preventDefault(); return false; };
                    }
                } else {
                    if(xmasBtn.innerHTML !== "REISEN") {
                        xmasBtn.innerHTML = "REISEN";
                        xmasBtn.style.background = "#c0392b";
                        xmasBtn.style.cursor = "pointer";
                        xmasBtn.disabled = false;
                        xmasBtn.onclick = () => GameLogic.enterChristmasWorld();
                    }
                }
            }

            setTxt('depthDisplay', act.depth);
            setTxt('goldDisplay', GameLogic.formatNumber(act.gold));
            setTxt('goldDisplayBig', GameLogic.formatNumber(act.gold));
            
            // --- HP BAR FIX ---
            let hpPercent = (Math.max(0, act.currentHp) / act.maxHp) * 100;
            const hpBar = document.getElementById('hp-bar-fill');
            const hpText = document.getElementById('hp-text-overlay');
            
            if(hpBar) hpBar.style.width = hpPercent + "%";
            if(hpText) hpText.innerText = GameLogic.formatNumber(Math.max(0, act.currentHp)) + " / " + GameLogic.formatNumber(act.maxHp);
            
            setTxt('dpsDisplay', GameLogic.formatNumber(GameLogic.calculateDPS()));
            setTxt('bossKillDisplay', act.bossKills);
            setTxt('bossBuffDisplay', (act.bossKills * 10));
            setTxt('aetheriumDisplay', act.prestige);
            setTxt('multDisplay', (act.prestige * 10).toLocaleString());
            setTxt('snowflake-display', GameLogic.state.snowflakes);
            
            // --- SILK/FABRIC HUD ---
            const fabContainer = document.getElementById('fabric-display-container');
            const fabIcon = document.querySelector('#fabric-display-container span:first-child');

            if(GameLogic.state.activeWorld === 'christmas') {
                if(fabIcon) fabIcon.innerText = '🧣';
                setTxt('fabric-hud-amount', GameLogic.state.silk);
                if(fabContainer) fabContainer.style.borderColor = "#e74c3c"; // Red Border for Silk
            } else {
                if(fabIcon) fabIcon.innerText = '🧶';
                setTxt('fabric-hud-amount', GameLogic.state.fabric);
                if(fabContainer) fabContainer.style.borderColor = "#aaa"; // Grey Border for Wool
            }

            let nextPick = conf.picks[act.pickLevel + 1];
            let pickBtn = document.getElementById('btn-pick');
            if (pickBtn) {
                let costMult = 1;
                if(GameLogic.state.artifactsFound && GameLogic.state.artifactsFound.includes('fossil')) costMult = 0.9;
                
                if (nextPick) { 
                    let dCost = Math.floor(nextPick.cost * costMult);
                    pickBtn.innerHTML = `Werkzeug Upgraden: <b>${nextPick.name}</b><br><small>${GameLogic.formatNumber(dCost)} G</small>`; 
                    pickBtn.disabled = act.gold < dCost; 
                } 
                else { pickBtn.innerHTML = "MAX LEVEL"; pickBtn.disabled = true; }
            }

            setTxt('cost-tnt', GameLogic.formatNumber(act.costs.tnt)); 
            const btnTnt = document.getElementById('btn-tnt'); if(btnTnt) btnTnt.disabled = act.gold < act.costs.tnt;

            setTxt('cost-str', GameLogic.formatNumber(act.costs.str)); 
            const btnStr = document.getElementById('btn-pot-str'); if(btnStr) btnStr.disabled = act.gold < act.costs.str;

            setTxt('cost-min', GameLogic.formatNumber(act.costs.min)); 
            const btnMin = document.getElementById('btn-pot-min'); if(btnMin) btnMin.disabled = act.gold < act.costs.min;

            setTxt('cost-od', GameLogic.formatNumber(act.costs.od)); 
            const btnOd = document.getElementById('btn-pot-od'); if(btnOd) btnOd.disabled = act.gold < act.costs.od;

            if(this.wrapper) {
                this.wrapper.className = ""; 
                if(Date.now() < act.buffs.od) this.wrapper.classList.add('buff-overdrive');
                else if(Date.now() < act.buffs.str) this.wrapper.classList.add('buff-strength');
                else if(Date.now() < act.buffs.min) this.wrapper.classList.add('buff-miner');
            }

            conf.miners.forEach((type, index) => {
                let m = act.miners[index];
                
                let costMult = 1;
                if(GameLogic.state.artifactsFound && GameLogic.state.artifactsFound.includes('fossil')) costMult = 0.9;
                if(m.skills && m.skills.cost) costMult -= (m.skills.cost * 0.02); // Skill discount
                
                let baseCost = (m.level===0) ? type.baseCost : Math.floor(type.baseCost * Math.pow(1.20, m.level));
                let cost = Math.floor(baseCost * costMult);

                let btn = document.getElementById(`m-btn-${index}`);
                let card = document.getElementById(`miner-card-${index}`);
                let botBody = document.getElementById(`bot-body-${index}`);
                let lockedIcon = document.getElementById(`locked-icon-${index}`);
                
                // GEAR BUTTON UPDATE
                let gearBtn = document.getElementById(`gear-btn-${index}`);
                if (gearBtn) {
                    let totalPoints = Math.floor(m.level / 20);
                    let usedPoints = (m.skills.dps||0) + (m.skills.cost||0) + (m.skills.synergy||0);
                    let hasPoints = (totalPoints - usedPoints) > 0;
                    
                    let newClass = "gear-btn-square";
                    
                    if (m.level === 0) {
                        newClass += " disabled";
                        gearBtn.title = "Erst Bot kaufen!";
                        gearBtn.onclick = null; 
                    } else {
                        if (hasPoints) {
                            newClass += " has-points";
                            gearBtn.title = "Punkte verfügbar!";
                        } else {
                            gearBtn.title = "Module konfigurieren";
                        }
                        gearBtn.onclick = function() { GameLogic.openBotSkills(index); };
                    }
                    gearBtn.className = newClass;
                }

                if(document.getElementById(`m-lvl-${index}`)) {
                    document.getElementById(`m-lvl-${index}`).innerText = "Lvl " + m.level;
                    
                    let milestoneBonus = Math.pow(2, Math.floor(m.level / 10));
                    let skillMult = 1 + ((m.skills.dps||0) * 0.20);
                    let dpsVal = (m.level * type.basePower) * milestoneBonus * skillMult;
                    
                    let boostHtml = (m.level >= 10) ? ` <span style="color:#f1c40f; font-size:9px;">(x${milestoneBonus})</span>` : "";
                    if((m.skills.dps||0) > 0) boostHtml += ` <span style="color:#e74c3c; font-size:9px;">(+${m.skills.dps*20}%)</span>`;
                    
                    document.getElementById(`m-dps-${index}`).innerHTML = GameLogic.formatNumber(dpsVal) + boostHtml;
                    
                    if (m.level === 0) {
                        btn.innerHTML = `Kaufen<br>${GameLogic.formatNumber(cost)}`; 
                        if(card) { card.style.borderLeftColor = "#333"; card.classList.add('locked'); }
                        if(lockedIcon) lockedIcon.style.display = "block"; 
                        if(botBody) botBody.style.backgroundColor = "#333";
                    } else {
                        btn.innerHTML = `Upgr<br>${GameLogic.formatNumber(cost)}`; 
                        if(card) { card.style.borderLeftColor = type.color; card.classList.remove('locked'); }
                        if(lockedIcon) lockedIcon.style.display = "none"; 
                        if(botBody) botBody.style.backgroundColor = type.color;
                    }
                    btn.disabled = act.gold < cost;
                }
            });

            if(document.getElementById('click-list').style.display !== 'none') {
                this.updateClickSkills();
            }
            GameLogic.checkWorldUnlock();
        },

        // --- RESTORED MISSING FUNCTION ---
        getItemIcon: function(item) {
            if(this.currentShopTab === 'hat' && item.id !== 'none') return '🧢';
            if(this.currentShopTab === 'glasses' && item.id !== 'none') return '👓';
            if(this.currentShopTab === 'body') return '👕';
            if(this.currentShopTab === 'legs') return '👖';
            if(this.currentShopTab === 'wings' && item.id !== 'none') return '🦅';
            return '❌';
        },

        buyOrEquip: function(item) {
            let act = GameLogic.getActive();
            if (GameLogic.avatar.unlocked.includes(item.id)) {
                GameLogic.avatar.equipped[this.currentShopTab] = item.id;
                this.renderShop(); this.renderAvatarPreview(); this.renderAvatarIcon();
            } else {
                // CHANGE: Handle Currencies
                let canBuy = false;
                if (item.currency === 'silk') {
                    if (GameLogic.state.silk >= item.cost) {
                        GameLogic.state.silk -= item.cost;
                        canBuy = true;
                    }
                } else if (item.currency === 'snowflakes') {
                    if (GameLogic.state.snowflakes >= item.cost) {
                        GameLogic.state.snowflakes -= item.cost;
                        canBuy = true;
                    }
                } else {
                    // Default Fabric
                    if (GameLogic.state.fabric >= item.cost) {
                        GameLogic.state.fabric -= item.cost;
                        canBuy = true;
                    }
                }

                if (canBuy) {
                    GameLogic.avatar.unlocked.push(item.id);
                    GameLogic.avatar.equipped[this.currentShopTab] = item.id;
                    this.update(); this.renderShop(); this.renderAvatarPreview(); this.renderAvatarIcon();
                }
            }
        },
        renderAvatarIcon: function() { 
            const c = document.getElementById('avatar-canvas-icon');
            // CHANGE: Use larger dimensions for drawing
            if(c) this.drawAvatar(c.getContext('2d'), 128, 128); 
        },
        renderAvatarPreview: function() { 
            const c = document.getElementById('avatar-preview-canvas');
            // CHANGE: Use larger dimensions for drawing
            if(c) this.drawAvatar(c.getContext('2d'), 400, 600); 
        },
        drawAvatar: function(ctx, w, h) {
            ctx.clearRect(0,0,w,h); 
            // CHANGE: Removed imageSmoothingEnabled = false to allow smooth vector shapes
            
            let cx = w/2; let cy = h/2; let scale = w / 24; 
            
            // Helper for rounded rects (makes it look less blocky)
            const roundRect = (x, y, w, h, r) => {
                ctx.beginPath();
                ctx.moveTo(x+r, y);
                ctx.arcTo(x+w, y, x+w, y+h, r);
                ctx.arcTo(x+w, y+h, x, y+h, r);
                ctx.arcTo(x, y+h, x, y, r);
                ctx.arcTo(x, y, x+w, y, r);
                ctx.closePath();
                ctx.fill();
            };

            // Find item function
            const findItem = (cat) => {
                // Search in category
                let found = Worlds.cosmetics[cat].find(i => i.id === GameLogic.avatar.equipped[cat]);
                return found || { id: 'none', color: '#000' }; // fallback
            };

            const get = (cat) => findItem(cat);
            
            const bodyItem = get('body'); // Changed to object to access type
            const legItem = get('legs');   // Changed to object to access type
            const bodyColor = bodyItem.color || '#7f8c8d';
            const legColor = legItem.color || '#2980b9';
            const hat = get('hat'); 
            const wing = get('wings'); 
            const glasses = get('glasses');

            // Wings (Smoother)
            if(wing.id !== 'none') {
                ctx.fillStyle = wing.color;
                ctx.beginPath(); 
                // Angel wings - curved
                if(wing.type === 'angel') {
                    ctx.ellipse(cx-8*scale, cy-4*scale, 6*scale, 3*scale, -0.5, 0, Math.PI*2);
                    ctx.ellipse(cx+8*scale, cy-4*scale, 6*scale, 3*scale, 0.5, 0, Math.PI*2);
                } else {
                    // Demon/Jetpack - sharp but high res
                    ctx.moveTo(cx-4*scale, cy-4*scale); ctx.lineTo(cx-14*scale, cy-10*scale); ctx.lineTo(cx-8*scale, cy+6*scale);
                    ctx.moveTo(cx+4*scale, cy-4*scale); ctx.lineTo(cx+14*scale, cy-10*scale); ctx.lineTo(cx+8*scale, cy+6*scale);
                }
                ctx.fill();
            }

            // --- BODY RENDERING (NEW: Baggy/Hoodie Logic) ---
            ctx.fillStyle = bodyColor; 
            let bodyWidth = 9*scale;
            
            if (bodyItem.type === 'baggy' || bodyItem.type === 'hoodie') {
                bodyWidth = 11*scale; // Wider fit
                roundRect(cx - 5.5*scale, cy - 2*scale, 11*scale, 9.5*scale, 1*scale);
                
                // Texture: Checkered for Lumberjack
                if(bodyItem.id === 'lumberjack') {
                    ctx.fillStyle = "rgba(0,0,0,0.2)";
                    ctx.fillRect(cx - 5.5*scale, cy, 11*scale, 1*scale);
                    ctx.fillRect(cx - 5.5*scale, cy + 3*scale, 11*scale, 1*scale);
                    ctx.fillRect(cx - 2*scale, cy - 2*scale, 1*scale, 9.5*scale);
                    ctx.fillRect(cx + 1*scale, cy - 2*scale, 1*scale, 9.5*scale);
                }
                
                // Hoodie Details
                if(bodyItem.type === 'hoodie') {
                    // Pocket
                    ctx.fillStyle = "rgba(0,0,0,0.2)";
                    ctx.beginPath();
                    ctx.moveTo(cx - 3*scale, cy + 4*scale);
                    ctx.lineTo(cx + 3*scale, cy + 4*scale);
                    ctx.lineTo(cx + 2.5*scale, cy + 7*scale);
                    ctx.lineTo(cx - 2.5*scale, cy + 7*scale);
                    ctx.fill();
                    // Strings
                    ctx.fillStyle = "#fff";
                    ctx.fillRect(cx - 1.5*scale, cy - 1*scale, 0.3*scale, 3*scale);
                    ctx.fillRect(cx + 1.2*scale, cy - 1*scale, 0.3*scale, 3*scale);
                }
                
                // Folds / Falten
                ctx.strokeStyle = "rgba(0,0,0,0.15)"; ctx.lineWidth = 0.5*scale;
                ctx.beginPath(); ctx.moveTo(cx-5*scale, cy+6*scale); ctx.lineTo(cx-3*scale, cy+7*scale); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(cx+5*scale, cy+6*scale); ctx.lineTo(cx+3*scale, cy+7*scale); ctx.stroke();
            } else {
                // Standard Fit
                roundRect(cx - 4.5*scale, cy - 2*scale, 9*scale, 9*scale, 1*scale);
            }

            // Head (Skin tone + Shading)
            ctx.fillStyle = "#ffccaa"; 
            roundRect(cx - 3.5*scale, cy - 8.5*scale, 7*scale, 7*scale, 1.5*scale);
            
            // Eyes
            if (glasses.id === 'none' && hat.type !== 'helmet') {
                ctx.fillStyle = "#fff";
                ctx.beginPath(); ctx.arc(cx - 1.5*scale, cy - 6*scale, 1*scale, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(cx + 1.5*scale, cy - 6*scale, 1*scale, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = "#000";
                ctx.beginPath(); ctx.arc(cx - 1.5*scale, cy - 6*scale, 0.4*scale, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(cx + 1.5*scale, cy - 6*scale, 0.4*scale, 0, Math.PI*2); ctx.fill();
                
                // Smile
                ctx.beginPath(); ctx.arc(cx, cy - 4.5*scale, 1.5*scale, 0.2, Math.PI-0.2); ctx.lineWidth = 0.3*scale; ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.stroke();
            }

            // --- LEGS RENDERING (NEW: Baggy/Cargo Logic) ---
            ctx.fillStyle = legColor; 
            
            if (legItem.type === 'baggy' || legItem.type === 'cargo') {
                // Wide Legs
                roundRect(cx - 4.2*scale, cy + 6.5*scale, 4*scale, 7*scale, 0.5*scale); 
                roundRect(cx + 0.2*scale, cy + 6.5*scale, 4*scale, 7*scale, 0.5*scale);
                
                // Cargo Pockets
                if(legItem.type === 'cargo') {
                    ctx.fillStyle = "rgba(0,0,0,0.2)";
                    roundRect(cx - 4.5*scale, cy + 8.5*scale, 1*scale, 2.5*scale, 0.2*scale);
                    roundRect(cx + 3.5*scale, cy + 8.5*scale, 1*scale, 2.5*scale, 0.2*scale);
                }
                
                // Baggy Folds at bottom (Shoe stacking)
                ctx.fillStyle = "rgba(0,0,0,0.15)";
                ctx.fillRect(cx - 4*scale, cy + 12*scale, 3.5*scale, 0.5*scale);
                ctx.fillRect(cx + 0.5*scale, cy + 12*scale, 3.5*scale, 0.5*scale);
            } else {
                // Standard Legs
                roundRect(cx - 3.5*scale, cy + 6.5*scale, 3*scale, 6.5*scale, 0.5*scale); 
                roundRect(cx + 0.5*scale, cy + 6.5*scale, 3*scale, 6.5*scale, 0.5*scale);
            }

            // --- ARMS RENDERING (NEW: Sleeves match body) ---
            ctx.fillStyle = bodyColor; 
            if (bodyItem.type === 'baggy' || bodyItem.type === 'hoodie') {
                // Wide Sleeves
                roundRect(cx - 7.5*scale, cy - 1.5*scale, 3*scale, 7.5*scale, 1*scale); // Left
                roundRect(cx + 4.5*scale, cy - 1.5*scale, 3*scale, 7.5*scale, 1*scale); // Right
                // Checkered pattern on sleeves if lumberjack
                if(bodyItem.id === 'lumberjack') {
                    ctx.fillStyle = "rgba(0,0,0,0.2)";
                    ctx.fillRect(cx - 7.5*scale, cy + 2*scale, 3*scale, 1*scale);
                    ctx.fillRect(cx + 4.5*scale, cy + 2*scale, 3*scale, 1*scale);
                }
                
                // Hands (Lower position)
                ctx.fillStyle = "#ffccaa"; 
                roundRect(cx - 7.5*scale, cy + 5.5*scale, 3*scale, 2.5*scale, 1*scale); 
                roundRect(cx + 4.5*scale, cy + 5.5*scale, 3*scale, 2.5*scale, 1*scale);
            } else {
                // Standard Arms
                roundRect(cx - 6.5*scale, cy - 1.5*scale, 2.5*scale, 7.5*scale, 1*scale);
                roundRect(cx + 4*scale, cy - 1.5*scale, 2.5*scale, 7.5*scale, 1*scale);
                
                // Standard Hands
                ctx.fillStyle = "#ffccaa"; 
                roundRect(cx - 6.5*scale, cy + 5.5*scale, 2.5*scale, 2.5*scale, 1*scale); 
                roundRect(cx + 4*scale, cy + 5.5*scale, 2.5*scale, 2.5*scale, 1*scale);
            }

            // Glasses
            if (glasses.id !== 'none') {
                ctx.fillStyle = glasses.color;
                if (glasses.type === 'visor') roundRect(cx - 3.5*scale, cy - 6.5*scale, 7*scale, 2.5*scale, 0.5*scale);
                else { 
                    roundRect(cx - 3.5*scale, cy - 6.5*scale, 3*scale, 2.5*scale, 0.5*scale); 
                    roundRect(cx + 0.5*scale, cy - 6.5*scale, 3*scale, 2.5*scale, 0.5*scale);
                    ctx.fillRect(cx - 0.5*scale, cy - 6*scale, 1*scale, 0.5*scale); // Bridge
                }
            }
            // Hat
            if (hat.id !== 'none') {
                ctx.fillStyle = hat.color || '#fff';
                if (hat.type === 'cap') { 
                    roundRect(cx - 4*scale, cy - 9.5*scale, 8*scale, 3*scale, 1*scale); 
                    ctx.fillRect(cx - 4*scale, cy - 7.5*scale, 9*scale, 1*scale); // Visor
                } 
                else if (hat.type === 'tophat') { 
                    ctx.fillRect(cx - 5*scale, cy - 8*scale, 10*scale, 1.5*scale); 
                    ctx.fillRect(cx - 3.5*scale, cy - 14*scale, 7*scale, 6*scale); 
                } 
                else if (hat.type === 'crown') { 
                    ctx.fillStyle = "#f1c40f"; 
                    ctx.beginPath(); ctx.moveTo(cx-4*scale, cy-8*scale); ctx.lineTo(cx-4*scale, cy-12*scale); ctx.lineTo(cx-1.5*scale, cy-9*scale); ctx.lineTo(cx+1.5*scale, cy-12*scale); ctx.lineTo(cx+4*scale, cy-9*scale); ctx.lineTo(cx+4*scale, cy-8*scale); ctx.fill(); 
                }
                else if (hat.type === 'santa') {
                     ctx.fillStyle = "#c0392b"; ctx.beginPath(); ctx.moveTo(cx-4*scale, cy-8.5*scale); ctx.lineTo(cx+4*scale, cy-8.5*scale); ctx.lineTo(cx+5*scale, cy-4*scale); ctx.lineTo(cx, cy-15*scale); ctx.fill();
                     ctx.fillStyle = "#fff"; roundRect(cx-4*scale, cy-9*scale, 8*scale, 2.5*scale, 1*scale); ctx.beginPath(); ctx.arc(cx+5*scale, cy-4*scale, 1.5*scale, 0, Math.PI*2); ctx.fill();
                }
                // NEW: Fixed Miner Helmet
                else if (hat.type === 'helmet') {
                    // Dome (Round top)
                    ctx.beginPath(); 
                    ctx.arc(cx, cy - 9*scale, 4.2*scale, Math.PI, 0); 
                    ctx.fill();
                    
                    // Rim (Bottom part)
                    roundRect(cx - 5*scale, cy - 9*scale, 10*scale, 1.5*scale, 0.5*scale);
                    
                    // Lamp Housing
                    ctx.fillStyle = "#d35400"; 
                    ctx.beginPath(); ctx.arc(cx, cy - 11.5*scale, 1.2*scale, 0, Math.PI*2); ctx.fill();
                    
                    // Light Bulb
                    ctx.fillStyle = "#fff"; 
                    ctx.beginPath(); ctx.arc(cx, cy - 11.5*scale, 0.8*scale, 0, Math.PI*2); ctx.fill();
                    
                    // Glow Effect
                    ctx.fillStyle = "rgba(255, 255, 200, 0.3)"; 
                    ctx.beginPath(); ctx.arc(cx, cy - 11.5*scale, 3*scale, 0, Math.PI*2); ctx.fill();
                }
                // NEW: Elf Hat Texture
                else if (hat.type === 'elf') {
                    ctx.fillStyle = hat.color;
                    ctx.beginPath();
                    ctx.moveTo(cx - 4.5*scale, cy - 8.5*scale);
                    ctx.quadraticCurveTo(cx - 2*scale, cy - 16*scale, cx + 6*scale, cy - 12*scale); // Tip curves to right
                    ctx.lineTo(cx + 4.5*scale, cy - 8.5*scale);
                    ctx.fill();
                    
                    // Rim
                    ctx.fillStyle = "#e74c3c"; // Red rim for contrast
                    roundRect(cx - 5*scale, cy - 9*scale, 10*scale, 2*scale, 0.5*scale);
                    
                    // Pom-pom
                    ctx.fillStyle = "#fff";
                    ctx.beginPath(); ctx.arc(cx + 6*scale, cy - 12*scale, 1.5*scale, 0, Math.PI*2); ctx.fill();
                }
                // NEW: Antlers Texture
                else if (hat.type === 'antlers') {
                    ctx.strokeStyle = hat.color;
                    ctx.lineWidth = 1.5*scale;
                    ctx.lineCap = "round";
                    
                    // Left Antler
                    ctx.beginPath();
                    ctx.moveTo(cx - 2*scale, cy - 9*scale);
                    ctx.quadraticCurveTo(cx - 6*scale, cy - 12*scale, cx - 4*scale, cy - 15*scale);
                    ctx.stroke();
                    // Left branches
                    ctx.beginPath(); ctx.moveTo(cx - 4*scale, cy - 11*scale); ctx.lineTo(cx - 6*scale, cy - 10*scale); ctx.stroke();
                    
                    // Right Antler
                    ctx.beginPath();
                    ctx.moveTo(cx + 2*scale, cy - 9*scale);
                    ctx.quadraticCurveTo(cx + 6*scale, cy - 12*scale, cx + 4*scale, cy - 15*scale);
                    ctx.stroke();
                    // Right branches
                    ctx.beginPath(); ctx.moveTo(cx + 4*scale, cy - 11*scale); ctx.lineTo(cx + 6*scale, cy - 10*scale); ctx.stroke();
                    
                    // Headband (invisible/blends in or small band)
                    ctx.fillStyle = "#5d4037";
                    ctx.fillRect(cx - 2.5*scale, cy - 9*scale, 5*scale, 1*scale);
                }
            }
        }
    };

    // --- DEV TOOLS ---
    const DevTools = {
        devSkip: function() {
            let act = GameLogic.getActive();
            act.depth = 1000;
            act.maxDepth = 1000;
            act.gold += 1000000000000;
            GameLogic.state.lastBgMatIndex = -1; 
            UI.generateBlockTexture(); GameLogic.checkWorldUnlock(); UI.update(); UI.spawnFloater(160, 160, "DEV CHEAT!", "#f00");
        },
        devSpawnBubble: function() {
            UI.spawnBubbleElement(() => {
                GameLogic.clickBubble();
            });
            UI.spawnFloater(window.innerWidth - 100, window.innerHeight - 100, "BUBBLE!", "#fff");
        },
        // NEW: Add Fabric Cheat
        devAddFabric: function() {
            GameLogic.state.fabric += 200;
            UI.update();
            UI.spawnFloater(window.innerWidth/2, window.innerHeight/2, "+200 🧶", "#fff");
        },
        // NEW: Add Trophy Cheat
        devAddTrophies: function() {
            GameLogic.state.trophies += 50;
            UI.update();
            // Refresh Pet Shop if open
            if(document.getElementById('pet-modal').style.display === 'flex') {
                UI.renderPetShop();
            }
            UI.spawnFloater(window.innerWidth/2, window.innerHeight/2, "+50 🏆", "#f1c40f");
        },
        // NEW: Add Silk Cheat
        devAddSilk: function() {
            GameLogic.state.silk = (GameLogic.state.silk || 0) + 500;
            UI.update();
            UI.spawnFloater(window.innerWidth/2, window.innerHeight/2, "+500 🧣", "#fab1a0");
        },
        // NEW: Force next artifact drop (DEV ONLY)
        devForceArtifact: function() {
            GameLogic.state.forceNextArtifactDrop = true;
            UI.spawnFloater(window.innerWidth/2, window.innerHeight/2, "NEXT 🏺", "#f1c40f");
        },
        
        // NEW: Jump 100 Levels + 1 Bio Gold
        devJump100: function() {
            let act = GameLogic.getActive();
            act.depth += 100;
            if(act.depth > act.maxDepth) act.maxDepth = act.depth;
            
            act.gold += 1000000000; // 1 Bio
            
            // Force redraw logic
            UI.generateBlockTexture(); 
            GameLogic.checkWorldUnlock(); // Update unlock buttons immediately
            UI.update();
            UI.spawnFloater(window.innerWidth/2, window.innerHeight/2, "+100 TIEFE & 1 BIO G", "#f1c40f");
        },

        // CHANGED: Set Depth to 399 instead of 400 to trigger boss naturally
        devSetDepth399: function() {
            let act = GameLogic.getActive();
            act.depth = 399; // Set to 399 so next block is 400 boss trigger
            if(act.depth > act.maxDepth) act.maxDepth = act.depth;
            
            // Add 1 Billion Currency if in Christmas World
            if (GameLogic.state.activeWorld === 'christmas') {
                act.gold += 1000000000000; // 1 Bio Giftwrap
                UI.spawnFloater(window.innerWidth/2, window.innerHeight/2 - 50, "+1 BIO 🎁", "#f1c40f");
            }
            
            // Force redraw 
            UI.generateBlockTexture(); 
            UI.update();
            UI.spawnFloater(window.innerWidth/2, window.innerHeight/2, "WARP: TIEFE 399", "#fff");
        }
    };

    // --- APP ---
    const App = {
        init: function() {
            UI.init();
            
            // Bridge Globals for HTML onclicks
            window.buyPickUpgrade = () => GameLogic.buyPickUpgrade();
            window.buyTNT = () => GameLogic.buyTNT();
            window.buyPotionStrength = () => GameLogic.buyPotionStrength();
            window.buyPotionMiner = () => GameLogic.buyPotionMiner();
            window.buyPotionOverdrive = () => GameLogic.buyPotionOverdrive();
            
            // UI Bridge
            window.openPlayerCard = () => UI.openPlayerCard();
            window.closePlayerCard = () => UI.closePlayerCard();
            window.updateName = () => UI.updateName();
            window.switchTab = (t) => UI.switchTab(t);
            window.buyOrEquip = (i) => UI.buyOrEquip(i);
            
            window.openSettings = () => UI.openSettings();
            window.closeSettings = () => UI.closeSettings();
            window.togglePerformance = () => UI.togglePerformance();
            
            window.openEventCenter = () => UI.openEventCenter();
            window.closeEventCenter = () => UI.closeEventCenter();
            window.openEventShop = () => UI.openEventShop();
            window.closeEventShop = () => UI.closeEventShop();
            window.toggleEvent = (ev) => UI.toggleEvent(ev);
            
            window.openWorldTravel = () => UI.openWorldTravel();
            window.closeWorldTravel = () => UI.closeWorldTravel();
            window.tryUnlockForest = () => GameLogic.tryUnlockForest(1e12);
            window.tryUnlockDesert = () => GameLogic.tryUnlockDesert(1e12);
            window.travelTo = (w) => GameLogic.travelTo(w);
            
            window.openPrestige = () => UI.openPrestige();
            window.closePrestige = () => UI.closePrestige();
            window.doPrestige = () => GameLogic.doPrestige();
            
            // NEW Bridges
            window.openAetheriumShop = () => UI.openAetheriumShop();
            window.closeAetheriumShop = () => UI.closeAetheriumShop();
            window.buyAetheriumClickUpgrade = () => GameLogic.buyAetheriumClickUpgrade();

            window.buyMiner = (i) => GameLogic.buyMiner(i);
            // NEW BRIDGES
            window.switchMainTab = (t) => UI.switchMainTab(t);
            window.buyClickSkill = (i) => GameLogic.buyClickSkill(i);
            window.tryUnlockIce = () => GameLogic.tryUnlockIce(1e12); // Bridge for new world
            
            window.openBotSkills = (i) => GameLogic.openBotSkills(i);
            window.closeBotSkills = () => UI.closeBotSkills();

            // NEW BRIDGES 2
            window.openAchievements = () => UI.openAchievements();
            window.closeAchievements = () => UI.closeAchievements();
            
            // NEW BRIDGES 3 (Pets)
            window.openPetShop = () => UI.openPetShop();
            window.closePetShop = () => UI.closePetShop();
            
            // NEW BRIDGES 4 (Exchange)
            window.openExchange = () => UI.openExchange();
            window.closeExchange = () => UI.closeExchange();

            window.devSkip = () => DevTools.devSkip();
            window.devSpawnBubble = () => DevTools.devSpawnBubble();
            window.devAddFabric = () => DevTools.devAddFabric();
            window.devAddTrophies = () => DevTools.devAddTrophies();
            window.devAddSilk = () => DevTools.devAddSilk();
            window.devForceArtifact = () => DevTools.devForceArtifact();
            window.devJump100 = () => DevTools.devJump100();
            // CHANGED: Update bridge name
            window.devSetDepth399 = () => DevTools.devSetDepth399();

            // ADDED: Volume global
            window.updateVolume = (val) => {
                const v = val / 100;
                GameLogic.state.settings.volume = v;
                AudioController.setVolume(v);
                document.getElementById('vol-display').innerText = val;
            };

            // MAKE GAMELOGIC GLOBAL FOR HTML BUTTONS
            window.GameLogic = GameLogic;
            window.AudioController = AudioController; // Expose Audio
            window.App = App; // Expose App for Login buttons

            // CHANGED: DO NOT START GAME IMMEDIATELY
            // Just init UI elements, but wait for login
        },

        // NEW: Handle Login
        handleLogin: function() {
            const name = document.getElementById('login-username').value.trim();
            if(!name) { alert("Bitte Namen eingeben!"); return; }
            
            if(localStorage.getItem('DeepDigSave_' + name)) {
                GameLogic.username = name;
                this.startLoadingSequence();
            } else {
                alert("Profil nicht gefunden! Bitte 'NEU' wählen.");
            }
        },

        // NEW: Handle Create
        handleCreate: function() {
            const name = document.getElementById('login-username').value.trim();
            if(!name) { alert("Bitte Namen eingeben!"); return; }
            
            if(localStorage.getItem('DeepDigSave_' + name)) {
                alert("Profil existiert bereits! Bitte 'LOGIN' wählen.");
            } else {
                GameLogic.username = name;
                GameLogic.avatar.name = name; // Sync name
                this.startLoadingSequence();
            }
        },

        // NEW: Loading Animation Sequence
        startLoadingSequence: function() {
            // UI Switch
            document.getElementById('login-form-container').style.display = 'none';
            document.getElementById('loading-anim').style.display = 'flex';
            
            // Wait 4 seconds
            setTimeout(() => {
                this.startGame();
            }, 4000);
        },

        startGame: function() {
            // Hide Overlay
            document.getElementById('login-overlay').style.display = 'none';

            // Start logic
            // LOAD SAVE GAME
            if(GameLogic.loadGame()) {
                console.log("Save loaded successfully");
            } else {
                console.log("New Game Started");
                GameLogic.saveGame(); // Create initial save
            }

            // Sync Player Name in UI if needed
            document.getElementById('player-name-input').value = GameLogic.avatar.name || GameLogic.username;

            GameLogic.initWorldState();
            GameLogic.checkWorldUnlock();
            
            // Initial render of lists
            UI.renderMinerList();
            UI.renderClickSkills(); // Init this too

            // Restore event theme
            if(GameLogic.state.activeEvent === 'xmas') {
                document.body.classList.add('theme-xmas');
                const t = document.getElementById('xmas-toggle');
                if(t) t.classList.add('active');
                const shopBtn = document.getElementById('event-shop-btn');
                if(shopBtn) shopBtn.style.display = 'flex';
            }

            UI.update();
            
            // Click Listener
            if(UI.wrapper) {
                UI.wrapper.addEventListener('click', (e) => {
                    const rect = UI.canvas.getBoundingClientRect();
                    GameLogic.hitBlock(e.clientX - rect.left, e.clientY - rect.top);
                });
            }
            
            // AUTO SAVE INTERVAL
            setInterval(() => {
                GameLogic.saveGame();
            }, 30000);

            this.startLoops();
        },

        // CHANGED: Logout with Animation
        logout: function() {
            GameLogic.saveGame(); // Save progress first
            
            // Show Overlay & Animation
            const overlay = document.getElementById('logout-overlay');
            if(overlay) {
                // Close other modals first to be clean
                document.querySelectorAll('.modal-overlay').forEach(el => el.style.display = 'none');
                overlay.style.display = 'flex';
                
                // Wait for animation (4s) then reload
                setTimeout(() => {
                    location.reload(); 
                }, 4000);
            } else {
                // Fallback if overlay missing
                location.reload();
            }
        },

        startLoops: function() {
            // Render Loop
            const rLoop = () => { UI.renderLoop(); requestAnimationFrame(rLoop); };
            requestAnimationFrame(rLoop);

            // Logic Loop
            setInterval(() => {
                // Check bubbles
                GameLogic.checkBubbleSpawn();

                // --- NEW: SAFETY CHECK FOR EVENT WIN ---
                // If we somehow passed depth 400 in Christmas world and didn't trigger win
                if (GameLogic.state.activeWorld === 'christmas' && GameLogic.state.christmas.depth > 400 && !GameLogic.state.eventsCompleted.christmas) {
                    // Force complete
                    GameLogic.completeChristmasEvent();
                }
                
                // AUTO-FIX MISSING SKILLS OBJECT (Backward Compatibility)
                let act = GameLogic.getActive();
                if(act && act.miners) {
                    act.miners.forEach(m => {
                        if(m.level > 0 && !m.skills) m.skills = { dps: 0, cost: 0, synergy: 0 };
                    });
                }

                let totalDPS = GameLogic.calculateDPS();
                if (totalDPS > 0) {
                    let dmg = totalDPS / 10;
                    let rx = Math.random() * 280 + 20; let ry = Math.random() * 280 + 20;
                    if (GameLogic.state.settings.animations) GameLogic.hitBlock(rx, ry, dmg, true);
                    else {
                        let act = GameLogic.getActive();
                        act.currentHp -= dmg;
                        if(act.currentHp <= 0) GameLogic.breakBlock();
                        UI.update();
                    }
                }
            }, 100);
        }
    };
    
    // Start
    document.addEventListener("DOMContentLoaded", () => {
        updateDevModeUI();
        App.init();
    });
