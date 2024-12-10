const { Client, Collection, GatewayIntentBits, Events, REST, Routes } = require('discord.js');
const interactionHandler = require('./handler/interactionHandler.js');
const messageHandler = require('./handler/messageHandler.js');
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
const commandsPath = path.join(__dirname, './Commands');
const commandFolders = fs.readdirSync(commandsPath);

const commands = [];
for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        const command = require(filePath);

        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
            client.commands.set(command.data.name, command);
        } else {
            console.warn(`[WARN] Der Command in ${filePath} hat nicht die erforderlichen Eigenschaften.`);
        }
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
        if (guildId) {
            console.log(`Prüfe und registriere Commands für Guild ID: ${guildId}...`);

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
                console.log(`Neue Commands für Guild ID: ${guildId} registriert.`);
            } else {
                console.log(`Keine neuen Commands für Guild ID: ${guildId} zu registrieren.`);
            }
        } else {
            console.log(`Prüfe und registriere globale Commands...`);

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
                console.log('Neue globale Commands registriert.');
            } else {
                console.log('Keine neuen globalen Commands zu registrieren.');
            }
        }
    } catch (error) {
        console.error('Fehler bei der Registrierung der Commands:', error);
    }
}


// **Bot ready Event**
client.once(Events.ClientReady, async () => {
    console.log(`Eingeloggt als ${client.user.tag}`);
    const testGuildId = '1308408725236744314'; // Ersetze mit deiner Guild-ID
    await registerCommands(testGuildId);
});

// **Server beitreten Event**
client.on(Events.GuildCreate, async guild => {
    console.log(`Dem Server "${guild.name}" (ID: ${guild.id}) beigetreten.`);
    await registerCommands(guild.id); // Gilden-spezifische Registrierung
});

// **Bot-Login**
client.login(process.env.DISCORD_BOT_TOKEN);
