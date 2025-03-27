import { Client, Collection, GatewayIntentBits, Events, REST, Routes, Partials } from 'discord.js';
import { updateTicketCreationMessage } from './helper/ticketCategoryHelper.js';
import { initializeDatabaseConnection } from './Database/database.js';
import interactionHandler from './handler/interactionHandler.js';
import messageHandler from './handler/messageHandler.js';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Logger from './helper/loggerHelper.js';
import { Worker } from 'worker_threads';
import path from 'node:path';
import express from 'express';
import dotenv from 'dotenv';
import fs from 'node:fs';

dotenv.config();

const app = express();
app.use(express.json());

// 🔹 Correct way to define __filename and __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔹 Convert worker script path to file:// URL
const workerPath = new URL('./Threads/openai-keep-alive.js', import.meta.url);
const worker = new Worker(workerPath, { type: 'module' }); // ✅ Now the path is properly formatted


// Worker-Thread event handlers
worker.on('message', (message) => {
    Logger.info(`Nachricht vom OpenAI Keep Alive thread: ${message}`);
});
worker.on('error', (err) => {
    Logger.error(`Error vom OpenAI Keep Alive thread: ${err}`);
});
worker.on('exit', (code) => {
    Logger.warn(`Exit vom OpenAI Keep Alive thread: ${code}`);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Discord-Client initialisieren
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel],
});

client.commands = new Collection();
client.selectMenus = new Map();
client.buttons = new Map();

// 🔹 Paths for dynamically imported files
const commandsPath = path.join(__dirname, 'Commands/utility');
const selectMenusPath = path.join(__dirname, 'ticketLogic');
const buttonsPath = path.join(__dirname, 'ticketLogic');

// 🔹 Ensure `import()` receives valid `file://` URLs
const loadModules = async (directory, collection) => {
    const files = fs.readdirSync(directory).filter(file => file.endsWith('.js'));

    for (const file of files) {
        const filePath = path.join(directory, file);
        const fileUrl = pathToFileURL(filePath).href;

        try {
            const module = await import(fileUrl);
            const instance = module.default;
            
            if ('data' in instance && 'execute' in instance) {
                collection.set(instance.data.name || instance.data.customId, instance);
            } else {
                Logger.warn(`[WARN] Das Modul ${filePath} hat nicht die erforderlichen Eigenschaften.`);
            }
        } catch (error) {
            Logger.error(`[ERROR] Fehler beim Laden von ${filePath}:`, error);
        }
    }
};

// 🔹 Load all modules
await loadModules(commandsPath, client.commands);
await loadModules(selectMenusPath, client.selectMenus);
await loadModules(buttonsPath, client.buttons);

// Interaktionen verarbeiten
client.on(Events.InteractionCreate, interaction => {
    interactionHandler(client, interaction);
});

// Nachrichten verarbeiten
client.on(Events.MessageCreate, message => {
    messageHandler(client, message);
});

async function registerCommands(guildId = null) {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

    try {
        const commands = Array.from(client.commands.values()).map(command => command.data.toJSON());

        if (guildId) {
            Logger.info(`Prüfe und registriere Commands für Guild ID: ${guildId}...`);
            const existingCommands = await rest.get(Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId));
            const newCommands = commands.filter(newCmd => !existingCommands.some(existingCmd => existingCmd.name === newCmd.name));
            
            if (newCommands.length > 0) {
                await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId), { body: newCommands });
                Logger.success(`Neue Commands für Guild ID: ${guildId} registriert.`);
            } else {
                Logger.info(`Keine neuen Commands für Guild ID: ${guildId} zu registrieren.`);
            }
        } else {
            Logger.info(`Prüfe und registriere globale Commands...`);
            const existingCommands = await rest.get(Routes.applicationCommands(process.env.CLIENT_ID));
            const newCommands = commands.filter(newCmd => !existingCommands.some(existingCmd => existingCmd.name === newCmd.name));
            
            if (newCommands.length > 0) {
                await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: newCommands });
                Logger.info('Neue globale Commands registriert.');
            } else {
                Logger.info('Keine neuen globalen Commands zu registrieren.');
            }
        }
    } catch (error) {
        Logger.error(`Fehler bei der Registrierung der Commands: ${error.message}`);
    }
}

client.on(Events.GuildCreate, async guild => {
    Logger.info(`Dem Server "${guild.name}" (ID: ${guild.id}) beigetreten.`);
    await registerCommands(guild.id);
});

client.once(Events.ClientReady, async () => {    
    client.user.setPresence({ status: 'dnd' });

    console.log(`
        ______                     ______          _    
       | ___ \\                    |  _  \\        | |   
       | |_/ /_ __ __ ___   _____ | | | |___  ___| | __
       | ___ \\ '__/ _\` \\ \\ / / _ \\| | | / _ \\/ __| |/ /
       | |_/ / | | (_| |\\ V / (_) | |/ /  __/\\__ \\   < 
       \\____/|_|  \\__,_| \\_/ \\___/|___/ \\___||___/_|\\_\\
                                                       
       `);
    Logger.info(`Eingeloggt als ${client.user.tag}`);
    initializeDatabaseConnection();
});

client.login(process.env.DISCORD_BOT_TOKEN);

// 🔹 REST API PART
app.post('/api/update-ticket-message', async (req, res) => {
    const authToken = req.headers.authorization;
    if (!authToken || authToken !== process.env.DASHBOARD_API_TOKEN) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { guildId } = req.body;
    if (!guildId) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
        return res.status(404).json({ error: 'Guild not found' });
    }
    
    try {
        await updateTicketCreationMessage(guild);
        return res.status(200).json({ message: `Kategorie wurde erfolgreich hinzugefügt.` });
    } catch (err) {
        Logger.error(`Fehler beim Hinzufügen der Kategorie: ${err.message}\n${err.stack}`);
        return res.status(500).json({ error: 'Es gab einen Fehler beim Hinzufügen der Kategorie.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API Server läuft auf Port ${PORT}`);
});
