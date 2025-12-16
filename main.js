import { GameLogic } from './logic.js';
import { UI } from './ui.js';
import { State, Avatar } from './state.js'; 
import { Worlds } from './data.js'; // <--- ADD THIS LINE
import { AudioController } from './audio.js';
import { DebugConsole } from './debug.js';

// --- THE APP OBJECT ---
// We reconstruct the App object here so the Login Screen buttons work
const App = {
    handleLogin: function() {
        const nameInput = document.getElementById('login-username');
        const name = nameInput.value.trim();
        if(!name) { alert("Bitte Namen eingeben!"); return; }
        
        if(localStorage.getItem('DeepDigSave_' + name)) {
            State.username = name;
            this.startLoadingSequence();
        } else {
            alert("Profil nicht gefunden! Bitte 'NEU' wählen.");
        }
    },

    handleCreate: function() {
        const nameInput = document.getElementById('login-username');
        const name = nameInput.value.trim();
        if(!name) { alert("Bitte Namen eingeben!"); return; }
        
        if(localStorage.getItem('DeepDigSave_' + name)) {
            alert("Profil existiert bereits! Bitte 'LOGIN' wählen.");
        } else {
            State.username = name;
            Avatar.name = name; // Sync name using imported Avatar
            this.startLoadingSequence();
        }
    },

    startLoadingSequence: function() {
        document.getElementById('login-form-container').style.display = 'none';
        document.getElementById('loading-anim').style.display = 'flex';
        
        // Wait 2 seconds (reduced from 4 for testing) then start
        setTimeout(() => {
            this.startGame();
        }, 2000);
    },

    startGame: function() {
        document.getElementById('login-overlay').style.display = 'none';

        // 1. Load Save
        if(GameLogic.loadGame()) {
            console.log("Save loaded.");
        } else {
            GameLogic.saveGame(); // Create initial save
        }

        // 2. Sync Player Name UI
        const nameInput = document.getElementById('player-name-input');
        if(nameInput) nameInput.value = Avatar.name || State.username;

        // 3. Initialize UI & Audio
        // We pass GameLogic to UI here so UI buttons work!
        UI.init(GameLogic); 
        AudioController.init();
        DebugConsole.init();

        // 4. Initial Renders
        UI.generateBlockTexture();
        UI.renderMinerList();
        UI.updateActiveMiners();
        
        // Restore event theme if needed
        if(State.activeEvent === 'xmas') {
            document.body.classList.add('theme-xmas');
            const t = document.getElementById('xmas-toggle');
            if(t) t.classList.add('active');
            const shopBtn = document.getElementById('event-shop-btn');
            if(shopBtn) shopBtn.style.display = 'flex';
        }

        UI.update();
        
        // 5. Start Loops
        requestAnimationFrame(renderLoop);
        // Clear any existing intervals just in case
        if(window.logicInterval) clearInterval(window.logicInterval);
        window.logicInterval = setInterval(logicLoop, 100);
        
        // Auto Save every 30s
        setInterval(() => GameLogic.saveGame(), 30000);
    },

    logout: function() {
        GameLogic.saveGame();
        const overlay = document.getElementById('logout-overlay');
        if(overlay) {
            document.querySelectorAll('.modal-overlay').forEach(el => el.style.display = 'none');
            overlay.style.display = 'flex';
            setTimeout(() => location.reload(), 2000);
        } else {
            location.reload();
        }
    }
};

// --- GLOBAL BRIDGE (CRITICAL!) ---
// This exposes your modules to the HTML "onclick" events.
window.App = App;
window.GameLogic = GameLogic;
window.UI = UI;
window.AudioController = AudioController;

// FIX: Expose Data and State to Window so UI.js can find them
window.State = State;
window.Avatar = Avatar;
window.Worlds = Worlds;

// Bridge Helper Functions (Mappings from your old game.js)
window.buyMiner = (i) => GameLogic.buyMiner(i);
window.travelTo = (w) => GameLogic.travelTo(w);
window.buyPickUpgrade = () => GameLogic.buyPickUpgrade(); // Missing before?
window.buyTNT = () => GameLogic.buyTNT(); // Missing before?
window.buyPotionStrength = () => GameLogic.buyPotionStrength(); // Missing before?
window.buyPotionMiner = () => GameLogic.buyPotionMiner(); // Missing before?
window.buyPotionOverdrive = () => GameLogic.buyPotionOverdrive(); // Missing before?

window.openMobileMenu = () => UI.openMobileMenu();
window.closeMobileMenu = () => UI.closeMobileMenu();

window.openPlayerCard = () => UI.openPlayerCard();
window.closePlayerCard = () => UI.closePlayerCard();
window.updateName = () => UI.updateName();
window.switchTab = (t) => UI.switchTab(t);
window.buyOrEquip = (i) => UI.buyOrEquip(i);

window.openSettings = () => UI.openSettings();
window.closeSettings = () => UI.closeSettings();
window.togglePerformance = () => UI.togglePerformance();
window.updateVolume = (val) => {
    const v = val / 100;
    State.settings.volume = v;
    AudioController.setVolume(v);
    const volDisp = document.getElementById('vol-display');
    if(volDisp) volDisp.innerText = val;
};

window.openEventCenter = () => UI.openEventCenter();
window.closeEventCenter = () => UI.closeEventCenter();
window.openEventShop = () => UI.openEventShop();
window.closeEventShop = () => UI.closeEventShop();
window.toggleEvent = (ev) => GameLogic.toggleEvent(ev); // Fixed mapping

window.openWorldTravel = () => UI.openWorldTravel();
window.closeWorldTravel = () => UI.closeWorldTravel();
window.tryUnlockForest = () => GameLogic.tryUnlockForest(1e12);
window.tryUnlockDesert = () => GameLogic.tryUnlockDesert(1e12);
window.tryUnlockIce = () => GameLogic.tryUnlockIce(1e12);

window.openPrestige = () => UI.openPrestige();
window.closePrestige = () => UI.closePrestige();
window.doPrestige = () => GameLogic.doPrestige();

window.openAetheriumShop = () => UI.openAetheriumShop();
window.closeAetheriumShop = () => UI.closeAetheriumShop();
window.buyAetheriumClickUpgrade = () => GameLogic.buyAetheriumClickUpgrade();

window.switchMainTab = (t) => UI.switchMainTab(t);
window.buyClickSkill = (i) => GameLogic.buyClickSkill(i);

window.openBotSkills = (i) => GameLogic.openBotSkills(i);
window.closeBotSkills = () => UI.closeBotSkills();

window.openAchievements = () => UI.openAchievements();
window.closeAchievements = () => UI.closeAchievements();

window.openPetShop = () => UI.openPetShop();
window.closePetShop = () => UI.closePetShop();

window.openExchange = () => UI.openExchange();
window.closeExchange = () => UI.closeExchange();

// Dev Tool Bridges
window.devSkip = () => { State[State.activeWorld].depth += 100; GameLogic.breakBlock(); };
window.devSetDepth399 = () => { State[State.activeWorld].depth = 399; UI.update(); };
window.devAddFabric = () => { State.fabric += 100; UI.update(); };
window.devAddSilk = () => { State.silk += 100; UI.update(); };
window.devAddTrophies = () => { State.trophies += 50; UI.update(); };
window.devForceArtifact = () => { State.forceNextArtifactDrop = true; };
window.devJump100 = () => { State[State.activeWorld].depth += 100; GameLogic.breakBlock(); };
window.devSpawnBubble = () => { UI.spawnBubbleElement(() => GameLogic.clickBubble()); };


// --- LOOPS ---
function renderLoop() {
    UI.renderLoop();
    requestAnimationFrame(renderLoop);
}

function logicLoop() {
    // Check Bubble
    if (Date.now() > State.nextBubbleTime) {
        // Simple logic for bubble spawn check if needed
        // State.nextBubbleTime = ...
    }

    const dps = GameLogic.calculateDPS();
    if(dps > 0) {
        GameLogic.hitBlock(0, 0, dps/10, true);
    }

}
/* --- FINALER, KONSOLIDIERTER MOBILE SWITCHER (main.js) --- */

// Hole die Navigationsleiste für Animationen
const mobileNav = document.getElementById('mobile-bottom-nav');

// FIX: Hide navigation bar immediately on load (so it's not visible on login screen)
if (mobileNav) mobileNav.classList.add('nav-hidden');

// --- 1. UMSCHALT-LOGIK (window.appSwitchTab) ---
window.appSwitchTab = function(tab) {
    // 1. Visuelles Feedback (Aktiven Button markieren)
    document.querySelectorAll('.mobile-nav-item').forEach(el => el.classList.remove('active'));
    const activeBtn = document.getElementById('nav-' + tab);
    if(activeBtn) activeBtn.classList.add('active');

    // 2. Container
    const left = document.getElementById('left-col');
    const right = document.getElementById('right-col');
    
    // 3. Modals schließen (wichtig beim Wechsel von 'menu')
    if(window.closeSettings) window.closeSettings();
    // HIER ÄNDERN: Statt closeWorldTravel() schliessen wir NUR das neue Menü
    if(window.closeMobileMenu) window.closeMobileMenu(); 

    // 4. Logic
    if (tab === 'menu') {
        // KORREKTUR: Öffne das Gitter-Menü, NICHT die Settings
        if(window.openMobileMenu) window.openMobileMenu(); 
        
        // Behält die vorherige Ansicht im Hintergrund bei
        if(left.style.display !== 'none') { left.style.display = 'flex'; } else { right.style.display = 'flex'; }
        return; 
    }
    
    // Wir schließen alle anderen Modals, die wir nicht mehr brauchen.
    if(window.closeWorldTravel) window.closeWorldTravel();
    if(window.closePrestige) window.closePrestige();
    if(window.closeExchange) window.closeExchange();
    if(window.closeEventCenter) window.closeEventCenter();


    if (tab === 'mine') {
        // DIG TAB
        left.style.display = 'flex';
        right.style.display = 'none';
    } 
    else if (tab === 'miners' || tab === 'skills') {
        // CREW / SKILLS TABS
        left.style.display = 'none';
        right.style.display = 'flex';

        // Stellt sicher, dass der richtige Inhalt in #right-col geladen wird
        if(window.switchMainTab) window.switchMainTab(tab); 
        
        // WICHTIG: Miner-Liste muss im miners-Tab gerendert werden
        if(tab === 'miners' && window.UI && window.UI.renderMinerList) {
             window.UI.renderMinerList();
        }
    }
};

// --- 2. PATCHES FÜR LOGIN, START UND LOGOUT ---

// Patch für App Start / Loading Sequence
const originalStartLoadingSequence = App.startLoadingSequence;
App.startLoadingSequence = function() {
    if (mobileNav) mobileNav.classList.add('nav-hidden'); // Nav ausblenden
    originalStartLoadingSequence.apply(App);
};

// Patch für Game Start (WICHTIG: Nur einmal patchen!)
const originalStartGame = App.startGame;
App.startGame = function() {
    originalStartGame.apply(App); // Führt die ursprüngliche startGame Logik aus
    
    // HIER kommt der AUFRUF der neuen Funktion
    if(window.UI && window.UI.updateMobileMenuButtons) {
        window.UI.updateMobileMenuButtons();
    }
    
    if (window.innerWidth <= 900) {
        // Navigationsleiste einblenden
        if (mobileNav) mobileNav.classList.remove('nav-hidden'); 
        // Wählt den DIG-Tab als Startansicht (reinigt die Ansicht)
        window.appSwitchTab('mine'); 
    }
};

// Patch für Logout
const originalLogout = App.logout;
App.logout = function() {
    if (mobileNav) mobileNav.classList.add('nav-hidden'); // Nav ausblenden
    originalLogout.apply(App);
};

/* --- FINAL MOBILE FIXES (Paste at the very bottom of style.css) --- */
@media (max-width: 900px) {

    /* 1. GENERAL MODAL SCALING (Fixes 'Too Big' Menus) */
    .modal-content {
        width: 95% !important;       /* Fit to screen width */
        max-width: 95% !important;   /* Never overflow width */
        max-height: 85vh !important; /* Never overflow height */
        padding: 10px !important;    /* Save space */
        overflow-y: auto !important; /* Allow scrolling if content is too tall */
        flex-direction: column !important; /* Stack everything vertically */
    }

    /* 2. PLAYER CARD FIX (The Split View Issue) */
    #player-modal .modal-content {
        height: auto !important; /* Let it grow naturally */
    }
    
    .modal-left {
        width: 100% !important;       /* Full width */
        height: auto !important;
        border-right: none !important;
        border-bottom: 2px solid #333;
        flex-direction: row !important; /* Put Avatar & Stats side-by-side */
        justify-content: space-around;
        align-items: center;
        padding-bottom: 10px !important;
    }

    /* Shrink the Avatar on Mobile */
    #avatar-preview-canvas {
        width: 80px !important;
        height: 120px !important; 
        margin: 0 !important;
    }

    /* Adjust the Name Input */
    #player-name-input {
        font-size: 14px !important;
        margin-bottom: 5px !important;
        width: 100% !important;
    }

    /* Fix the Shop Tabs */
    .shop-tabs {
        width: 100%;
        overflow-x: auto; /* Scroll sideways if tabs are too wide */
        padding-right: 0 !important;
    }
    .shop-tab {
        padding: 10px 5px !important;
        font-size: 11px !important;
        flex: none; /* Don't squish tabs */
    }
    
    /* 3. WORLD TRAVEL FIX (The Big Cards) */
    #world-modal .modal-content {
        width: 90% !important;
    }
    .world-card {
        flex-direction: column !important; /* Stack Icon/Text and Button */
        align-items: center !important;
        text-align: center !important;
        padding: 10px !important;
        gap: 10px;
    }
    .world-info { text-align: center !important; margin: 0 !important; }
    .world-icon { margin: 0 0 5px 0 !important; }
    
    /* Make Travel Buttons Full Width */
    .btn-travel, .btn-unlock {
        width: 100% !important;
        padding: 12px !important;
        font-size: 12px !important;
    }

    /* 4. MAIN MENU & SETTINGS FIX */
    #mobile-menu-buttons {
        gap: 10px !important;
    }
    .menu-btn {
        padding: 10px !important;
        min-height: 80px;
    }
    .menu-btn span {
        font-size: 20px !important;
    }
    
    /* Fix Settings Modal Width */
    #settings-modal .modal-content {
        width: 85% !important;
    }
}






