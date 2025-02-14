const { REST, Routes, Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const commands = [];
const foldersPath = path.join(__dirname, '../Commands');
const commandFolders = fs.readdirSync(foldersPath);

// Commands aus Dateien laden
for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
        } else {
            console.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

console.log('Commands to deploy:', commands);

const rest = new REST().setToken(TOKEN);

// Discord-Client für Guild-Logging
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
    console.log(`🤖 Bot ist online als ${client.user.tag}`);
    
    // Alle Server auflisten
    const guilds = await client.guilds.fetch();
    console.log(`✅ Der Bot ist in ${guilds.size} Servern:`);
    guilds.forEach(guild => console.log(` - ${guild.name} (ID: ${guild.id})`));

    try {
        console.log('🗑️ Lösche alte Commands...');

        // Lösche globale Commands
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] });
        console.log('✅ Globale Commands gelöscht.');

        // Lösche Guild-Commands (falls GUILD_ID gesetzt)
        if (GUILD_ID) {
            await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: [] });
            console.log(`✅ Commands für Guild ${GUILD_ID} gelöscht.`);
        }

        console.log(`🚀 Aktualisiere ${commands.length} Befehle...`);

        // **Global registrieren**
        const globalData = await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands }
        );
        console.log(`🌍 ${globalData.length} globale Befehle registriert.`);

        // **Optional: In einer spezifischen Guild registrieren**
        if (GUILD_ID) {
            const guildData = await rest.put(
                Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
                { body: commands }
            );
            console.log(`🏠 ${guildData.length} Befehle für Guild ${GUILD_ID} registriert.`);
        }

    } catch (error) {
        console.error('❌ Fehler beim Deployen der Commands:', error);
    } finally {
        client.destroy(); // Beende den Client nach der Registrierung
    }
});

client.login(TOKEN);
