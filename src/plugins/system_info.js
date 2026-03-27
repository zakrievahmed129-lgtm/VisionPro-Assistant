/**
 * EXAMPLE PLUGIN — System Info
 * Demonstrates Aether-OS plugin architecture.
 * 
 * Place .js files in /plugins to extend the AI's capabilities.
 * Each plugin must export: { name, description, parameters, execute(args) }
 */

const os = require('os');

module.exports = {
    name: 'get_system_info',
    description: 'Récupère les informations système du PC (RAM, CPU, OS, uptime).',
    parameters: {
        type: 'object',
        properties: {},
        required: []
    },
    async execute(args) {
        const info = {
            os: `${os.type()} ${os.release()} (${os.arch()})`,
            hostname: os.hostname(),
            cpu: os.cpus()[0]?.model || 'Inconnu',
            cores: os.cpus().length,
            ram_total: `${(os.totalmem() / 1073741824).toFixed(1)} GB`,
            ram_free: `${(os.freemem() / 1073741824).toFixed(1)} GB`,
            uptime: `${(os.uptime() / 3600).toFixed(1)} heures`
        };
        return JSON.stringify(info, null, 2);
    }
};
