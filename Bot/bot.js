const { Client, Collection, GatewayIntentBits, Events, REST, Routes, PermissionsBitField, Partials } = require('discord.js');
const interactionHandler = require('./handler/interactionHandler.js');
const messageHandler = require('./handler/messageHandler.js');
const { getCategories, saveCategories, updateTicketCreationMessage } = require('./helper/ticketCategoryHelper');
const { initializeDatabaseConnection } = require('./Database/database.js');
const Logger = require('./helper/loggerHelper.js');
const { Worker } = require('worker_threads');
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const express = require('express');
const app = express();
app.use(express.json());

dotenv.config();
const worker = new Worker('../Bot/Threads/openai-keep-alive.js');

// Nachrichten vom Worker empfangen
worker.on('message', (message) => {
    Logger.info(`Nachricht vom OpenAI Keep Alive thread: ${message}`);
});

// Fehler im Worker-Thread behandeln
worker.on('error', (err) => {
    Logger.error(`Error vom OpenAI Keep Alive thread: ${err}`);
});

// Wenn der Worker beendet wird
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
client.buttons = new Map(); // Map für Buttons

// **Pfad zu den Verzeichnissen**
const commandsPath = path.join(__dirname, './Commands/utility');
const selectMenusPath = path.join(__dirname, './ticketLogic');
const buttonsPath = path.join(__dirname, './ticketLogic');

// **Dateien einlesen**
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
const selectMenuFiles = fs.readdirSync(selectMenusPath).filter(file => file.endsWith('.js'));
const buttonFiles = fs.readdirSync(buttonsPath).filter(file => file.endsWith('.js'));

// **Commands laden**
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        Logger.warn(`[WARN] Der Command in ${filePath} hat nicht die erforderlichen Eigenschaften.`);
    }
}

// **Select Menus laden**
for (const file of selectMenuFiles) {
    const filePath = path.join(selectMenusPath, file);
    const selectMenu = require(filePath);

    if ('data' in selectMenu && 'execute' in selectMenu) {
        client.selectMenus.set(selectMenu.data.customId, selectMenu);
    } else {
        Logger.warn(`[WARN] Das Select Menu in ${filePath} hat nicht die erforderlichen Eigenschaften.`);
    }
}

// **Buttons laden**
for (const file of buttonFiles) {
    const filePath = path.join(buttonsPath, file);
    const button = require(filePath);

    if ('data' in button && 'execute' in button) {
        client.buttons.set(button.data.name, button);
    } else {
        Logger.warn(`[WARN] Der Button in ${filePath} hat nicht die erforderlichen Eigenschaften.`);
    }
}

// **Interaktionen verarbeiten**
client.on(Events.InteractionCreate, interaction => {
    interactionHandler(client, interaction);
});

// **Nachrichten verarbeiten**
client.on(Events.MessageCreate, message => {
    messageHandler(client, message);
});

async function registerCommands(guildId = null) {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

    try {
        const commands = Array.from(client.commands.values()).map(command => command.data.toJSON());

        if (guildId) {
            Logger.info(`Prüfe und registriere Commands für Guild ID: ${guildId}...`);

            // Hol die aktuellen Commands für die Guild
            const existingCommands = await rest.get(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId)
            );

            // Filtere doppelte Commands heraus
            const newCommands = commands.filter(newCmd => 
                !existingCommands.some(existingCmd => existingCmd.name === newCmd.name)
            );

            if (newCommands.length > 0) {
                // Registriere nur neue Commands
                await rest.put(
                    Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
                    { body: newCommands },
                );
                Logger.success(`Neue Commands für Guild ID: ${guildId} registriert.`);
            } else {
                Logger.info(`Keine neuen Commands für Guild ID: ${guildId} zu registrieren.`);
            }
        } else {
            Logger.info(`Prüfe und registriere globale Commands...`);

            // Hol die aktuellen globalen Commands
            const existingCommands = await rest.get(Routes.applicationCommands(process.env.CLIENT_ID));

            // Filtere doppelte Commands heraus
            const newCommands = commands.filter(newCmd => 
                !existingCommands.some(existingCmd => existingCmd.name === newCmd.name)
            );

            if (newCommands.length > 0) {
                // Registriere nur neue Commands
                await rest.put(
                    Routes.applicationCommands(process.env.CLIENT_ID),
                    { body: newCommands },
                );
                Logger.info('Neue globale Commands registriert.');
            } else {
                Logger.info('Keine neuen globalen Commands zu registrieren.');
            }
        }
    } catch (error) {
        Logger.error(`Fehler bei der Registrierung der Commands: ${error.message}`);
    }
}


// **Server beitreten Event**
client.on(Events.GuildCreate, async guild => {
    Logger.info(`Dem Server "${guild.name}" (ID: ${guild.id}) beigetreten.`);
    
    // Wichtige Berechtigungen definieren
    const requiredPermissions = [
        PermissionsBitField.Flags.ManageRoles,
        PermissionsBitField.Flags.ManageChannels,
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ManageMessages,
        PermissionsBitField.Flags.EmbedLinks,
    ];

    // Berechtigungen des Bots im Server überprüfen
    const botMember = guild.members.me;
    const botPermissions = botMember.permissions;

    const missingPermissions = requiredPermissions.filter(perm => !botPermissions.has(perm));

    if (missingPermissions.length > 0) {
        Logger.warn(`Dem Bot fehlen folgende Berechtigungen auf dem Server "${guild.name}": ${missingPermissions.join(', ')}`);
        
        // Server-Inhaber ermitteln
        try {
            const owner = await guild.fetchOwner();

            if (owner) {
                // Fehlende Berechtigungen in Klartext konvertieren
                const missingPermissionsNames = missingPermissions.map(perm => {
                    switch (perm) {
                        case PermissionsBitField.Flags.ManageRoles: return 'Manage Roles';
                        case PermissionsBitField.Flags.ManageChannels: return 'Manage Channels';
                        case PermissionsBitField.Flags.ViewChannel: return 'View Channels';
                        case PermissionsBitField.Flags.SendMessages: return 'Send Messages';
                        case PermissionsBitField.Flags.ManageMessages: return 'Manage Messages';
                        case PermissionsBitField.Flags.EmbedLinks: return 'Embed Links';
                        default: return `Unbekannte Berechtigung (${perm})`;
                    }
                });

                // Nachricht an den Server-Inhaber senden
                await owner.send(
                    `Hallo, ich bin dem Server "${guild.name}" beigetreten, aber mir fehlen ein paar Berechtigungen, um ordnungsgemäß zu funktionieren\n` +
                    `Kick mich nocheinmal und gib mir alle Notwendigen Rechte damit ich funktioniere! Hier ist eine List mit den fehlenden Rechten: \n\n` +
                    `${missingPermissionsNames.map(name => `- ${name}`).join('\n')}`
                );
                Logger.info(`Nachricht an den Inhaber des Servers "${guild.name}" gesendet.`);
            }
        } catch (error) {
            Logger.error(`Fehler beim Senden einer Nachricht an den Inhaber des Servers "${guild.name}":`, error);
        }
    }

    // Gilden-spezifische Registrierung der Befehle
    await registerCommands(guild.id);
});


client.once(Events.ClientReady, async () => {    
    // Status und Aktivität setzen
    client.user.setPresence({
        //activities: [{ name: 'other ticket systems', type: 5 }], // type 0 = PLAYING
        status: 'dnd', // Status: 'online', 'idle', 'dnd', 'invisible'
    });
    
    //Herstellung der DB Verbindung
    initializeDatabaseConnection();

    console.log(`
        ______                     ______          _    
       | ___ \\                    |  _  \\        | |   
       | |_/ /_ __ __ ___   _____ | | | |___  ___| | __
       | ___ \\ '__/ _\` \\ \\ / / _ \\| | | / _ \\/ __| |/ /
       | |_/ / | | (_| |\\ V / (_) | |/ /  __/\\__ \\   < 
       \\____/|_|  \\__,_| \\_/ \\___/|___/ \\___||___/_|\\_\\
                                                       
       `);
  
    Logger.info("Version: 1.1.11");
    Logger.info(`Eingeloggt als ${client.user.tag}`);

    //const testGuildId = '1308408725236744314'; // Ersetze mit deiner Guild-ID
    //await registerCommands(testGuildId);
});

// **Bot-Login**
client.login(process.env.DISCORD_BOT_TOKEN);


// REST API PART
// API-Endpunkt für das Dashboard

// API-Endpunkt, der neue Ticket-Kategorien hinzufügt
app.post('/api/addcategory', async (req, res) => {
  // Authentifizierung (z.B. über einen speziellen API-Token)
  const authToken = req.headers.authorization;
  if (!authToken || authToken !== process.env.DASHBOARD_API_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Erforderliche Parameter aus dem Request-Body auslesen
  const { guildId, label, description, ai_prompt, ai_enabled, emoji, permission } = req.body;
  if (!guildId || !label || !description || !ai_prompt || typeof ai_enabled === 'undefined') {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  // Guild anhand der ID ermitteln
  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    return res.status(404).json({ error: 'Guild not found' });
  }

  // Verarbeite den "permission"-Parameter ähnlich wie im Slash Command
  let permissionRoleIds = [];
  if (permission) {
    // Extrahiere alle Rollen-IDs aus der Eingabe (z.B. "<@&123456789012345678>")
    const roleIdMatches = permission.match(/<@&(\d+)>/g);
    if (roleIdMatches) {
      permissionRoleIds = roleIdMatches.map(roleMention =>
        roleMention.replace(/[<@&>]/g, '')
      );
    }
  }

  try {
    const categories = getCategories(guild.id);

    // Prüfen, ob bereits eine Kategorie mit diesem Label existiert
    if (categories.some(cat => cat.label.toLowerCase() === label.toLowerCase())) {
      return res.status(200).json({ message: `Eine Kategorie mit dem Namen "${label}" existiert bereits.` });
    }

    // Neues Kategorie-Objekt erstellen (entsprechend deinem Command)
    const newCategory = {
      label,
      description,
      aiPrompt: ai_prompt,
      aiEnabled: ai_enabled,
      emoji: emoji || '',
      permission: permissionRoleIds
    };

    categories.push(newCategory);
    saveCategories(guild.id, categories);

    // Aktualisiere das Ticket-Dropdown im entsprechenden Channel
    await updateTicketCreationMessage(guild);

    return res.status(200).json({ message: `Kategorie "${label}" wurde erfolgreich hinzugefügt.` });
  } catch (err) {
    Logger.error(`Fehler beim Hinzufügen der Kategorie: ${err.message}\n${err.stack}`);
    return res.status(500).json({ error: 'Es gab einen Fehler beim Hinzufügen der Kategorie.' });
  }
});

// Den Express-Server starten – idealerweise nach der Client-Initialisierung:
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API Server läuft auf Port ${PORT}`);
});

