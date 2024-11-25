const { Client, Collection, GatewayIntentBits, Events } = require('discord.js');
const interactionHandler = require('./handler/interactionHandler.js');
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();
client.selectMenus = new Map();

// Load all commands dynamically
const commandsPath = path.join(__dirname, './Commands/utility');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Load all menus
const selectMenusPath = path.join(__dirname, './ticketLogic');
const selectMenuFiles = fs.readdirSync(selectMenusPath).filter(file => file.endsWith('.js'));

for (const file of selectMenuFiles) {
    const filePath = path.join(selectMenusPath, file);
    const selectMenu = require(filePath);

    if ('data' in selectMenu && 'execute' in selectMenu) {
        client.selectMenus.set(selectMenu.data.customId, selectMenu);
        console.log(`Select Menu Handler '${selectMenu.data.customId}' wurde geladen.`);
    } else {
        console.log(`[WARN] Das Select Menu in ${filePath} hat nicht die erforderlichen Eigenschaften.`);
    }
}

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
}

// Interaction handler
client.on(Events.InteractionCreate, interaction => interactionHandler(client, interaction));

// Bot ready event
client.once('ready', () => {
    console.log(`Eingeloggt als ${client.user.tag}`);
});

// Login
client.login(process.env.DISCORD_BOT_TOKEN);
