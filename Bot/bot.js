const { Client, Collection, GatewayIntentBits, Events, REST, Routes, PermissionsBitField } = require('discord.js');
const interactionHandler = require('./handler/interactionHandler.js');
const messageHandler = require('./handler/messageHandler.js');
const { checkDatabaseStatus } = require('./Database/database.js');
const Logger = require('./helper/loggerHelper.js');
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config();

// Discord-Client initialisieren
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
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
        PermissionsBitField.Flags.Administrator
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
                        case PermissionsBitField.Flags.Administrator: return 'Administrator';
                        default: return `Unbekannte Berechtigung (${perm})`;
                    }
                });

                // Nachricht an den Server-Inhaber senden
                await owner.send(
                    `Hallo, ich bin dem Server "${guild.name}" beigetreten, aber mir fehlen folgende Berechtigungen, um ordnungsgemäß zu funktionieren:\n` +
                    `${missingPermissionsNames.map(name => `- ${name}`).join('\n')}\n` +
                    `Bitte überprüfe meine Berechtigungen und füge die fehlenden hinzu, damit ich meine Funktionen korrekt ausführen kann. Vielen Dank!`
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
    checkDatabaseStatus();
    
    // Status und Aktivität setzen
    client.user.setPresence({
        //activities: [{ name: 'other ticket systems', type: 5 }], // type 0 = PLAYING
        status: 'dnd', // Status: 'online', 'idle', 'dnd', 'invisible'
    });
    
    console.log(`
        ______                     ______          _    
       | ___ \\                    |  _  \\        | |   
       | |_/ /_ __ __ ___   _____ | | | |___  ___| | __
       | ___ \\ '__/ _\` \\ \\ / / _ \\| | | / _ \\/ __| |/ /
       | |_/ / | | (_| |\\ V / (_) | |/ /  __/\\__ \\   < 
       \\____/|_|  \\__,_| \\_/ \\___/|___/ \\___||___/_|\\_\\
                                                       
       `);
    
        Logger.info(`Eingeloggt als ${client.user.tag}`);

    //const testGuildId = '1308408725236744314'; // Ersetze mit deiner Guild-ID
    //await registerCommands(testGuildId);
});

// **Bot-Login**
client.login(process.env.DISCORD_BOT_TOKEN);