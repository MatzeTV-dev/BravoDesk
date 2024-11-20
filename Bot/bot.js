const { Client, GatewayIntentBits } = require('discord.js');
const dotenv = require('dotenv');
dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Bot start
client.once('ready', () => {
    console.log(`Eingeloggt als ${client.user.tag}`);
});

client.login(process.env.DISCORD_BOT_TOKEN);
