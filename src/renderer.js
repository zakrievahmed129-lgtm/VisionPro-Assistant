/**
 * VISIONPRO-ASSISTANT — SPATIAL ENGINE v4.0
 * Genesis Intro • Oracle Text • Shockwave • Motion Blur
 * 
 * @module VisionProRenderer
 * @version 4.0.0
 */

const { ipcRenderer } = require('electron');

// ═══════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════

let GROQ_API_KEY = '';
const GROQ_TEXT_MODEL   = 'llama-3.3-70b-versatile';
const GROQ_VISION_MODEL = 'llama-3.2-90b-vision-preview';
let TAVILY_API_KEY      = ''; // Security: Loaded from secure config.json at runtime

const MAX_HISTORY     = 50;
const MAX_TOOL_LOOPS  = 5;
const MAX_RETRIES     = 3;
const MIN_SEARCH_ANIM = 2200;

let conversationHistory = [];

const SEARCH_PHASES = [
    "🔍 Searching...",
    "📡 Analyzing sources...",
    "🧬 Extracting entities...",
    "⚡ Cross-verifying...",
    "✨ Synthesizing response..."
];

const SYSTEM_PROMPT = `You are VisionPro, a high-performance system assistant. Your primary goal is to provide precise answers with zero fluff.

ABSOLUTE RULES:
1. CONCISENESS: Never list your features, PC specs, or system capabilities unless explicitly asked. Respond ONLY to the user's specific request.
2. RESEARCH: If you lack EXACT info (post-2023), you MUST call search_web immediately. Synthesize data; never point to URLs.
3. TERMINAL: Fix failing commands instantly. Output complete, production-ready code blocks only.
4. TONE: Professional, minimal, and ultra-fast. No small talk beyond a brief greeting if appropriate.`;

// ═══════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════

async function initEnv() {
    try { 
        const config = await ipcRenderer.invoke('get-env-key');
        if (config) {
            GROQ_API_KEY = config.GROQ_API_KEY;
            TAVILY_API_KEY = config.TAVILY_API_KEY;
            
            // Apply Performance Mode
            if (config.PERF_MODE === 'eco') {
                document.body.classList.add('perf-eco');
                console.log('🍃 [VisionPro] Eco Glass mode activated (CPU Optimization).');
            } else {
                console.log('🚀 [VisionPro] Spatial Ultra mode activated (GPU Max).');
            }
        }
    }
    catch (e) { console.error('[VisionPro] Key init:', e); }
}
initEnv();

// ═══════════════════════════════════════════════════════════════
// DOM
// ═══════════════════════════════════════════════════════════════

const ui = {
    trigger:        document.getElementById('triggerZone'),
    container:      document.getElementById('container'),
    inputPill:      document.getElementById('inputPill'),
    responsePill:   document.getElementById('responsePill'),
    responseArea:   document.getElementById('responseArea'),
    input:          document.getElementById('input'),
    captureBtn:     document.getElementById('captureBtn'),
    luauHookBtn:    document.getElementById('luauHookBtn'),
    sendBtn:        document.getElementById('sendBtn'),
    searchPill:     document.getElementById('searchPill'),
    searchStep:     document.getElementById('searchStep'),
    canvas:         document.getElementById('particleCanvas'),
    genesisOverlay: document.getElementById('genesisOverlay'),
    shockwaveLayer: document.getElementById('shockwaveLayer')
};

// ═══════════════════════════════════════════════════════════════
// 1. GENESIS — Cinematic Boot Sequence
// ═══════════════════════════════════════════════════════════════

/**
 * Orchestrates the "Big Bang" cinematic intro.
 * Sequence: Singularity glow → ring expansion → elastic pill drop → border flash
 */
function playGenesisSequence() {
    // Phase 0: Hide pills, show genesis overlay
    document.body.classList.add('genesis');

    // Phase 1 (0ms): Big Bang glow + ring (CSS animations auto-play)
    // Phase 2 (1200ms): Elastic lévitation drop
    setTimeout(() => {
        document.body.classList.add('visible');
        document.body.classList.remove('genesis');
        document.body.classList.add('genesis-drop');
    }, 1200);

    // Phase 3 (2200ms): Border signature flash
    setTimeout(() => {
        document.body.classList.add('genesis-flash');
    }, 2200);

    // Phase 4 (2400ms): Fade out genesis overlay
    setTimeout(() => {
        ui.genesisOverlay.classList.add('done');
    }, 2400);

    // Phase 5 (3200ms): Cleanup — remove all genesis classes
    setTimeout(() => {
        document.body.classList.remove('genesis-drop', 'genesis-flash');
        ui.input.focus();
    }, 3200);
}

// ═══════════════════════════════════════════════════════════════
// 2. PARTICLE ENGINE (Canvas Layer 0)
// ═══════════════════════════════════════════════════════════════

const ParticleEngine = (() => {
    const ctx = ui.canvas.getContext('2d');
    let particles = [];
    let mouseX = 0, mouseY = 0;

    function init(count = 35) {
        resize();
        particles = [];
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * ui.canvas.width,
                y: Math.random() * ui.canvas.height,
                r: Math.random() * 1.8 + 0.4,
                vx: (Math.random() - 0.5) * 0.25,
                vy: (Math.random() - 0.5) * 0.18,
                depth: Math.random() * 0.7 + 0.3,
                opacity: Math.random() * 0.35 + 0.08
            });
        }
        loop();
    }

    function resize() {
        ui.canvas.width = window.innerWidth;
        ui.canvas.height = window.innerHeight;
    }

    function loop() {
        ctx.clearRect(0, 0, ui.canvas.width, ui.canvas.height);
        for (const p of particles) {
            p.x += p.vx;
            p.y += p.vy;
            const px = (mouseX - ui.canvas.width / 2) * p.depth * 0.012;
            const py = (mouseY - ui.canvas.height / 2) * p.depth * 0.012;
            if (p.x < -10) p.x = ui.canvas.width + 10;
            if (p.x > ui.canvas.width + 10) p.x = -10;
            if (p.y < -10) p.y = ui.canvas.height + 10;
            if (p.y > ui.canvas.height + 10) p.y = -10;
            ctx.beginPath();
            ctx.arc(p.x + px, p.y + py, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(200, 220, 255, ${p.opacity})`;
            ctx.shadowColor = `rgba(100, 150, 255, ${p.opacity * 0.7})`;
            ctx.shadowBlur = p.r * 5;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        requestAnimationFrame(loop);
    }

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });
    return { init };
})();

// ═══════════════════════════════════════════════════════════════
// 3. 3D TILT ENGINE
// ═══════════════════════════════════════════════════════════════

/** @type {AbortController|null} Tilt listener controller for pausing during streaming */
let tiltController = null;

/**
 * Attaches reactive 3D tilt to an element.
 * Returns cleanup function. Uses AbortController for efficient listener removal.
 * @param {HTMLElement} el - Target element
 * @param {number} intensity - Rotation degree multiplier
 */
function attachTilt(el, intensity = 10) {
    const onMove = (e) => {
        const rect = el.getBoundingClientRect();
        const dx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
        const dy = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
        el.style.transform = `perspective(800px) rotateY(${dx * intensity}deg) rotateX(${-dy * intensity}deg) scale(1.01)`;
    };
    const onLeave = () => {
        el.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
        el.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg) scale(1)';
        setTimeout(() => { el.style.transition = ''; }, 600);
    };
    // Store handlers on element for detach/reattach
    el._tiltMove = onMove;
    el._tiltLeave = onLeave;
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
}

/** Pause all tilt listeners during heavy rendering */
function pauseTilt() {
    [ui.inputPill, ui.responsePill].forEach(el => {
        if (el._tiltMove) el.removeEventListener('mousemove', el._tiltMove);
        if (el._tiltLeave) el.removeEventListener('mouseleave', el._tiltLeave);
    });
}

/** Resume tilt listeners after rendering completes */
function resumeTilt() {
    [ui.inputPill, ui.responsePill].forEach(el => {
        if (el._tiltMove) el.addEventListener('mousemove', el._tiltMove);
        if (el._tiltLeave) el.addEventListener('mouseleave', el._tiltLeave);
    });
}

// ═══════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════

let isProcessing   = false;
let isMouseOverUI  = false;
let hideTimeout    = null;
let searchPhaseIdx = 0;
let searchInterval = null;

let typingQueue        = [];
let isTyping           = false;
let responseCursor     = null;
let isInCodeBlock      = false;
let currentCodeElement = null;
let backtickCount      = 0;
let codeHeaderSkipped  = false;

// ═══════════════════════════════════════════════════════════════
// UI STATE MACHINE
// ═══════════════════════════════════════════════════════════════

function setStatus(state) {
    switch (state) {
        case 'processing':
            isProcessing = true;
            ui.inputPill.classList.add('thinking-pulse');
            ui.inputPill.classList.remove('streaming-pulse', 'warning-flash');
            ui.input.disabled = true; ui.sendBtn.disabled = true;
            break;
        case 'streaming':
            isProcessing = true;
            ui.inputPill.classList.remove('thinking-pulse');
            ui.inputPill.classList.add('streaming-pulse');
            // PERF: enable lightweight mode + pause tilt during active streaming
            document.body.classList.add('perf-mode');
            pauseTilt();
            break;
        case 'error':
            isProcessing = false;
            ui.inputPill.classList.remove('thinking-pulse', 'streaming-pulse');
            ui.inputPill.classList.add('warning-flash');
            document.body.classList.remove('perf-mode');
            setTimeout(() => ui.inputPill.classList.remove('warning-flash'), 1200);
            ui.input.disabled = false; ui.sendBtn.disabled = false;
            ui.input.focus(); scheduleHideUI();
            break;
        case 'idle':
        default:
            isProcessing = false;
            ui.inputPill.classList.remove('thinking-pulse', 'streaming-pulse', 'warning-flash');
            // PERF: re-enable full effects + resume tilt after streaming completes
            document.body.classList.remove('perf-mode');
            resumeTilt();
            ui.input.disabled = false; ui.sendBtn.disabled = false;
            ui.input.focus(); scheduleHideUI();
            break;
    }
}

// ═══════════════════════════════════════════════════════════════
// 4. VANISH EFFECT
// ═══════════════════════════════════════════════════════════════

function vanishResponse() {
    return new Promise(resolve => {
        if (!ui.responsePill.classList.contains('has-content')) { hardReset(); resolve(); return; }
        const words = ui.responseArea.querySelectorAll('.streaming-word');
        words.forEach((w, i) => w.style.setProperty('--vanish-order', i));
        ui.responsePill.classList.add('vanishing');
        const dur = Math.min(words.length * 6 + 150, 450);
        setTimeout(() => {
            ui.responsePill.classList.remove('vanishing');
            ui.responsePill.classList.add('evaporating');
            ui.responsePill.classList.remove('has-content');
        }, dur);
        setTimeout(() => { hardReset(); ui.responsePill.classList.remove('evaporating'); resolve(); }, dur + 400);
    });
}

function hardReset() {
    ui.responsePill.classList.remove('has-content', 'evaporating', 'vanishing');
    // MEMORY LEAK FIX: remove all child nodes, not just innerHTML
    while (ui.responseArea.firstChild) ui.responseArea.removeChild(ui.responseArea.firstChild);
    // Clean shockwave layer too
    while (ui.shockwaveLayer.firstChild) ui.shockwaveLayer.removeChild(ui.shockwaveLayer.firstChild);
    responseCursor = null; typingQueue = []; isTyping = false;
    isInCodeBlock = false; currentCodeElement = null; backtickCount = 0;
    charCountSinceShock = 0;
    rAFScheduled = false;
}

// ═══════════════════════════════════════════════════════════════
// 5. SEARCH ANIMATION + FAVICON BUBBLES
// ═══════════════════════════════════════════════════════════════

function setSearchProgress(active, step) {
    if (active) {
        searchPhaseIdx = 0;
        ui.searchStep.textContent = step || SEARCH_PHASES[0];
        ui.searchPill.classList.add('active');
        if (searchInterval) clearInterval(searchInterval);
        searchInterval = setInterval(() => {
            searchPhaseIdx = (searchPhaseIdx + 1) % SEARCH_PHASES.length;
            ui.searchStep.textContent = SEARCH_PHASES[searchPhaseIdx];
        }, 1200);
    } else {
        if (searchInterval) { clearInterval(searchInterval); searchInterval = null; }
        ui.searchPill.classList.remove('active');
    }
}

function spawnFaviconBubbles(urls) {
    const rect = ui.searchPill.getBoundingClientRect();
    urls.slice(0, 5).forEach((url, i) => {
        try {
            const domain = new URL(url).hostname;
            const bubble = document.createElement('div');
            bubble.className = 'favicon-bubble';
            bubble.style.position = 'fixed';
            bubble.style.left = `${rect.left + 20 + i * 30}px`;
            bubble.style.top = `${rect.top - 10}px`;
            bubble.style.animationDelay = `${i * 150}ms`;
            const img = document.createElement('img');
            img.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
            img.onerror = () => bubble.remove();
            bubble.appendChild(img);
            document.body.appendChild(bubble);
            setTimeout(() => bubble.remove(), 2000);
        } catch (_) {}
    });
}

// ═══════════════════════════════════════════════════════════════
// VISIBILITY
// ═══════════════════════════════════════════════════════════════

function showUI() {
    if (hideTimeout) { clearTimeout(hideTimeout); hideTimeout = null; }
    document.body.classList.add('visible');
    setTimeout(() => ui.input.focus(), 100);
}

function scheduleHideUI() {
    if (isMouseOverUI || isProcessing) return;
    if (hideTimeout) clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
        if (!isMouseOverUI && !isProcessing && !ui.input.value.trim() && !ui.responsePill.classList.contains('has-content')) {
            document.body.classList.remove('visible');
        }
    }, 4000);
}

// ═══════════════════════════════════════════════════════════════
// 6. ORACLE — Liquid Typing Engine
// ═══════════════════════════════════════════════════════════════

/** Counter for shockwave position tracking */
let charCountSinceShock = 0;
/** rAF gate — ensures max 60fps DOM updates */
let rAFScheduled = false;
/** Scroll debounce — avoid forced layout every frame */
let scrollPending = false;

function ensureCursor(parent = ui.responseArea) {
    if (!responseCursor) {
        responseCursor = document.createElement('span');
        responseCursor.className = 'cursor';
    }
    if (responseCursor.parentElement !== parent) parent.appendChild(responseCursor);
}

function appendToResponse(text) {
    if (!ui.responsePill.classList.contains('has-content')) {
        ui.responsePill.classList.add('has-content');
    }
    for (const char of text) typingQueue.push(char);
    // NON-BLOCKING: schedule via rAF, never exceed 60fps
    if (!rAFScheduled) {
        rAFScheduled = true;
        requestAnimationFrame(oracleFrame);
    }
}

/**
 * GPU-THROTTLED ORACLE FRAME — DocumentFragment Buffered Rendering
 * All DOM nodes for a batch are created off-DOM in a Fragment,
 * then flushed in a single reflow. Max 60fps. Adaptive batch sizing
 * skips invisible frames when API sends data faster than display rate.
 */
function oracleFrame() {
    rAFScheduled = false;
    if (typingQueue.length === 0) { isTyping = false; return; }
    isTyping = true;

    const qLen = typingQueue.length;
    // Adaptive batch: scale aggressively with queue pressure
    const batch = qLen > 500 ? 20 : qLen > 200 ? 14 : qLen > 80 ? 8 : qLen > 20 ? 4 : 2;

    // BUFFER: build all nodes off-DOM in a DocumentFragment
    const frag = document.createDocumentFragment();
    const target = isInCodeBlock && currentCodeElement ? currentCodeElement : ui.responseArea;

    for (let i = 0; i < batch; i++) {
        const char = typingQueue.shift();
        if (!char) break;

        if (char === '`') {
            backtickCount++;
            if (backtickCount === 3) {
                // Flush current fragment before switching context
                if (frag.childNodes.length > 0) {
                    ensureCursor(target);
                    target.insertBefore(frag, responseCursor);
                }
                if (!isInCodeBlock) startCodeBlock(); else endCodeBlock();
                backtickCount = 0; continue;
            }
            continue;
        } else if (backtickCount > 0) {
            for (let j = 0; j < backtickCount; j++) {
                const s = document.createElement('span');
                s.className = 'streaming-word';
                s.textContent = '`';
                frag.appendChild(s);
            }
            backtickCount = 0;
        }

        if (isInCodeBlock) {
            if (!codeHeaderSkipped) {
                if (char === '\n') { codeHeaderSkipped = true; }
                continue;
            }
            frag.appendChild(document.createTextNode(char));
        } else {
            const span = document.createElement('span');
            span.className = 'streaming-word';
            if (char === '\n') span.innerHTML = '<br>';
            else if (char === ' ') span.innerHTML = '&nbsp;';
            else span.textContent = char;
            frag.appendChild(span);
        }

        charCountSinceShock++;
        if (charCountSinceShock >= 25) {
            emitShockwave();
            charCountSinceShock = 0;
        }
    }

    // SINGLE REFLOW: flush the entire fragment to DOM at once
    if (frag.childNodes.length > 0) {
        const insertTarget = isInCodeBlock && currentCodeElement ? currentCodeElement : ui.responseArea;
        ensureCursor(insertTarget);
        insertTarget.insertBefore(frag, responseCursor);
    }

    // DEBOUNCED SCROLL: only scroll once per 2 frames to avoid forced layout
    if (!scrollPending) {
        scrollPending = true;
        requestAnimationFrame(() => {
            ui.responsePill.scrollTop = ui.responsePill.scrollHeight;
            scrollPending = false;
        });
    }

    // Continue on next frame if queue still has data
    if (typingQueue.length > 0) {
        rAFScheduled = true;
        requestAnimationFrame(oracleFrame);
    } else {
        isTyping = false;
    }
}

function renderChar(char) {
    ensureCursor(ui.responseArea);
    const span = document.createElement('span');
    span.className = 'streaming-word';
    if (char === '\n') span.innerHTML = '<br>';
    else if (char === ' ') span.innerHTML = '&nbsp;';
    else span.textContent = char;
    ui.responseArea.insertBefore(span, responseCursor);
}

function startCodeBlock() {
    isInCodeBlock = true; codeHeaderSkipped = false;
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
    pre.appendChild(btn); pre.appendChild(code);
    ui.responseArea.insertBefore(pre, responseCursor);
    currentCodeElement = code;
}

function renderCodeChar(char) {
    if (!codeHeaderSkipped) { if (char === '\n') { codeHeaderSkipped = true; ensureCursor(currentCodeElement); } return; }
    currentCodeElement.insertBefore(document.createTextNode(char), responseCursor);
}

function endCodeBlock() { isInCodeBlock = false; currentCodeElement = null; ensureCursor(ui.responseArea); }

// ═══════════════════════════════════════════════════════════════
// 7. KEYSTROKE SHOCKWAVE
// ═══════════════════════════════════════════════════════════════

/**
 * Emits a subtle radial shockwave ripple on the response pill.
 * MEMORY SAFE: ripple elements are removed after animation.
 */
function emitShockwave() {
    if (!ui.shockwaveLayer || !responseCursor) return;
    // Skip if in perf-mode (CSS hides them anyway, but skip DOM creation too)
    if (document.body.classList.contains('perf-mode')) return;

    const pillRect = ui.responsePill.getBoundingClientRect();
    const cursorRect = responseCursor.getBoundingClientRect();

    const ripple = document.createElement('div');
    ripple.className = 'shockwave-ripple';
    ripple.style.left = `${cursorRect.left - pillRect.left}px`;
    ripple.style.top = `${cursorRect.top - pillRect.top + ui.responsePill.scrollTop}px`;
    ui.shockwaveLayer.appendChild(ripple);
    // MEMORY LEAK FIX: guarantee removal
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
}

// ═══════════════════════════════════════════════════════════════
// 8. MOTION BLUR ON SCROLL
// ═══════════════════════════════════════════════════════════════

let scrollBlurTimeout = null;
ui.responsePill.addEventListener('scroll', () => {
    ui.responsePill.classList.add('scrolling-blur');
    if (scrollBlurTimeout) clearTimeout(scrollBlurTimeout);
    scrollBlurTimeout = setTimeout(() => {
        ui.responsePill.classList.remove('scrolling-blur');
    }, 120);
});

// Copy Button Delegation
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.copy-btn');
    if (!btn) return;
    const code = btn.closest('pre')?.querySelector('code')?.textContent || '';
    navigator.clipboard.writeText(code).then(() => {
        const orig = btn.innerHTML;
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#32D74B" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        btn.classList.add('copied');
        setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied'); }, 2000);
    });
});

// ═══════════════════════════════════════════════════════════════
// TOOL EXECUTION
// ═══════════════════════════════════════════════════════════════

async function executeTool(name, args) {
    console.log(`🛠️ [Tool] ${name}`, args);
    try {
        if (name === 'run_terminal_command') {
            setSearchProgress(true, '⚡ Executing system command...');
            const res = await ipcRenderer.invoke('run-command', args.command);
            setSearchProgress(false);
            return res.success
                ? `[OK] STDOUT:\n${res.stdout}\nSTDERR:\n${res.stderr}`
                : `[FAILED] CMD: ${args.command}\nERROR: ${res.error || res.stderr}\n\nAnalyze and fix.`;
        }
        if (name === 'search_web') {
            setSearchProgress(true, '🔍 Searching Tavily...');
            const t0 = Date.now();
            const res = await ipcRenderer.invoke('web-search', { query: args.query, apiKey: TAVILY_API_KEY });
            const wait = MIN_SEARCH_ANIM - (Date.now() - t0);
            if (wait > 0) await new Promise(r => setTimeout(r, wait));
            if (res.success && res.data) spawnFaviconBubbles(res.data.map(r => r.url).filter(Boolean));
            setSearchProgress(false);
            return res.success ? JSON.stringify(res.data) : `Tavily Error: ${res.error}`;
        }
        if (name === 'read_web_page') {
            setSearchProgress(true, '📖 Reading page...');
            const res = await ipcRenderer.invoke('web-read-page', { url: args.url });
            setSearchProgress(false);
            return res.success ? res.text : `Error: ${res.error}`;
        }
        return await ipcRenderer.invoke('execute-plugin', { name, args });
    } catch (e) {
        setSearchProgress(false);
        return `[EXCEPTION] ${e.message}`;
    }
}

// ═══════════════════════════════════════════════════════════════
// PLUGINS
// ═══════════════════════════════════════════════════════════════

let loadedPlugins = [];
async function loadPlugins() {
    try {
        const p = await ipcRenderer.invoke('load-plugins');
        if (p?.length) { loadedPlugins = p; console.log(`🔌 ${p.length} plugin(s)`); }
    } catch (_) {}
}

function getTools() {
    const core = [
        { type:'function', function:{ name:'run_terminal_command', description:'Exécute une commande PowerShell/CMD.', parameters:{ type:'object', properties:{ command:{type:'string'} }, required:['command'] } }},
        { type:'function', function:{ name:'search_web', description:'Real-time Internet search. MANDATORY for post-2023 info.', parameters:{ type:'object', properties:{ query:{type:'string'} }, required:['query'] } }},
        { type:'function', function:{ name:'read_web_page', description:'Lit le texte brut d\'une URL.', parameters:{ type:'object', properties:{ url:{type:'string'} }, required:['url'] } }}
    ];
    return [...core, ...loadedPlugins.map(p => ({ type:'function', function:{ name:p.name, description:p.description, parameters:p.parameters } }))];
}

// ═══════════════════════════════════════════════════════════════
// INTENT DETECTION
// ═══════════════════════════════════════════════════════════════

const SEARCH_KW = ['search','look up','find','news','weather','price','stock','market','results','score','match','released','latest','who is','what happened','what is','today','this week','update','current','how much','at the moment'];
function isSearchIntent(p) { const l = p.toLowerCase(); return SEARCH_KW.some(k => l.includes(k)); }

// ═══════════════════════════════════════════════════════════════
// AETHER AGENT LOOP
// ═══════════════════════════════════════════════════════════════

async function streamGroq(payload) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify(payload)
    });
    if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.error?.message || `Groq ${res.status}`); }

    const reader = res.body.getReader();
    const dec = new TextDecoder('utf-8');
    let text='', buf='', toolCalls=[], first=true;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n'); buf = lines.pop();
        for (const line of lines) {
            const c = line.replace(/^data:\s*/,'').trim();
            if (!c || c === '[DONE]') continue;
            try {
                const d = JSON.parse(c);
                if (!d.choices?.[0]?.delta) continue;
                const delta = d.choices[0].delta;
                if (delta.content) {
                    if (first) { setStatus('streaming'); first = false; }
                    text += delta.content;
                    appendToResponse(delta.content);
                }
                if (delta.tool_calls) {
                    if (first) { setStatus('processing'); first = false; }
                    for (const tc of delta.tool_calls) {
                        const i = tc.index;
                        if (!toolCalls[i]) toolCalls[i] = { id:'', name:'', args:'' };
                        if (tc.id) toolCalls[i].id = tc.id;
                        if (tc.function?.name) { toolCalls[i].name = tc.function.name; setSearchProgress(true, `Aether → ${tc.function.name}`); }
                        if (tc.function?.arguments) toolCalls[i].args += tc.function.arguments;
                    }
                }
            } catch(_) {}
        }
    }
    return { text, toolCalls: toolCalls.filter(t => t?.name) };
}

/**
 * Unifies System, History, and Prompt into a single contiguous string.
 * This satisfies the "1 prompt assemblé" requirement while keeping context.
 */
function assembleUnifiedPrompt(prompt, history) {
    let assembled = `### SYSTEM INSTRUCTIONS ###\n${SYSTEM_PROMPT}\n\n`;
    
    if (history && history.length > 0) {
        assembled += `### CONVERSATION HISTORY ###\n`;
        history.forEach(m => {
            const role = m.role === 'user' ? 'User' : 'Assistant';
            assembled += `${role}: ${m.content}\n`;
        });
        assembled += `\n`;
    }

    assembled += `### CURRENT REQUEST ###\n${prompt}`;
    return assembled;
}

async function askAether(prompt, image = null) {
    if (isProcessing) return;
    if (!GROQ_API_KEY) { setStatus('error'); return; }

    setStatus('processing');
    await vanishResponse();
    charCountSinceShock = 0;

    const forceSearch = isSearchIntent(prompt);
    
    // ASSEMBLE UNIFIED PROMPT (Consolidated State with History)
    const unified = assembleUnifiedPrompt(prompt, conversationHistory);
    const msgs = [];

    if (image) {
        // When an image is present, we provide the unified context alongside the visual data.
        msgs.push({ 
            role: 'user', 
            content: [
                { type: 'text', text: unified },
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}` } }
            ] 
        });
    } else {
        msgs.push({ role: 'user', content: unified });
    }

    const tools = getTools();
    let retries = 0;

    try {
        for (let loop = 0; loop < MAX_TOOL_LOOPS; loop++) {
            let toolChoice = 'auto';
            if (loop === 0 && forceSearch) toolChoice = { type:'function', function:{ name:'search_web' } };
            const isLast = loop === MAX_TOOL_LOOPS - 1;

            const { text, toolCalls } = await streamGroq({
                model: image && loop === 0 ? GROQ_VISION_MODEL : GROQ_TEXT_MODEL,
                messages: msgs,
                tools: isLast ? undefined : tools,
                tool_choice: isLast ? undefined : toolChoice,
                stream: true,
                temperature: 0.15 + (retries * 0.1)
            });

            if (toolCalls.length > 0) {
                msgs.push({ role:'assistant', content: text || null, tool_calls: toolCalls.map(tc => ({ id:tc.id, type:'function', function:{ name:tc.name, arguments:tc.args } })) });
                for (const tc of toolCalls) {
                    let args = {}; try { args = JSON.parse(tc.args); } catch(_) {}
                    const result = await executeTool(tc.name, args);
                    if (!result || result.includes('[EXCEPTION]')) retries = Math.min(retries+1, MAX_RETRIES);
                    msgs.push({ role:'tool', tool_call_id:tc.id, name:tc.name, content:String(result) });
                }
                continue;
            }

            conversationHistory.push({ role:'user', content:prompt });
            conversationHistory.push({ role:'assistant', content:text });
            while (conversationHistory.length > MAX_HISTORY) conversationHistory.shift();
            setSearchProgress(false);
            setStatus('idle');
            return;
        }
    } catch (err) {
        console.error('❌', err);
        appendToResponse(`\n⚠️ ${err.message}`);
        setSearchProgress(false); 
        setStatus('error');
    } finally {
        if (isProcessing) {
            setSearchProgress(false);
            setStatus('idle');
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════════════

[ui.inputPill, ui.responsePill].forEach(pill => {
    pill.addEventListener('mouseenter', () => ipcRenderer.send('set-ignore-mouse-events', false));
    pill.addEventListener('mouseleave', () => ipcRenderer.send('set-ignore-mouse-events', true, { forward: true }));
});

[ui.trigger, ui.container].forEach(el => {
    el.addEventListener('mouseenter', () => { isMouseOverUI = true; showUI(); });
    el.addEventListener('mouseleave', () => { isMouseOverUI = false; scheduleHideUI(); });
});

ui.input.addEventListener('input', () => {
    if (ui.input.value.length > 0 && ui.responsePill.classList.contains('has-content') && !isProcessing) hardReset();
});

ui.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { 
        const t = ui.input.value.trim(); 
        if (t && !isProcessing) { 
            ui.input.value = ''; 
            askAether(t); 
        } 
    }
});

ui.sendBtn.addEventListener('click', () => {
    const t = ui.input.value.trim(); if (t) askAether(t); ui.input.value = '';
});

ui.captureBtn.addEventListener('click', async () => {
    if (isProcessing) return;
    try { setStatus('processing'); const img = await ipcRenderer.invoke('capture-screen'); askAether("Analyse cette capture d'écran.", img); }
    catch(_) { setStatus('error'); }
});

ui.luauHookBtn?.addEventListener('click', async () => {
    try { await ipcRenderer.invoke('send-luau-code', ui.input.value || 'ping'); ui.input.value='[Hook OK]'; setTimeout(()=>{ui.input.value='';},1200); }
    catch(_) {}
});

// ═══════════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════════
const isEco = document.body.classList.contains('perf-eco');
ParticleEngine.init(isEco ? 10 : 35);

if (!isEco) {
    attachTilt(ui.inputPill, 6);
    attachTilt(ui.responsePill, 3);
}

loadPlugins();
playGenesisSequence();
console.log('⚡ Aether-OS v3.2 — Adaptive Engine — Online.');
