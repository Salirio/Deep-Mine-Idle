import { Worlds } from './data.js';

function createWorldState(config) {
    return {
        unlocked: false, 
        gold: 0, prestige: 0, prestigeCount: 0,
        depth: 1, maxDepth: 1, pickLevel: 0, 
        currentHp: 1, maxHp: 1,
        matIndex: 0, loopCount: 0, bossKills: 0,
        miners: config.miners.map(() => ({ level: 0, skills: { dps: 0, cost: 0, synergy: 0 } })),
        minerUpgrades: config.miners.map(() => 0),
        clickSkillLevels: [0, 0, 0],
        clickUpgrade: 0,
        costs: { tnt: 50, str: 100, min: 250, od: 1000 },
        buffs: { str: 0, min: 0, od: 0 },
        wasTouchedByPlayer: false
    };
}

export const State = {
    activeWorld: 'mine',
    prevWorld: 'mine',
    username: null,
    
    // Currency
    fabric: 0, trophies: 0, silk: 0, snowflakes: 0,

    // Progression
    eventsCompleted: { christmas: false },
    winSequenceActive: false,
    artifactsFound: [],
    stats: { totalClicks: 0, totalGold: 0, blocksBroken: 0, maxCombo: 0, startTime: Date.now() },
    achievementLevels: { depth: 0, gold: 0, clicks: 0, boss: 0, prestige: 0 },
    
    ownedPets: [], activePet: null,

    combo: 0, comboMult: 1, lastClickTime: 0,
    activeEvent: null, forceNextArtifactDrop: false,
    
    // FIX: Hinzugefügt für Bubble Loop
    nextBubbleTime: Date.now() + 60000, 
    
    settings: { animations: true, volume: 0.3 },

    lastBgMatIndex: -1, impactX: null, impactY: null, 
    isBoss: false, isLucky: false, cracks: [],
    
    mine: createWorldState(Worlds.mine),
    forest: createWorldState(Worlds.forest),
    desert: createWorldState(Worlds.desert),
    ice: createWorldState(Worlds.ice),
    christmas: createWorldState(Worlds.christmas)
};

State.mine.unlocked = true;
State.christmas.unlocked = true;
State.christmas.currentHp = 50; State.christmas.maxHp = 50;

export const Avatar = {
    name: "Spieler 1",
    equipped: { hat: 'none', glasses: 'none', body: 'basic_grey', legs: 'basic_jeans', wings: 'none' },
    unlocked: ['none', 'basic_grey', 'basic_jeans']
};
