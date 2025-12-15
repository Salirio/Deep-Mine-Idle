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
            width: 300px; background: rgba(0,0,0,0.9); border: 2px solid #00ff00;
            color: #00ff00; font-family: monospace; z-index: 99999;
            padding: 10px; border-radius: 8px; box-shadow: 0 0 20px rgba(0,255,0,0.2);
        `;
        
        div.innerHTML = `
            <div style="border-bottom:1px solid #00ff00; padding-bottom:5px; margin-bottom:10px; display:flex; justify-content:space-between;">
                <strong>DEV CONSOLE v1.0</strong>
                <span style="cursor:pointer;" onclick="document.getElementById('debug-console').style.display='none'">[X]</span>
            </div>
            <div id="debug-log" style="height:100px; overflow-y:auto; border:1px solid #333; margin-bottom:10px; font-size:10px; padding:5px; color:#ccc;">
                > System ready...
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:5px;">
                <button class="dbg-btn" id="dbg-gold">Add 1 Bio Gold</button>
                <button class="dbg-btn" id="dbg-skip">Skip 100 Levels</button>
                <button class="dbg-btn" id="dbg-res">Reset HP</button>
                <button class="dbg-btn" id="dbg-boss">Spawn Boss</button>
            </div>
        `;
        document.body.appendChild(div);

        const style = document.createElement('style');
        style.innerHTML = `.dbg-btn { background:#003300; color:#00ff00; border:1px solid #00ff00; cursor:pointer; font-size:10px; padding:5px; } .dbg-btn:hover { background:#005500; }`;
        document.head.appendChild(style);

        document.getElementById('dbg-gold').onclick = () => { this.log("Rich!"); State[State.activeWorld].gold += 1e9; UI.update(); };
        document.getElementById('dbg-skip').onclick = () => { this.log("Warping..."); State[State.activeWorld].depth += 100; GameLogic.breakBlock(); };
        document.getElementById('dbg-res').onclick = () => { this.log("HP Reset"); State[State.activeWorld].currentHp = 1; UI.update(); };
        document.getElementById('dbg-boss').onclick = () => { this.log("Boss incoming"); State.isBoss = true; UI.generateBlockTexture(); UI.update(); };

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