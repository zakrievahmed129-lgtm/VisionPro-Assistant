const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const ui = {
        input: document.getElementById('apiKey'),
        btn: document.getElementById('connectBtn'),
        error: document.getElementById('errorMsg')
    };

    console.log("📋 [Setup] Interface initialized.");

    async function validate() {
        const key = ui.input.value.trim();
        
        if (!key) {
            showError("Please enter an API key.");
            return;
        }

        if (!key.startsWith('gsk_')) {
            showError("Key must start with 'gsk_'.");
            return;
        }

        ui.btn.disabled = true;
        ui.btn.innerText = "Verifying...";
        ui.error.classList.remove('visible');

        try {
            // Test actual call to Groq to verify key
            const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${key}`
                },
                body: JSON.stringify({
                    model: "llama-3.1-8b-instant",
                    messages: [{ role: "user", content: "hi" }],
                    max_tokens: 5
                })
            });

            if (resp.ok) {
                ui.btn.innerText = "Connected!";
                ui.btn.style.background = "#32ff64";
                ui.btn.style.color = "#000";
                
                setTimeout(() => {
                    ipcRenderer.send('setup-finished', key);
                }, 1000);
            } else {
                const data = await resp.json();
                showError("Invalid key: " + (data.error?.message || "Check your key."));
            }
        } catch (err) {
            showError("Network error: Check your connection.");
        } finally {
            if (ui.btn.innerText !== "Connected!") {
                ui.btn.disabled = false;
                ui.btn.innerText = "Activate Protocol";
            }
        }
    }

    function showError(msg) {
        ui.error.innerText = msg;
        ui.error.classList.add('visible');
        ui.input.style.borderColor = "#FF453A";
        setTimeout(() => ui.input.style.borderColor = "rgba(255,255,255,0.1)", 2000);
    }

    ui.btn.addEventListener('click', validate);
    ui.input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') validate();
    });
    
    // Auto-focus input
    ui.input.focus();
});
