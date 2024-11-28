const { Client, Collection, GatewayIntentBits, Events } = require('discord.js');
const interactionHandler = require('./handler/interactionHandler.js');
const messageHandler = require('./handler/messageHandler.js');
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config();

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ] 
});
client.commands = new Collection();
client.selectMenus = new Map();
client.buttons = new Map(); // Hinzugefügt: Map für Buttons


// Pfade zu den verschiedenen Handler-Verzeichnissen
const commandsPath = path.join(__dirname, './Commands/utility');
const selectMenusPath = path.join(__dirname, './ticketLogic');
const buttonsPath = path.join(__dirname, './ticketLogic'); // Hinzugefügt: Pfad für Buttons

// Dateien in den Verzeichnissen einlesen
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
const selectMenuFiles = fs.readdirSync(selectMenusPath).filter(file => file.endsWith('.js'));
const buttonFiles = fs.readdirSync(buttonsPath).filter(file => file.endsWith('.js')); // Hinzugefügt: Button-Dateien einlesen

// Laden der Select Menus
for (const file of selectMenuFiles) {
    const filePath = path.join(selectMenusPath, file);
    const selectMenu = require(filePath);

    if ('data' in selectMenu && 'execute' in selectMenu) {
        client.selectMenus.set(selectMenu.data.customId, selectMenu);
    } else {
        console.log(`[WARN] Das Select Menu in ${filePath} hat nicht die erforderlichen Eigenschaften.`);
    }
}

// Laden der Commands
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
}

// **Laden der Buttons**
for (const file of buttonFiles) {
    const filePath = path.join(buttonsPath, file);
    const button = require(filePath);

    if ('data' in button && 'execute' in button) {
        client.buttons.set(button.data.name, button);
    } else {
        console.log(`[WARN] Der Button in ${filePath} hat nicht die erforderlichen Eigenschaften.`);
    }
}

for (const file of selectMenuFiles) {
    const selectMenu = require(`./ticketlogic/${file}`);
    client.selectMenus.set(selectMenu.data.name, selectMenu);
}

// Interaction handler
client.on(Events.InteractionCreate, interaction => interactionHandler(client, interaction));

client.on('messageCreate', (message) => {
    messageHandler(client, message);
});

// Bot ready event
client.once('ready', () => {
    console.log(`Eingeloggt als ${client.user.tag}`);
});

// Login
client.login(process.env.DISCORD_BOT_TOKEN);
