/**
 * AETHER-CONFIG — Spatial Configuration Panel
 * Particle Engine • 3D Tilt • Key Validation • Vanish Exit
 * 
 * @module AetherConfig
 * @version 1.0.0
 */

const { ipcRenderer, shell } = require('electron');

// ═══════════════════════════════════════════════════════════════
// 1. INTERACTION ENGINE (Dynamic Click-Through)
// Allows global 3D tilt tracking without blocking background clicks
// ═══════════════════════════════════════════════════════════════

function setupInteraction() {
    const panel = document.querySelector('.config-panel');
    if (!panel) return;

    panel.addEventListener('mouseenter', () => {
        ipcRenderer.send('set-ignore-mouse-events', false);
    });

    panel.addEventListener('mouseleave', () => {
        ipcRenderer.send('set-ignore-mouse-events', true, { forward: true });
    });
}
setupInteraction();

// ═══════════════════════════════════════════════════════════════
// 2. 3D TILT (LERP-Smoothed Spatial Movement)
// ═══════════════════════════════════════════════════════════════

const dom = {
    panel:              document.getElementById('configPanel'),
    groqKeysContainer:  document.getElementById('groqKeysContainer'),
    keyCountSelector:   document.getElementById('keyCountSelector'),
    tavilyKey:          document.getElementById('tavilyKey'),
    tavilyGroup:        document.getElementById('tavilyGroup'),
    toggleTavily:       document.getElementById('toggleTavily'),
    skipTavily:         document.getElementById('skipTavily'),
    activateBtn:        document.getElementById('activateBtn'),
    closeBtn:           document.getElementById('closeBtn'),
    statusLine:         document.getElementById('statusLine'),
    canvas:             document.getElementById('configParticles'),
    groqLink:           document.getElementById('groqLink'),
    tavilyLink:         document.getElementById('tavilyLink'),
    segUltra:           document.getElementById('segUltra'),
    segEco:             document.getElementById('segEco'),
    segSlider:          document.getElementById('segSlider'),
    perfHint:           document.getElementById('perfHint')
};

let currentKeyCount = 1;

/**
 * Dynamically renders Groq API key input fields.
 */
function renderGroqInputs(count, existingKeys = []) {
    currentKeyCount = count;
    dom.groqKeysContainer.innerHTML = '';
    
    for (let i = 0; i < count; i++) {
        const wrapper = document.createElement('div');
        wrapper.className = 'input-wrapper groq-input-wrapper';
        wrapper.style.animationDelay = `${i * 50}ms`;
        
        const input = document.createElement('input');
        input.type = 'password';
        input.className = 'groq-key-input';
        input.placeholder = i === 0 ? 'Primary Key (gsk_...)' : `Backup Key #${i+1}`;
        input.value = existingKeys[i] || '';
        if (isValidGroqKey(input.value)) input.classList.add('valid');
        
        const toggle = document.createElement('button');
        toggle.className = 'toggle-vis';
        toggle.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
        
        setupToggle(toggle, input);
        
        wrapper.appendChild(input);
        wrapper.appendChild(toggle);
        dom.groqKeysContainer.appendChild(wrapper);

        // Add live validation
        input.addEventListener('input', () => {
            input.classList.remove('valid', 'invalid');
            if (input.value.length > 5) {
                input.classList.add(isValidGroqKey(input.value) ? 'valid' : 'invalid');
            }
        });
    }
}

function setupKeyCountSelector() {
    const buttons = dom.keyCountSelector.querySelectorAll('.count-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const count = parseInt(btn.dataset.count);
            const currentValues = Array.from(document.querySelectorAll('.groq-key-input')).map(input => input.value);
            renderGroqInputs(count, currentValues);
        });
    });
}

// ═══════════════════════════════════════════════════════════════
// 1. MICRO PARTICLE FIELD (Canvas Background)
// ═══════════════════════════════════════════════════════════════

/**
 * Lightweight particle system for the config panel background.
 * Fewer particles than main app to keep CPU minimal.
 */
const ConfigParticles = (() => {
    const ctx = dom.canvas.getContext('2d');
    let particles = [];

    /** @param {number} count - Number of particles to spawn */
    function init(count = 20) {
        resize();
        particles = [];
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * dom.canvas.width,
                y: Math.random() * dom.canvas.height,
                r: Math.random() * 1.2 + 0.3,
                vx: (Math.random() - 0.5) * 0.15,
                vy: (Math.random() - 0.5) * 0.1,
                opacity: Math.random() * 0.3 + 0.05
            });
        }
        loop();
    }

    function resize() {
        dom.canvas.width = window.innerWidth;
        dom.canvas.height = window.innerHeight;
    }

    function loop() {
        ctx.clearRect(0, 0, dom.canvas.width, dom.canvas.height);
        for (const p of particles) {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < -5) p.x = dom.canvas.width + 5;
            if (p.x > dom.canvas.width + 5) p.x = -5;
            if (p.y < -5) p.y = dom.canvas.height + 5;
            if (p.y > dom.canvas.height + 5) p.y = -5;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(180, 200, 255, ${p.opacity})`;
            ctx.fill();
        }
        requestAnimationFrame(loop);
    }

    window.addEventListener('resize', resize);
    return { init };
})();

// ═══════════════════════════════════════════════════════════════
// 2. 3D TILT (Spatial Hover)
// ═══════════════════════════════════════════════════════════════

function attachPanelTilt(el, intensity = 5) {
    let targetX = 0, targetY = 0;
    let currentX = 0, currentY = 0;
    const lerp = 0.1; // Smoothing factor (0.1 = smooth, 1.0 = instant)

    window.addEventListener('mousemove', (e) => {
        targetX = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
        targetY = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
    });

    function update() {
        // Interpolate towards target
        currentX += (targetX - currentX) * lerp;
        currentY += (targetY - currentY) * lerp;
        
        el.style.transform = `perspective(1000px) rotateY(${currentX * intensity}deg) rotateX(${-currentY * intensity}deg)`;
        requestAnimationFrame(update);
    }
    update();
}

// ═══════════════════════════════════════════════════════════════
// 3. VISIBILITY TOGGLES
// ═══════════════════════════════════════════════════════════════

/**
 * Toggles password/text visibility for an input field.
 * @param {HTMLButtonElement} btn - Toggle button
 * @param {HTMLInputElement} input - Target input field
 */
function setupToggle(btn, input) {
    btn.addEventListener('click', () => {
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.style.color = show ? 'var(--accent)' : '';
    });
}

// ═══════════════════════════════════════════════════════════════
// 4. VALIDATION
// ═══════════════════════════════════════════════════════════════

let tavilySkipped = false;
let perfMode = 'ultra';

/**
 * Updates the segmented control UI and hint text.
 * @param {'ultra'|'eco'} mode - Selected performance mode
 */
function setPerfMode(mode) {
    perfMode = mode;
    const isUltra = mode === 'ultra';
    
    dom.segUltra.classList.toggle('active', isUltra);
    dom.segEco.classList.toggle('active', !isUltra);
    dom.segSlider.classList.toggle('right', !isUltra);
    
    dom.perfHint.textContent = isUltra 
        ? "All micro-animations and GPU effects enabled" 
        : "Lite visual effects for maximum smoothness on CPU";
    
    // Preview effect on the config panel itself
    if (mode === 'eco') {
        dom.panel.style.backdropFilter = 'none';
        dom.panel.style.background = 'rgba(20, 20, 20, 0.85)';
    } else {
        dom.panel.style.backdropFilter = '';
        dom.panel.style.background = '';
    }
}

/**
 * Validates a Groq API key format.
 * @param {string} key - The key to validate
 * @returns {boolean} True if valid format
 */
function isValidGroqKey(key) {
    return key.trim().startsWith('gsk_') && key.trim().length > 20;
}

/**
 * Sets status message with animation.
 * @param {string} msg - Message text
 * @param {'error'|'success'|''} type - Message type for styling
 */
function setStatus(msg, type = '') {
    dom.statusLine.textContent = msg;
    dom.statusLine.className = `status-line ${type}`;
}

/**
 * Validates the Groq key by making a lightweight API call.
 * @param {string} key - Groq API key to test
 * @returns {Promise<boolean>} True if key is valid
 */
async function validateGroqKey(key) {
    try {
        const res = await fetch('https://api.groq.com/openai/v1/models', {
            headers: { 'Authorization': `Bearer ${key}` }
        });
        return res.ok;
    } catch {
        return false;
    }
}

// ═══════════════════════════════════════════════════════════════
// 5. VANISH EXIT SEQUENCE
// ═══════════════════════════════════════════════════════════════

/**
 * Plays the cinematic vanish animation and closes the window.
 * Panel scales up slightly, blurs, and floats away before IPC close.
 */
function vanishAndClose() {
    dom.panel.classList.add('vanishing');
    setTimeout(() => {
        ipcRenderer.send('config-finished');
    }, 700);
}

// ═══════════════════════════════════════════════════════════════
// 6. EVENT HANDLERS
// ═══════════════════════════════════════════════════════════════

// Performance Mode Toggles
dom.segUltra.addEventListener('click', () => setPerfMode('ultra'));
dom.segEco.addEventListener('click', () => setPerfMode('eco'));

// Toggle visibility for Tavily (Groq is dynamic now)
setupToggle(dom.toggleTavily, dom.tavilyKey);

// Skip Tavily
dom.skipTavily.addEventListener('click', () => {
    tavilySkipped = true;
    dom.tavilyGroup.classList.add('disabled');
    dom.tavilyKey.value = '';
});

// Live validation glow on Groq key
dom.groqKey.addEventListener('input', () => {
    const val = dom.groqKey.value.trim();
    dom.groqKey.classList.remove('valid', 'invalid');
    if (val.length > 5) {
        dom.groqKey.classList.add(val.startsWith('gsk_') ? 'valid' : 'invalid');
    }
    setStatus('');
});

// Close button
dom.closeBtn.addEventListener('click', () => {
    ipcRenderer.send('config-close');
});

// External links — open in default browser
dom.groqLink.addEventListener('click', (e) => {
    e.preventDefault();
    shell.openExternal('https://console.groq.com/keys');
});

dom.tavilyLink.addEventListener('click', (e) => {
    e.preventDefault();
    shell.openExternal('https://app.tavily.com/home');
});

// ═══════════════════════════════════════════════════════════════
// ACTIVATE — Main Logic
// ═══════════════════════════════════════════════════════════════

dom.activateBtn.addEventListener('click', async () => {
    const groqInputs = Array.from(document.querySelectorAll('.groq-key-input'));
    const groqKeys = groqInputs.map(i => i.value.trim()).filter(val => val.length > 0);
    const tavilyKey = tavilySkipped ? '' : dom.tavilyKey.value.trim();

    // Validate at least one key exists
    if (groqKeys.length === 0) {
        setStatus('Please provide at least one Groq API key.', 'error');
        return;
    }

    // Validate format for all provided keys
    for (let i = 0; i < groqKeys.length; i++) {
        if (!isValidGroqKey(groqKeys[i])) {
            groqInputs[i].classList.add('invalid');
            setStatus(`Groq Key #${i+1} format is invalid.`, 'error');
            return;
        }
    }

    // Loading state
    dom.activateBtn.classList.add('loading');
    setStatus('Validating Primary Key...', '');

    // Validate the first (primary) key against API
    const valid = await validateGroqKey(groqKeys[0]);

    if (!valid) {
        dom.activateBtn.classList.remove('loading');
        groqInputs[0].classList.add('invalid');
        setStatus('Primary Groq key rejected by API.', 'error');
        return;
    }

    // Success
    groqInputs[0].classList.add('valid');
    dom.activateBtn.classList.remove('loading');
    dom.activateBtn.classList.add('success');
    dom.activateBtn.querySelector('.btn-text').textContent = '✓ Activated';
    setStatus('Configuration successful. Launching...', 'success');

    // Send keys and performance mode to main process
    ipcRenderer.send('setup-finished', { 
        groqKeys, 
        perfMode 
    });

    // Store Tavily key if provided
    if (tavilyKey) {
        ipcRenderer.send('save-tavily-key', tavilyKey);
    }

    // Vanish after brief delay for visual confirmation
    setTimeout(() => vanishAndClose(), 1000);
});

// Enter key shortcut
dom.groqKey.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') dom.activateBtn.click();
});

dom.tavilyKey.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') dom.activateBtn.click();
});

// ═══════════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════════

/** Initializes the panel with existing configuration if available. */
async function boot() {
    ConfigParticles.init(20);
    attachPanelTilt(dom.panel, 3);
    setupKeyCountSelector();
    
    try {
        const config = await ipcRenderer.invoke('get-env-key');
        if (config) {
            let groqKeys = [];
            
            // Handle legacy single-key string OR new array
            if (Array.isArray(config.GROQ_API_KEYS)) {
                groqKeys = config.GROQ_API_KEYS;
            } else if (config.GROQ_API_KEY) {
                groqKeys = [config.GROQ_API_KEY];
            }

            const count = Math.max(1, groqKeys.length);
            
            // Update UI selector
            const buttons = dom.keyCountSelector.querySelectorAll('.count-btn');
            buttons.forEach(btn => {
                if (parseInt(btn.dataset.count) === count) btn.classList.add('active');
                else btn.classList.remove('active');
            });

            renderGroqInputs(count, groqKeys);

            if (config.TAVILY_API_KEY) {
                dom.tavilyKey.value = config.TAVILY_API_KEY;
                dom.tavilyKey.classList.add('valid');
            }
            if (config.PERF_MODE) {
                setPerfMode(config.PERF_MODE);
            }
        } else {
            renderGroqInputs(1);
        }
    } catch(e) { 
        console.error('Config load failed:', e); 
        renderGroqInputs(1);
    }
}

boot();

console.log('⚙️ Aether-Config v1.0 — Online.');
