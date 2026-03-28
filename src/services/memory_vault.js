/**
 * AETHER-OS — Context Memory Vault
 * Implémente le stockage local via Vanilla IndexedDB pour la persistance à long terme
 * et le RAG (glissement temporel) local. Zéro dépendance externe.
 */

class MemoryVaultService {
    constructor() {
        this.dbName = 'AetherOS_Memory';
        this.storeName = 'conversations';
        this.db = null;
        this.initPromise = this.init();
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
                    store.createIndex('sessionId', 'sessionId', { unique: false });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('🧠 [MemoryVault] Base de données IndexedDB initialisée.');
                resolve();
            };
            
            request.onerror = (event) => {
                console.error('❌ [MemoryVault] Erreur init:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    /**
     * Ajoute un message à la mémoire à long terme.
     */
    async addMessage(sessionId, role, content) {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([this.storeName], 'readwrite');
            const store = tx.objectStore(this.storeName);
            const request = store.add({ sessionId, role, content, timestamp: Date.now() });
            
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e.target.error);
        });
    }

    /**
     * RAG Simplifié : Récupère les N derniers messages d'une session.
     */
    async getContext(sessionId, limit = 50) {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([this.storeName], 'readonly');
            const store = tx.objectStore(this.storeName);
            const index = store.index('sessionId');
            const request = index.getAll(IDBKeyRange.only(sessionId));
            
            request.onsuccess = (event) => {
                let msgs = event.target.result;
                // Tri par timestamp (le plus ancien en premier)
                msgs.sort((a, b) => a.timestamp - b.timestamp);
                
                // On garde les chunks récents jusqu'à la limite autorisée
                resolve(msgs.slice(-limit));
            };
            
            request.onerror = (e) => reject(e.target.error);
        });
    }
}

// Global instance pour être accessible par le Renderer sans require (ES Modules not configured)
window.MemoryVault = new MemoryVaultService();
