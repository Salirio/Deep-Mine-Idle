import { GameLogic } from './logic.js';
import { State } from './state.js';
import { UI } from './ui.js';

export const DebugConsole = {
    isVisible: false,
    
    init: function() {
        const div = document.createElement('div');
        div.id = 'debug-console';
        div.style.cssText = `
            display: none; position: fixed; top: 10px; left: 10px; 
            width: 320px; background: rgba(0,0,0,0.95); border: 2px solid #00ff00;
            color: #00ff00; font-family: monospace; z-index: 99999;
            padding: 10px; border-radius: 8px; box-shadow: 0 0 20px rgba(0,255,0,0.2);
        `;
        
        div.innerHTML = `
            <div style="border-bottom:1px solid #00ff00; padding-bottom:5px; margin-bottom:10px; display:flex; justify-content:space-between;">
                <strong>DEV CONSOLE v1.1</strong>
                <span style="cursor:pointer;" onclick="document.getElementById('debug-console').style.display='none'">[X]</span>
            </div>
            <div id="debug-log" style="height:100px; overflow-y:auto; border:1px solid #333; margin-bottom:10px; font-size:10px; padding:5px; color:#ccc; font-family:monospace;">
                > System ready...
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:5px;">
                <button class="dbg-btn" id="dbg-gold">💰 +1 Bio Gold</button>
                <button class="dbg-btn" id="dbg-skip">⏩ Skip 100 Lvl</button>
                <button class="dbg-btn" id="dbg-fabric">🧶 +100 Fabric</button>
                <button class="dbg-btn" id="dbg-silk">🧣 +100 Silk</button>
                <button class="dbg-btn" id="dbg-snow">❄️ +100 Snow</button>
                <button class="dbg-btn" id="dbg-trophy">🏆 +100 Trophy</button>
                <button class="dbg-btn" id="dbg-art" style="grid-column: span 2; border-color:#f1c40f; color:#f1c40f;">🏺 FORCE ARTIFACT</button>
                <button class="dbg-btn" id="dbg-boss">☠️ Spawn Boss</button>
                <button class="dbg-btn" id="dbg-res">❤️ Reset HP</button>
            </div>
        `;
        document.body.appendChild(div);

        const style = document.createElement('style');
        style.innerHTML = `.dbg-btn { background:#003300; color:#00ff00; border:1px solid #00ff00; cursor:pointer; font-size:10px; padding:8px 5px; text-align:center; } .dbg-btn:hover { background:#005500; }`;
        document.head.appendChild(style);

        // --- Event Listeners ---
        
        // Gold
        document.getElementById('dbg-gold').onclick = () => { 
            this.log("Added 1 Bio Gold"); 
            State[State.activeWorld].gold += 1e12; 
            UI.update(); 
        };

        // Skip Levels
        document.getElementById('dbg-skip').onclick = () => { 
            this.log("Warping 100 levels..."); 
            State[State.activeWorld].depth += 100; 
            GameLogic.breakBlock(); 
        };

        // Fabric
        document.getElementById('dbg-fabric').onclick = () => { 
            this.log("Added 100 Fabric"); 
            State.fabric += 100; 
            UI.update(); 
        };

        // Silk
        document.getElementById('dbg-silk').onclick = () => { 
            this.log("Added 100 Silk"); 
            State.silk += 100; 
            UI.update(); 
        };

        // Snowflakes
        document.getElementById('dbg-snow').onclick = () => { 
            this.log("Added 100 Snowflakes"); 
            State.snowflakes += 100; 
            UI.update(); 
        };

        // Trophies
        document.getElementById('dbg-trophy').onclick = () => { 
            this.log("Added 100 Trophies"); 
            State.trophies += 100; 
            UI.update(); 
        };

        // Force Artifact
        document.getElementById('dbg-art').onclick = () => { 
            this.log("NEXT BLOCK = ARTIFACT!"); 
            State.forceNextArtifactDrop = true; 
            UI.spawnFloater(window.innerWidth/2, window.innerHeight/2, "DEV: ARTIFACT READY", "#f1c40f");
        };

        // Boss
        document.getElementById('dbg-boss').onclick = () => { 
            this.log("Boss spawned"); 
            State.isBoss = true; 
            UI.generateBlockTexture(); 
            UI.update(); 
        };

        // Reset HP
        document.getElementById('dbg-res').onclick = () => { 
            this.log("HP Reset to 1"); 
            State[State.activeWorld].currentHp = 1; 
            UI.update(); 
        };

        // Hotkey (Ctrl + Alt + D)
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'd') {
                this.toggle();
            }
        });
    },

    log: function(msg) {
        const log = document.getElementById('debug-log');
        log.innerHTML += `<div>> ${msg}</div>`;
        log.scrollTop = log.scrollHeight;
    },

    toggle: function() {
        this.isVisible = !this.isVisible;
        const el = document.getElementById('debug-console');
        el.style.display = this.isVisible ? 'block' : 'none';
    }
};
