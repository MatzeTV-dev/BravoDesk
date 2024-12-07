const { Client, Collection, GatewayIntentBits, Events } = require('discord.js');
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
        console.warn(`[WARN] Der Command in ${filePath} hat nicht die erforderlichen Eigenschaften.`);
    }
}

// **Select Menus laden**
for (const file of selectMenuFiles) {
    const filePath = path.join(selectMenusPath, file);
    const selectMenu = require(filePath);

    if ('data' in selectMenu && 'execute' in selectMenu) {
        client.selectMenus.set(selectMenu.data.customId, selectMenu);
    } else {
        console.warn(`[WARN] Das Select Menu in ${filePath} hat nicht die erforderlichen Eigenschaften.`);
    }
}

// **Buttons laden**
for (const file of buttonFiles) {
    const filePath = path.join(buttonsPath, file);
    const button = require(filePath);

    if ('data' in button && 'execute' in button) {
        client.buttons.set(button.data.name, button);
    } else {
        console.warn(`[WARN] Der Button in ${filePath} hat nicht die erforderlichen Eigenschaften.`);
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

// **Bot ready Event**
client.once(Events.ClientReady, () => {
    console.log(`Eingeloggt als ${client.user.tag}`);
});

// **Bot-Login**
client.login(process.env.DISCORD_BOT_TOKEN);
