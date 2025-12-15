// --- CONSTANTS ---
export const STAGE_LENGTH = 20;
export const MIN_ARTIFACT_DEPTH = 200;

// --- WORLDS MODULE ---
export const Worlds = {
    STAGE_LENGTH: 20,
    artifacts: [
        { id: 'compass', name: 'Alter Kompass', world: 'mine', chance: 0.002, bonus: '+5% Krit Chance', type: 'crit', val: 0.05, icon: '🧭' },
        { id: 'fossil', name: 'Dino Fossil', world: 'mine', chance: 0.001, bonus: '-10% Upgrade Kosten', type: 'cost', val: 0.9, icon: '🦖' },
        { id: 'amber_fly', name: 'Bernstein Fliege', world: 'forest', chance: 0.002, bonus: '+10% Gold', type: 'gold', val: 0.1, icon: '🪰' },
        { id: 'root_heart', name: 'Wurzel Herz', world: 'forest', chance: 0.001, bonus: '+5% DPS', type: 'dps', val: 0.05, icon: '💓' },
        { id: 'scarab_amulet', name: 'Gold Skarabäus', world: 'desert', chance: 0.002, bonus: '+10% Klick Stärke', type: 'click', val: 0.1, icon: '🪲' },
        { id: 'djinn_lamp', name: 'Magische Lampe', world: 'desert', chance: 0.001, bonus: '+1% Stoff Chance', type: 'fabric', val: 0.01, icon: '🧞' },
        { id: 'mammoth_tusk', name: 'Mammut Hauer', world: 'ice', chance: 0.002, bonus: '+20% Boss Schaden', type: 'boss', val: 0.2, icon: '🐘' },
        { id: 'frozen_flame', name: 'Ewiges Eis', world: 'ice', chance: 0.001, bonus: '+10% Combo Zeit', type: 'combo', val: 100, icon: '🔥' },
        { id: 'christmas_star', name: 'Weihnachtsstern', world: 'christmas', chance: 1.0, bonus: '+50% GLOBAL DPS', type: 'dps', val: 0.5, icon: '🌟' }
    ],
    achievements: [
        { id: 'depth', name: "Höhlenforscher", desc: "Erreiche Tiefe", baseGoal: 10, scale: 2.5, baseReward: 5, icon: '🌱', type: 'depth' },
        { id: 'gold', name: "Sparschwein", desc: "Besitze Gold", baseGoal: 1000, scale: 10, baseReward: 5, icon: '💰', type: 'gold' },
        { id: 'clicks', name: "Finger Sport", desc: "Manuelle Klicks", baseGoal: 100, scale: 2, baseReward: 3, icon: '👆', type: 'clicks' },
        { id: 'boss', name: "Boss Killer", desc: "Besiege Bosse", baseGoal: 1, scale: 2, baseReward: 10, icon: '☠️', type: 'boss' },
        { id: 'prestige', name: "Zeitwanderer", desc: "Anzahl Aufstiege", baseGoal: 1, scale: 1, baseReward: 20, icon: '💎', type: 'prestige' } 
    ],
    pets: [
        { id: 'rock_slime', name: "Fels Schleim", bonus: "+10% Gold", cost: 10, type: 'gold', val: 0.10, icon: '🦠' },
        { id: 'bat_bot', name: "Fleder-Drohne", bonus: "+5% DPS", cost: 25, type: 'dps', val: 0.05, icon: '🦇' },
        { id: 'gold_fairy', name: "Gold Fee", bonus: "+25% Gold", cost: 50, type: 'gold', val: 0.25, icon: '🧚' },
        { id: 'magma_cube', name: "Magma Würfel", bonus: "+15% DPS", cost: 100, type: 'dps', val: 0.15, icon: '🔥' },
        { id: 'diamond_golem', name: "Mini Golem", bonus: "+2% Krit Chance", cost: 250, type: 'crit', val: 0.02, icon: '🤖' },
        { id: 'void_wisp', name: "Leeren Geist", bonus: "+50% Gold", cost: 500, type: 'gold', val: 0.50, icon: '👻' },
        { id: 'sun_phoenix', name: "Solar Phönix", bonus: "+50% DPS", cost: 1000, type: 'dps', val: 0.50, icon: '🦅' }
    ],
    mine: {
        config: { name: "DEEP DIG", currency: "Gold", prestigeIcon: "💎", themeColor: "#2c3e50", bgTint: [0,0,0] },
        materials: [
            { name: "Erde", color: [93, 64, 55], speck: [62, 39, 35], hp: 1, val: 1 },
            { name: "Stein", color: [127, 140, 141], speck: [149, 165, 166], hp: 3, val: 6 },
            { name: "Kohle", color: [80, 80, 80], speck: [10, 10, 10], hp: 7, val: 20 },
            { name: "Eisen", color: [140, 140, 150], speck: [211, 84, 0], hp: 18, val: 55 },
            { name: "Gold", color: [140, 140, 150], speck: [255, 215, 0], hp: 45, val: 150 },
            { name: "Lapis", color: [44, 62, 80], speck: [0, 0, 255], hp: 110, val: 400 },
            { name: "Redstone", color: [60, 30, 30], speck: [255, 50, 50], hp: 280, val: 900 },
            { name: "Diamant", color: [30, 50, 60], speck: [0, 255, 255], hp: 750, val: 2800 },
            { name: "Smaragd", color: [30, 60, 40], speck: [46, 204, 113], hp: 2000, val: 7000 },
            { name: "Obsidian", color: [20, 20, 30], speck: [142, 68, 173], hp: 50000, val: 18000 },
            { name: "Netherit", color: [30, 20, 20], speck: [90, 40, 40], hp: 150000, val: 50000 },
            { name: "Mondstein", color: [200, 200, 210], speck: [150, 150, 160], hp: 400000, val: 100000 },
            { name: "Mars Erz", color: [180, 60, 40], speck: [120, 40, 20], hp: 1000000, val: 250000 },
            { name: "Nebula", color: [100, 20, 100], speck: [255, 0, 255], hp: 2500000, val: 600000 },
            { name: "Plasma", color: [80, 0, 80], speck: [0, 200, 255], hp: 6000000, val: 1500000 },
            { name: "Dunkle Materie", color: [10, 5, 15], speck: [60, 30, 90], hp: 15000000, val: 4000000 },
            { name: "Neutronium", color: [220, 230, 240], speck: [255, 255, 255], hp: 50000000, val: 12000000 },
            { name: "Glitch Erz", color: [0, 20, 0], speck: [0, 255, 0], hp: 200000000, val: 60000000 }
        ],
        picks: [
            { name: "Plastik Pick", power: 1, cost: 0, color: "#fff" },
            { name: "Stein Pick", power: 4, cost: 15, color: "#95a5a6" },
            { name: "Eisen Pick", power: 15, cost: 150, color: "#bdc3c7" },
            { name: "Gold Pick", power: 40, cost: 800, color: "#f1c40f" },
            { name: "Diamant Pick", power: 120, cost: 3500, color: "#00d2d3" },
            { name: "Laser Pick", power: 500, cost: 20000, color: "#e74c3c" },
            { name: "Plasma Pick", power: 2000, cost: 85000, color: "#9b59b6" },
            { name: "Antimaterie", power: 10000, cost: 800000, color: "#2c3e50" },
            { name: "Schwarzes Loch", power: 50000, cost: 9000000, color: "#000" },
            { name: "Gottes Hand", power: 500000, cost: 450000000, color: "#ffffff" }
        ],
        clickSkills: [
            { id: 'base', name: "Stein Schleifen", desc: "+10% Pick Power / Lvl", baseCost: 75, type: 'flat', val: 1, icon: '✊' },
            { id: 'crit', name: "Glücksbringer", desc: "+1% Krit Chance", baseCost: 400, type: 'percent', val: 1, max: 50, icon: '🍀' },
            { id: 'multi', name: "Titan Handschuh", desc: "+5% Klick Stärke", baseCost: 2000, type: 'multi', val: 0.05, icon: '🥊' }
        ],
        miners: [
            { name: "Mini Bot", baseCost: 25, basePower: 2, color: "#95a5a6" },
            { name: "Bohrer Drohne", baseCost: 250, basePower: 12, color: "#bdc3c7" },
            { name: "Dampf Maulwurf", baseCost: 1200, basePower: 45, color: "#d35400" },
            { name: "Cyber Einheit", baseCost: 5500, basePower: 150, color: "#2ecc71" },
            { name: "Laser Turm", baseCost: 22000, basePower: 500, color: "#e74c3c" },
            { name: "Plasma Cutter", baseCost: 95000, basePower: 1800, color: "#9b59b6" },
            { name: "Nano Schwarm", baseCost: 400000, basePower: 6000, color: "#3498db" },
            { name: "Quanten Rig", baseCost: 1800000, basePower: 25000, color: "#1abc9c" },
            { name: "Leeren Ernter", baseCost: 9000000, basePower: 100000, color: "#34495e" },
            { name: "Sternen Esser", baseCost: 45000000, basePower: 400000, color: "#f1c40f" },
            { name: "Realitäts Brecher", baseCost: 200000000, basePower: 2000000, color: "#e84393" },
            { name: "Die Singularität", baseCost: 900000000, basePower: 10000000, color: "#ffffff" },
            { name: "Chrono Brecher", baseCost: 45000000000, basePower: 80000000, color: "#00d2d3" },
            { name: "Dimensions Fresser", baseCost: 900000000000, basePower: 500000000, color: "#8e44ad" },
            { name: "Der Architekt", baseCost: 45000000000000, basePower: 5000000000, color: "#f1c40f" }
        ]
    },
    forest: {
        config: { name: "WOOD CHOP", currency: "Harz-Taler", prestigeIcon: "🧡", themeColor: "#27ae60", bgTint: [20,50,20] },
        materials: [
            { name: "Eiche", color: [139, 69, 19], speck: [101, 67, 33], hp: 1, val: 1 },
            { name: "Birke", color: [236, 240, 241], speck: [44, 62, 80], hp: 2, val: 7 },
            { name: "Fichte", color: [93, 64, 55], speck: [46, 125, 50], hp: 6, val: 22 },
            { name: "Tropenholz", color: [211, 84, 0], speck: [39, 174, 96], hp: 16, val: 60 },
            { name: "Akazie", color: [230, 126, 34], speck: [120, 120, 120], hp: 45, val: 150 },
            { name: "Schwarzeiche", color: [44, 62, 80], speck: [20, 20, 20], hp: 120, val: 350 },
            { name: "Mangrove", color: [142, 68, 173], speck: [46, 204, 113], hp: 3000, val: 800 },
            { name: "Kirschblüte", color: [255, 192, 203], speck: [231, 76, 60], hp: 8000, val: 2500 },
            { name: "Bambus", color: [46, 204, 113], speck: [39, 174, 96], hp: 20000, val: 6000 },
            { name: "Karmesin", color: [192, 57, 43], speck: [100, 0, 0], hp: 50000, val: 15000 },
            { name: "Wirrholz", color: [22, 160, 133], speck: [26, 188, 156], hp: 15000, val: 40000 },
            { name: "Mahagoni", color: [100, 30, 22], speck: [80, 20, 10], hp: 40000, val: 80000 },
            { name: "Ebenholz", color: [10, 10, 10], speck: [50, 50, 50], hp: 1000000, val: 200000 },
            { name: "Eisenholz", color: [149, 165, 166], speck: [189, 195, 199], hp: 250000, val: 500000 },
            { name: "Geisterborke", color: [200, 200, 255], speck: [255, 255, 255], hp: 6000000, val: 1200000 },
            { name: "Weltenbaum", color: [46, 204, 113], speck: [241, 196, 15], hp: 15000000, val: 3000000 },
            { name: "Sternenholz", color: [142, 68, 173], speck: [255, 255, 0], hp: 50000000, val: 10000000 },
            { name: "Glitch Holz", color: [0, 255, 0], speck: [0, 0, 0], hp: 200000000, val: 50000000 }
        ],
        picks: [
            { name: "Stein Axt", power: 1, cost: 0, color: "#95a5a6" },
            { name: "Eisen Axt", power: 4, cost: 20, color: "#bdc3c7" },
            { name: "Gold Axt", power: 15, cost: 200, color: "#f1c40f" },
            { name: "Smaragd Axt", power: 40, cost: 1000, color: "#2ecc71" },
            { name: "Obsidian Axt", power: 120, cost: 5000, color: "#8e44ad" },
            { name: "Lava Axt", power: 500, cost: 25000, color: "#e74c3c" },
            { name: "Plasma Beil", power: 2000, cost: 100000, color: "#3498db" },
            { name: "Kristall Axt", power: 10000, cost: 1000000, color: "#00d2d3" },
            { name: "Leeren Spalter", power: 50000, cost: 10000000, color: "#000" },
            { name: "Gottes Spalter", power: 500000, cost: 500000000, color: "#ffffff" }
        ],
        clickSkills: [
            { id: 'base', name: "Axt Schärfen", desc: "+10% Pick Power / Lvl", baseCost: 100, type: 'flat', val: 1, icon: '🪨' },
            { id: 'crit', name: "Präzision", desc: "+1% Krit Chance", baseCost: 500, type: 'percent', val: 1, max: 50, icon: '🎯' },
            { id: 'multi', name: "Wald Zorn", desc: "+5% Klick Stärke", baseCost: 2500, type: 'multi', val: 0.05, icon: '🌲' }
        ],
        miners: [
            { name: "Holzfäller Bot", baseCost: 30, basePower: 2, color: "#d35400" },
            { name: "Säge Drohne", baseCost: 280, basePower: 12, color: "#95a5a6" },
            { name: "Dampf Säger", baseCost: 1400, basePower: 45, color: "#7f8c8d" },
            { name: "Häcksler 3000", baseCost: 6000, basePower: 150, color: "#c0392b" },
            { name: "Laser Schneider", baseCost: 25000, basePower: 500, color: "#e74c3c" },
            { name: "Plasma Säge", baseCost: 100000, basePower: 1800, color: "#3498db" },
            { name: "Nano Termiten", baseCost: 450000, basePower: 6000, color: "#2ecc71" },
            { name: "Quanten Axt", baseCost: 2000000, basePower: 25000, color: "#9b59b6" },
            { name: "Baum Fresser", baseCost: 10000000, basePower: 100000, color: "#2c3e50" },
            { name: "Wald Vernichter", baseCost: 50000000, basePower: 400000, color: "#e67e22" },
            { name: "Realitäts Säger", baseCost: 250000000, basePower: 2000000, color: "#f1c40f" },
            { name: "Der Kahlschlag", baseCost: 1000000000, basePower: 10000000, color: "#000000" },
            { name: "Wurzel Titan", baseCost: 50000000000, basePower: 80000000, color: "#2ecc71" },
            { name: "Gaia's Zorn", baseCost: 1000000000000, basePower: 500000000, color: "#d35400" },
            { name: "Der Holzwurm", baseCost: 50000000000000, basePower: 5000000000, color: "#e74c3c" }
        ]
    },
    desert: {
        config: { name: "SAND STORM", currency: "Skarabäen", prestigeIcon: "🏺", themeColor: "#e67e22", bgTint: [60, 40, 10] },
        materials: [
            { name: "Sand", color: [230, 200, 100], speck: [200, 180, 80], hp: 1, val: 1 },
            { name: "Trockenbus", color: [100, 80, 40], speck: [80, 60, 30], hp: 2, val: 8 },
            { name: "Roter Sand", color: [200, 100, 60], speck: [180, 80, 50], hp: 6, val: 24 },
            { name: "Sandstein", color: [220, 210, 180], speck: [200, 190, 160], hp: 16, val: 65 },
            { name: "Kaktus", color: [46, 204, 113], speck: [30, 150, 80], hp: 45, val: 150 },
            { name: "Palmenholz", color: [160, 82, 45], speck: [139, 69, 19], hp: 120, val: 350 },
            { name: "Lehm", color: [180, 140, 100], speck: [160, 120, 80], hp: 300, val: 800 },
            { name: "Skarabäus", color: [40, 40, 80], speck: [255, 215, 0], hp: 800, val: 2500 },
            { name: "Wüstenrose", color: [200, 100, 100], speck: [255, 200, 200], hp: 20000, val: 6000 },
            { name: "Antikes Gold", color: [255, 200, 0], speck: [255, 255, 100], hp: 50000, val: 15000 },
            { name: "Hieroglyphen", color: [240, 230, 140], speck: [0, 0, 0], hp: 150000, val: 40000 },
            { name: "Lapislazuli", color: [20, 50, 180], speck: [0, 0, 255], hp: 400000, val: 80000 },
            { name: "Mumienleinen", color: [240, 240, 220], speck: [200, 200, 180], hp: 1000000, val: 200000 },
            { name: "Sonnenstein", color: [255, 140, 0], speck: [255, 255, 0], hp: 2500000, val: 500000 },
            { name: "Djinn Lampe", color: [150, 50, 200], speck: [255, 215, 0], hp: 6000000, val: 1200000 },
            { name: "Oasen Herz", color: [0, 255, 255], speck: [255, 255, 255], hp: 15000000, val: 3000000 },
            { name: "Pharao Fluch", color: [50, 0, 50], speck: [255, 0, 0], hp: 50000000, val: 10000000 },
            { name: "Zeit Sand", color: [255, 255, 200], speck: [180, 160, 100], hp: 200000000, val: 50000000 }
        ],
        picks: [
            { name: "Plastik Schippe", power: 1, cost: 0, color: "#fff" },
            { name: "Holz Schaufel", power: 4, cost: 20, color: "#d35400" },
            { name: "Eisen Schaufel", power: 15, cost: 200, color: "#bdc3c7" },
            { name: "Gold Schaufel", power: 40, cost: 1000, color: "#f1c40f" },
            { name: "Diamant Schaufel", power: 120, cost: 5000, color: "#00d2d3" },
            { name: "Smaragd Schaufel", power: 500, cost: 25000, color: "#2ecc71" },
            { name: "Rubin Schaufel", power: 2000, cost: 100000, color: "#e74c3c" },
            { name: "Obsidian Schaufel", power: 10000, cost: 1000000, color: "#2c3e50" },
            { name: "Anubis Zepter", power: 50000, cost: 10000000, color: "#8e44ad" },
            { name: "Horus Auge", power: 500000, cost: 500000000, color: "#f1c40f" }
        ],
        clickSkills: [
            { id: 'base', name: "Sand Handschuh", desc: "+10% Pick Power / Lvl", baseCost: 100, type: 'flat', val: 1, icon: '🧤' },
            { id: 'crit', name: "Wüsten Fokus", desc: "+1% Krit Chance", baseCost: 500, type: 'percent', val: 1, max: 50, icon: '👁️' },
            { id: 'multi', name: "Sonnen Schlag", desc: "+5% Klick Stärke", baseCost: 2500, type: 'multi', val: 0.05, icon: '☀️' }
        ],
        miners: [
            { name: "Sand Käfer", baseCost: 35, basePower: 2, color: "#f1c40f" },
            { name: "Schaufel Bot", baseCost: 290, basePower: 12, color: "#bdc3c7" },
            { name: "Wüsten Fuchs", baseCost: 1450, basePower: 45, color: "#e67e22" },
            { name: "Kaktus Häcksler", baseCost: 6000, basePower: 150, color: "#2ecc71" },
            { name: "Skorpion Drohne", baseCost: 25000, basePower: 500, color: "#c0392b" },
            { name: "Sandwurm", baseCost: 100000, basePower: 1800, color: "#d35400" },
            { name: "Pyramiden Bauer", baseCost: 450000, basePower: 6000, color: "#f1c40f" },
            { name: "Sphinx Wächter", baseCost: 2000000, basePower: 25000, color: "#f39c12" },
            { name: "Oasen Gärtner", baseCost: 10000000, basePower: 100000, color: "#3498db" },
            { name: "Djinn Beschwörer", baseCost: 50000000, basePower: 400000, color: "#9b59b6" },
            { name: "Sandsturm Erzeuger", baseCost: 250000000, basePower: 2000000, color: "#7f8c8d" },
            { name: "Sonnen Gott", baseCost: 1000000000, basePower: 10000000, color: "#ffffff" },
            { name: "Anubis Avatar", baseCost: 50000000000, basePower: 80000000, color: "#2c3e50" },
            { name: "Ra's Streitwagen", baseCost: 1000000000000, basePower: 500000000, color: "#f1c40f" },
            { name: "Ewige Sanduhr", baseCost: 50000000000000, basePower: 5000000000, color: "#e74c3c" }
        ]
    },
    ice: {
        config: { name: "FROZEN CORE", currency: "Eissplitter", prestigeIcon: "❄️", themeColor: "#3498db", bgTint: [20, 40, 60] },
        materials: [
            { name: "Schnee", color: [236, 240, 241], speck: [189, 195, 199], hp: 1, val: 1 },
            { name: "Eis", color: [129, 236, 236], speck: [0, 206, 201], hp: 2, val: 9 },
            { name: "Packeis", color: [116, 185, 255], speck: [9, 132, 227], hp: 6, val: 26 },
            { name: "Froststein", color: [178, 190, 195], speck: [99, 110, 114], hp: 16, val: 70 },
            { name: "Saphir", color: [9, 132, 227], speck: [255, 255, 255], hp: 45, val: 150 },
            { name: "Blaueis", color: [0, 90, 180], speck: [0, 50, 100], hp: 120, val: 350 },
            { name: "Kryonit", color: [0, 206, 201], speck: [85, 239, 196], hp: 300, val: 800 },
            { name: "Trockeneis", color: [223, 230, 233], speck: [178, 190, 195], hp: 800, val: 2500 },
            { name: "Gletscher", color: [162, 155, 254], speck: [108, 92, 231], hp: 20000, val: 6000 },
            { name: "Polarlicht Erz", color: [85, 239, 196], speck: [162, 155, 254], hp: 50000, val: 15000 },
            { name: "Permafrost", color: [45, 52, 54], speck: [116, 185, 255], hp: 150000, val: 40000 },
            { name: "Nullpunkt", color: [0, 0, 50], speck: [0, 255, 255], hp: 400000, val: 80000 },
            { name: "Eisriesen Herz", color: [100, 0, 255], speck: [255, 255, 255], hp: 1000000, val: 200000 },
            { name: "Kometenkern", color: [100, 100, 120], speck: [255, 100, 100], hp: 2500000, val: 500000 },
            { name: "Gefrierbrand", color: [255, 50, 50], speck: [0, 200, 255], hp: 6000000, val: 1200000 },
            { name: "Zeitkristall", color: [255, 255, 200], speck: [255, 255, 255], hp: 15000000, val: 3000000 },
            { name: "Entropie", color: [20, 20, 20], speck: [100, 100, 255], hp: 50000000, val: 10000000 },
            { name: "Absoluter Nullpunkt", color: [0, 0, 0], speck: [255, 255, 255], hp: 200000000, val: 50000000 }
        ],
        picks: [
            { name: "Eiskratzer", power: 1, cost: 0, color: "#fff" },
            { name: "Stahl Pickel", power: 4, cost: 20, color: "#bdc3c7" },
            { name: "Titan Lanze", power: 15, cost: 200, color: "#34495e" },
            { name: "Thermo Bohrer", power: 40, cost: 1000, color: "#e74c3c" },
            { name: "Saphir Spitze", power: 120, cost: 5000, color: "#0984e3" },
            { name: "Plasma Cutter", power: 500, cost: 25000, color: "#d63031" },
            { name: "Laser Strahl", power: 2000, cost: 100000, color: "#fd79a8" },
            { name: "Molekular Trenner", power: 10000, cost: 1000000, color: "#00cec9" },
            { name: "Schwerkraft Hammer", power: 50000, cost: 10000000, color: "#6c5ce7" },
            { name: "Supernova", power: 500000, cost: 500000000, color: "#fab1a0" }
        ],
        clickSkills: [
            { id: 'base', name: "Eis Spikes", desc: "+10% Pick Power / Lvl", baseCost: 100, type: 'flat', val: 1, icon: '🧊' },
            { id: 'crit', name: "Schwachstelle", desc: "+1% Krit Chance", baseCost: 500, type: 'percent', val: 1, max: 50, icon: '💥' },
            { id: 'multi', name: "Kettenreaktion", desc: "+5% Klick Stärke", baseCost: 2500, type: 'multi', val: 0.05, icon: '⛓️' }
        ],
        miners: [
            { name: "Schneepflug", baseCost: 40, basePower: 2, color: "#ecf0f1" },
            { name: "Eisbohrer", baseCost: 290, basePower: 12, color: "#95a5a6" },
            { name: "Yeti Bot", baseCost: 1450, basePower: 45, color: "#74b9ff" },
            { name: "Frost Fräse", baseCost: 6000, basePower: 150, color: "#0984e3" },
            { name: "Kryo Laser", baseCost: 25000, basePower: 500, color: "#81ecec" },
            { name: "Mammut Panzer", baseCost: 100000, basePower: 1800, color: "#636e72" },
            { name: "Schmelz Drohne", baseCost: 450000, basePower: 6000, color: "#ff7675" },
            { name: "Gletscher Brecher", baseCost: 2000000, basePower: 25000, color: "#00b894" },
            { name: "Polar Station", baseCost: 10000000, basePower: 100000, color: "#2d3436" },
            { name: "Eissturm Gen.", baseCost: 50000000, basePower: 400000, color: "#a29bfe" },
            { name: "Sub-Zero Einheit", baseCost: 250000000, basePower: 2000000, color: "#00cec9" },
            { name: "Der Eisberg", baseCost: 1000000000, basePower: 10000000, color: "#dfe6e9" },
            { name: "Nordlicht Weber", baseCost: 50000000000, basePower: 80000000, color: "#fd79a8" },
            { name: "Kelvin Null", baseCost: 1000000000000, basePower: 500000000, color: "#2c3e50" },
            { name: "Frost Gott", baseCost: 50000000000000, basePower: 5000000000, color: "#74b9ff" }
        ]
    },
    christmas: {
        config: { name: "SANTA'S WORKSHOP", currency: "Geschenkpapier", prestigeIcon: "🎁", themeColor: "#c0392b", bgTint: [100, 20, 20] },
        materials: [
            { name: "Geschenk Rot", color: [231, 76, 60], speck: [255, 255, 255], hp: 10, val: 50 },
            { name: "Geschenk Grün", color: [46, 204, 113], speck: [255, 0, 0], hp: 50, val: 200 },
            { name: "Geschenk Blau", color: [52, 152, 219], speck: [255, 255, 255], hp: 200, val: 1000 },
            { name: "Geschenk Gold", color: [241, 196, 15], speck: [192, 57, 43], hp: 1000, val: 5000 },
            { name: "Rentier Futter", color: [211, 84, 0], speck: [243, 156, 18], hp: 5000, val: 20000 },
            { name: "Nordpol Eis", color: [189, 195, 199], speck: [236, 240, 241], hp: 20000, val: 100000 },
            { name: "Weihnachtsmann Sack", color: [142, 68, 173], speck: [255, 215, 0], hp: 100000, val: 500000 },
            { name: "Knecht Ruprecht", color: [44, 62, 80], speck: [0, 0, 0], hp: 500000, val: 2000000 },
            { name: "Zuckerstange", color: [255, 255, 255], speck: [255, 0, 0], hp: 2000000, val: 10000000 },
            { name: "Lebkuchenhaus", color: [211, 84, 0], speck: [46, 204, 113], hp: 10000000, val: 50000000 }
        ],
        picks: [
            { name: "Zuckerstange", power: 10, cost: 0, color: "#fff" },
            { name: "Elf Hammer", power: 50, cost: 500, color: "#2ecc71" },
            { name: "Rentier Horn", power: 200, cost: 5000, color: "#d35400" },
            { name: "Santa's Sack", power: 1000, cost: 50000, color: "#c0392b" },
            { name: "Sternen Stab", power: 5000, cost: 500000, color: "#f1c40f" }
        ],
        clickSkills: [
            { id: 'base', name: "Geschenkband", desc: "+10 Klick Basis", baseCost: 200, type: 'flat', val: 10, icon: '🎀' },
            { id: 'crit', name: "Festtags Stimmung", desc: "+2% Krit", baseCost: 1000, type: 'percent', val: 2, max: 25, icon: '🕯️' },
            { id: 'multi', name: "Weihnachtswunder", desc: "+10% Klick Stärke", baseCost: 5000, type: 'multi', val: 0.1, icon: '🌟' }
        ],
        miners: [
            { name: "Hilfs Elf", baseCost: 100, basePower: 5, color: "#2ecc71" },
            { name: "Spielzeug Macher", baseCost: 1000, basePower: 25, color: "#f1c40f" },
            { name: "Rentier", baseCost: 5000, basePower: 100, color: "#d35400" },
            { name: "Schlitten", baseCost: 25000, basePower: 500, color: "#c0392b" },
            { name: "Nussknacker", baseCost: 100000, basePower: 2000, color: "#e74c3c" },
            { name: "Mrs. Claus", baseCost: 500000, basePower: 10000, color: "#e84393" },
            { name: "Santa Bot", baseCost: 2500000, basePower: 50000, color: "#fff" },
            { name: "Geschenk Fabrik", baseCost: 15000000, basePower: 250000, color: "#8e44ad" },
            { name: "Nordlicht Antrieb", baseCost: 75000000, basePower: 1000000, color: "#00d2d3" },
            { name: "Rudolphs Geist", baseCost: 500000000, basePower: 5000000, color: "#fab1a0" }
        ]
    },
    cosmetics: {
        hat: [
            { id: 'none', name: 'Kein Hut', cost: 0 },
            { id: 'cap_blue', name: 'Blaue Kappe', cost: 5, color: '#3498db', type: 'cap' },
            { id: 'cap_red', name: 'Rote Kappe', cost: 5, color: '#e74c3c', type: 'cap' },
            { id: 'tophat', name: 'Zylinder', cost: 25, color: '#111', type: 'tophat' },
            { id: 'miner_helmet', name: 'Bauhelm', cost: 50, color: '#f1c40f', type: 'helmet' },
            { id: 'crown', name: 'Krone', cost: 200, color: '#f1c40f', type: 'crown' },
            { id: 'santa_hat', name: 'Weihnachtsmütze', cost: 50, currency: 'snowflakes', type: 'santa' },
            { id: 'elf_hat', name: 'Elfen Mütze', cost: 20, currency: 'silk', color: '#2ecc71', type: 'elf' }, 
            { id: 'reindeer_antlers', name: 'Geweih', cost: 50, currency: 'silk', color: '#8d6e63', type: 'antlers' }
        ],
        glasses: [
            { id: 'none', name: 'Keine', cost: 0 },
            { id: 'sun_black', name: 'Sonnenbrille', cost: 10, color: '#111', type: 'shades' },
            { id: 'visor', name: 'Cyclops Visier', cost: 40, color: '#e74c3c', type: 'visor' },
            { id: 'nerd', name: 'Nerd Brille', cost: 15, color: '#333', type: 'glasses' }
        ],
        body: [
            { id: 'basic_grey', name: 'Graues Shirt', cost: 0, color: '#7f8c8d' },
            { id: 'baggy_white', name: 'Oversized Shirt', cost: 15, color: '#ecf0f1', type: 'baggy' }, 
            { id: 'hoodie_black', name: 'Street Hoodie', cost: 30, color: '#2c3e50', type: 'hoodie' }, 
            { id: 'lumberjack', name: 'Holzfäller Hemd', cost: 20, color: '#c0392b', type: 'baggy' }, 
            { id: 'blue_shirt', name: 'Blaues Shirt', cost: 5, color: '#3498db' },
            { id: 'red_shirt', name: 'Rotes Shirt', cost: 5, color: '#e74c3c' },
            { id: 'miner_vest', name: 'Warnweste', cost: 20, color: '#e67e22' },
            { id: 'suit', name: 'Anzug', cost: 60, color: '#2c3e50' },
            { id: 'gold_armor', name: 'Gold Rüstung', cost: 500, color: '#f1c40f' },
            { id: 'santa_suit', name: 'Weihnachtsmann Anzug', cost: 100, currency: 'snowflakes', color: '#c0392b' }
        ],
        legs: [
            { id: 'basic_jeans', name: 'Jeans', cost: 0, color: '#2980b9' },
            { id: 'baggy_denim', name: 'Baggy Jeans', cost: 15, color: '#85c1e9', type: 'baggy' }, 
            { id: 'cargos_green', name: 'Cargo Hose', cost: 25, color: '#556b2f', type: 'cargo' }, 
            { id: 'shorts', name: 'Shorts', cost: 5, color: '#e67e22' },
            { id: 'dark_pants', name: 'Dunkle Hose', cost: 15, color: '#2c3e50' },
            { id: 'gold_pants', name: 'Gold Hose', cost: 250, color: '#f1c40f' }
        ],
        wings: [
            { id: 'none', name: 'Keine', cost: 0 },
            { id: 'angel', name: 'Engelsflügel', cost: 300, color: '#fff', type: 'angel' },
            { id: 'demon', name: 'Dämonenflügel', cost: 300, color: '#c0392b', type: 'demon' },
            { id: 'jetpack', name: 'Jetpack', cost: 1000, color: '#95a5a6', type: 'jetpack' }
        ]
    }
};
