const { getData } = require('../Database/qdrant.js');
const axios = require("axios");
require('dotenv').config();

module.exports = async (client, message) => {
    if (message.author.bot) return; // Ignoriere alle Bots

    if (isTicketChannel(message.channel)) {
        try {
            const messages = await collectMessagesFromChannel(message.channel, client, message);

            if (!messages.includes("Alles klar, ein Menschlicher Supporter wird das Ticket übernehmen!")) {
                const aiResponse = await sendMessagesToAI(messages, message);
                await message.channel.send(aiResponse);
            }
        } catch (error) {
            console.error(`Fehler beim Verarbeiten der Nachricht im Ticket-Kanal (${message.channel.name}):`, error);
            await message.channel.send('Es gab einen Fehler bei der Verarbeitung deiner Anfrage. Bitte versuche es später erneut.');
        }
    }
};

function isTicketChannel(channel) {
    return channel.name.endsWith('s-ticket');
}

async function collectMessagesFromChannel(channel, client, triggeringMessage) {
    const collectedMessages = [];
    const allMessages = new Map();

    const aiBotUserId = client.user.id; // AI-Bot-ID
    allMessages.set(triggeringMessage.id, triggeringMessage); // Triggering-Message hinzufügen

    let lastMessageId = null;
    const maxMessages = 10; // Limit auf 10 Nachrichten

    while (allMessages.size < maxMessages) {
        const options = { limit: 50 }; // Maximal 50 Nachrichten pro Abruf
        if (lastMessageId) {
            options.before = lastMessageId;
        }

        const messages = await channel.messages.fetch(options);
        if (messages.size === 0) break;

        for (const [id, message] of messages) {
            if (allMessages.size >= maxMessages) break;

            if (message.author.bot && message.author.id !== aiBotUserId) continue; // Überspringe fremde Bots
            allMessages.set(id, message);
        }

        lastMessageId = messages.last().id;

        // Verzögerung zur Vermeidung von Rate-Limits
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Nachrichten nach Timestamp sortieren und verarbeiten
    const messageArray = Array.from(allMessages.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    for (const message of messageArray) {
        const member = await channel.guild.members.fetch(message.author.id).catch(() => null);

        let prefix = '';
        if (message.author.id === aiBotUserId) {
            prefix = 'AI - Support: ';
        } else if (member && member.roles.cache.some(role => role.name === 'Supporter')) {
            prefix = 'Support: ';
        } else if (!message.author.bot) {
            prefix = 'User: ';
        } else {
            continue; // Ignoriere andere Bots
        }

        const content = message.content || '';
        collectedMessages.push(`${prefix}${content}`);
    }

    return collectedMessages.join('\n').trim();
}

async function sendMessagesToAI(messages, lastMessage) {
    let knowledgeBaseText = '';
    try {
        const collectionName = `guild_${lastMessage.guild.id}`;
        const data = await getData(collectionName, lastMessage.content);

        if (data && data.length > 0) {
            knowledgeBaseText = data.map((item) => item.payload.text).join('\n');
        } else {
            knowledgeBaseText = 'Keine zusätzlichen Serverdaten gefunden.';
        }
    } catch (error) {
        console.error('Fehler beim Abrufen der Wissensdatenbank:', error);
        knowledgeBaseText = 'Es gab ein Problem beim Abrufen der Serverdaten.';
    }

    const systemPrompt = `
        Du bist ein AI-Supporter namens Bern, spezialisiert auf FiveM-Server.
        Deine Aufgabe ist es, Nutzerfragen zu beantworten. Hier sind die letzten Nachrichten im Ticket und relevantes Wissen:
        \n\n${messages}\n\nZusätzliches Wissen:\n${knowledgeBaseText}
        \n\nAntworte angemessen auf die letzte Nachricht im Kontext.
    `;

    console.log('Generierter Systemprompt:', systemPrompt);

    try {
        const response = await axios.post(
            process.env.OPENAI_URL,
            {
                model: process.env.MODELL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: lastMessage.content },
                ],
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                },
            }
        );

        return response.data.choices[0].message.content || 'Entschuldigung, ich konnte keine passende Antwort generieren.';
    } catch (error) {
        console.error('Fehler bei der Anfrage an die OpenAI API:', error);
        return 'Entschuldigung, es gab ein Problem mit der Anfrage an die KI.';
    }
}
