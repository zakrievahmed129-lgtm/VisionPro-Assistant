/**
 * MINIMAL AI ASSISTANT - MAIN PROCESS
 * Stable transparent window - Vision Pro Style
 */

const { app, BrowserWindow, ipcMain, desktopCapturer, screen, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');

const CONFIG = {
  window: { width: 800, height: 700, x: 0, y: 0 },
  capture: { jpegQuality: 70, maxWidth: 1280 }
};

let mainWindow = null;
let setupWindow = null;

function getApiKey() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const content = fs.readFileSync(CONFIG_PATH, 'utf8');
      if (!content.trim()) return null;
      const data = JSON.parse(content);
      // Return first key if array, or the string itself for legacy
      if (Array.isArray(data.GROQ_API_KEYS) && data.GROQ_API_KEYS.length > 0) return data.GROQ_API_KEYS[0];
      return data.GROQ_API_KEY || null;
    }
  } catch (e) {
    console.error("❌ [Main] Error reading config:", e.message);
  }
  return null;
}

function saveApiKey(key) {
  try {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    let data = {};
    if (fs.existsSync(CONFIG_PATH)) {
      try {
        const content = fs.readFileSync(CONFIG_PATH, 'utf8');
        if (content.trim()) data = JSON.parse(content);
      } catch (e) {}
    }

    if (key && typeof key === 'object') {
      if (key.groqKeys && Array.isArray(key.groqKeys)) {
        data.GROQ_API_KEYS = key.groqKeys;
        data.GROQ_API_KEY = key.groqKeys[0]; // Legacy fallback
      } else if (key.groqKey) {
        data.GROQ_API_KEY = key.groqKey;
      }
      if (key.perfMode) {
        data.PERF_MODE = key.perfMode;
      }
    } else {
      data.GROQ_API_KEY = key;
    }
    
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2));
    console.log("✅ [Main] Configuration saved successfully.");
  } catch (e) {
    console.error("❌ [Main] Error saving config:", e.message);
  }
}
let robloxSource = null;
let isBarVisible = false;

function getTopPosition() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  return {
    x: Math.round((width - CONFIG.window.width) / 2),
    y: 0 // Stick to top to let response pill expand downwards/upwards freely within bounds
  };
}

/**
 * Creates the Aether-Config spatial glass panel.
 * Transparent, frameless, draggable, centered on screen.
 */
function createSetupWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  setupWindow = new BrowserWindow({
    width: width,
    height: height,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    backgroundColor: '#00000000',
    alwaysOnTop: true
  });

  setupWindow.removeMenu();
  setupWindow.loadFile(path.join(__dirname, 'config/config.html'));
  
  // Dynamic Click-Through: Capture movements across the whole screen 
  // but let clicks pass through the transparent areas.
  setupWindow.setIgnoreMouseEvents(true, { forward: true });

  setupWindow.once('ready-to-show', () => {
    setupWindow.show();
  });

  setupWindow.on('closed', () => { setupWindow = null; });
}

function createMainWindow() {
  const pos = getTopPosition();
  
  mainWindow = new BrowserWindow({
    width: CONFIG.window.width,
    height: CONFIG.window.height,
    x: pos.x,
    y: pos.y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    backgroundColor: '#00000000'
  });

  mainWindow.removeMenu();
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  
  mainWindow.setIgnoreMouseEvents(true, { forward: true });
  mainWindow.setAlwaysOnTop(true, 'screen-saver');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ═══════════════════════════════════════════════════════════════
// Mouse Interactions - Dynamic Click-Through
// ═══════════════════════════════════════════════════════════════

ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setIgnoreMouseEvents(ignore, options);
  }
});

// ═══════════════════════════════════════════════════════════════
// Screen Capture & Autonomous Vision Loop
// ═══════════════════════════════════════════════════════════════

ipcMain.handle('capture-screen', async () => {
  return await captureScreen();
});

async function captureScreen() {
  console.log("📸 [Main] Starting screen capture...");
  try {
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 800, height: 450 } // 800px wide (16:9) pour vitesse maximale
    });

    console.log(`📸 [Main] Sources found: ${sources.length}`);
    
    // Priorité: Roblox Studio > Écran Actuel
    let source = sources.find(s => s.name.toLowerCase().includes('roblox studio'));
    
    if (source) {
      console.log(`📸 [Main] Target detected: Roblox Studio`);
    } else {
      console.log(`📸 [Main] Roblox not found, falling back to primary screen...`);
      source = sources.find(s => s.id.startsWith('screen:') || s.id.startsWith('window:')) || sources[0];
    }

    if (!source || !source.thumbnail) {
      throw new Error('Could not extract images from sources');
    }

    console.log("📸 [Main] JPEG Conversion (ZERO DISK - RAM ONLY)...");
    const jpegBuffer = source.thumbnail.toJPEG(30); // Qualité 30 pour transfert IPC instantané
    
    console.log(`📸 [Main] Capture complete (${Math.round(jpegBuffer.length / 1024)} KB)`);
    return jpegBuffer.toString('base64');

  } catch (err) {
    console.error("❌ [Main] Fatal error during capture:", err);
    throw err;
  }
}

// Autonomous Capture Loop Removed as per user request
// Function deleted.

// Hook for Luau (Mission 3 Integration Prep)
ipcMain.handle('send-luau-code', async (_, code) => {
  console.log("Receiving Luau code in main process stub:", code);
  // Future: Implement communication with Roblox Local Server or Plugin here
  return { success: true };
});

// ═══════════════════════════════════════════════════════════════
// AETHER ACTIONS — Sandboxed System Control
// ═══════════════════════════════════════════════════════════════

const BLOCKED_PATTERNS = [
  /rm\s+-rf/i, /rmdir\s+\/s/i, /del\s+\/[fqs]/i,
  /format\s+[a-z]:/i, /mkfs/i, /diskpart/i,
  /reg\s+delete/i, /shutdown/i, /taskkill\s+\/f/i,
  /net\s+user/i, /net\s+localgroup/i,
  /powershell\s+.*-enc/i, /invoke-webrequest.*\|.*iex/i
];

function isCommandSafe(command) {
  const lower = command.toLowerCase();
  return !BLOCKED_PATTERNS.some(pattern => pattern.test(lower));
}

// Terminal Bridge: Execute CMD or PowerShell commands (with sandboxing)
ipcMain.handle('run-command', async (_, command) => {
  if (!isCommandSafe(command)) {
    console.warn(`🛡️ [AetherActions] BLOCKED dangerous command: ${command.slice(0, 80)}`);
    return { success: false, error: 'AETHER_SECURITY: Command blocked by sandbox policy.', stdout: '', stderr: '' };
  }

  console.log(`💻 [Terminal] Executing: ${command}`);
  return new Promise((resolve) => {
    exec(command, { shell: 'powershell.exe', timeout: 30000 }, (error, stdout, stderr) => {
      resolve({
        success: !error,
        stdout: stdout || '',
        stderr: stderr || '',
        error: error ? error.message : null
      });
    });
  });
});

// Aether Action: Create/Write File (sandboxed to user directories)
ipcMain.handle('aether-create-file', async (_, { filePath, content }) => {
  try {
    const resolved = path.resolve(filePath);
    // Block writes to system directories
    const systemDirs = ['C:\\Windows', 'C:\\Program Files', 'C:\\Program Files (x86)'];
    if (systemDirs.some(d => resolved.toLowerCase().startsWith(d.toLowerCase()))) {
      return { success: false, error: 'AETHER_SECURITY: Cannot write to system directories.' };
    }
    const dir = path.dirname(resolved);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(resolved, content, 'utf8');
    console.log(`📝 [AetherActions] File created: ${resolved}`);
    return { success: true, path: resolved };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Aether Action: Read File (sandboxed, max 100KB)
ipcMain.handle('aether-read-file', async (_, { filePath }) => {
  try {
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) return { success: false, error: 'File not found.' };
    const stats = fs.statSync(resolved);
    if (stats.size > 100 * 1024) return { success: false, error: 'File too large (>100KB). Read refused.' };
    const content = fs.readFileSync(resolved, 'utf8');
    return { success: true, content, size: stats.size };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Aether Action: Open Application (allowlist)
ipcMain.handle('aether-open-app', async (_, { appName }) => {
  const ALLOWED_APPS = {
    'vscode':    'code',
    'explorer':  'explorer',
    'notepad':   'notepad',
    'terminal':  'wt',
    'chrome':    'start chrome',
    'firefox':   'start firefox',
    'edge':      'start msedge',
    'calc':      'calc',
    'paint':     'mspaint'
  };
  const key = appName.toLowerCase().trim();
  const cmd = ALLOWED_APPS[key];
  if (!cmd) {
    return { success: false, error: `AETHER_SECURITY: "${appName}" is not in the allowed applications list.` };
  }
  console.log(`🚀 [AetherActions] Launching: ${key} -> ${cmd}`);
  return new Promise((resolve) => {
    exec(cmd, { shell: 'powershell.exe', timeout: 10000 }, (error) => {
      resolve({ success: !error, error: error?.message || null });
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// PLUGIN ARCHITECTURE
// ═══════════════════════════════════════════════════════════════

const PLUGINS_DIR = path.join(__dirname, 'plugins');

/**
 * Scans /plugins directory and loads plugin manifests.
 * Each plugin is a .js file exporting { name, description, parameters, execute(args) }
 */
ipcMain.handle('load-plugins', async () => {
  try {
    if (!fs.existsSync(PLUGINS_DIR)) {
      fs.mkdirSync(PLUGINS_DIR, { recursive: true });
      console.log('🔌 [Plugins] Directory created:', PLUGINS_DIR);
      return [];
    }

    const files = fs.readdirSync(PLUGINS_DIR).filter(f => f.endsWith('.js'));
    const plugins = [];

    for (const file of files) {
      try {
        const pluginPath = path.join(PLUGINS_DIR, file);
        // Clear require cache to allow hot-reloading
        delete require.cache[require.resolve(pluginPath)];
        const plugin = require(pluginPath);

        if (plugin.name && plugin.description && plugin.execute) {
            plugins.push({
              name: plugin.name,
              description: plugin.description,
              parameters: plugin.parameters || { type: 'object', properties: {}, required: [] }
            });
            console.log(`🔌 [Plugin] Loaded: ${plugin.name} (${file})`);
          }
        } catch (e) {
          console.error(`🔌 [Plugin] Error loading ${file}:`, e.message);
        }
      }

      return plugins;
    } catch (e) {
      console.error('🔌 [Plugins] Scan error:', e.message);
      return [];
    }
});

/**
 * Executes a loaded plugin's function.
 */
ipcMain.handle('execute-plugin', async (_, { name, args }) => {
  try {
    const files = fs.readdirSync(PLUGINS_DIR).filter(f => f.endsWith('.js'));
    for (const file of files) {
      const plugin = require(path.join(PLUGINS_DIR, file));
      if (plugin.name === name) {
        const result = await plugin.execute(args);
        return String(result);
      }
    }
    return `[ERROR] Plugin "${name}" not found.`;
  } catch (e) {
    return `[PLUGIN ERROR] ${e.message}`;
  }
});

// Expose Config to Renderer
ipcMain.handle('get-env-key', () => {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      return data; // Return full config object
    }
  } catch(e) {}
  return { GROQ_API_KEY: process.env.GROQ_API_KEY || null, PERF_MODE: 'ultra' };
});

ipcMain.handle('get-perf-mode', () => {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      return data.PERF_MODE || 'ultra';
    }
  } catch(e) {}
  return 'ultra';
});

// ═══════════════════════════════════════════════════════════════
// WEB ACCESS TOOLS (Bypass CORS)
// ═══════════════════════════════════════════════════════════════

ipcMain.handle('web-search', async (_, { query, apiKey }) => {
  console.log(`🔍 [Main] Web Search: ${query}`);
  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        api_key: apiKey, 
        query: query, 
        search_depth: "smart", 
        include_answer: true, 
        max_results: 5 
      })
    });
    const data = await response.json();
    return { success: true, data: data.results };
  } catch (err) {
    console.error("❌ [Main] Search Error:", err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('web-read-page', async (_, { url }) => {
  console.log(`📖 [Main] Reading Page: ${url}`);
  try {
    const response = await fetch(url);
    const html = await response.text();
    // Nettoyage basique
    const text = html
      .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, "")
      .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gmi, "")
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 10000);
    return { success: true, text };
  } catch (err) {
    console.error("❌ [Main] Read Error:", err.message);
    return { success: false, error: err.message };
  }
});

// Config panel: key saved, launch main app
ipcMain.on('setup-finished', (event, key) => {
  saveApiKey(key);
  if (setupWindow) setupWindow.close();
  createMainWindow();
});

// Config panel: close without saving
ipcMain.on('config-close', () => {
  if (setupWindow) setupWindow.close();
});

// Config panel: vanish animation finished
ipcMain.on('config-finished', () => {
  if (setupWindow) setupWindow.close();
  if (!mainWindow) createMainWindow();
});

// Config panel: save Tavily key separately
ipcMain.on('save-tavily-key', (event, key) => {
  try {
    let data = {};
    if (fs.existsSync(CONFIG_PATH)) {
      try { data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch(_) {}
    }
    data.TAVILY_API_KEY = key;
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2));
    console.log('✅ [Main] Tavily key saved.');
  } catch (e) {
    console.error('❌ [Main] Tavily save error:', e.message);
  }
});

// Allow renderer to set interactive mode for onboarding
ipcMain.on('set-interactive', (event, interactive) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setIgnoreMouseEvents(!interactive, interactive ? undefined : { forward: true });
  }
});


const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  // L'utilisateur tente d'en relancer un deuxième
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      // On recharge la page pour faire l'effet d'une nouvelle instance "qui remplace"
      mainWindow.reload(); 
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    if (getApiKey()) {
      createMainWindow();
    } else {
      createSetupWindow();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
