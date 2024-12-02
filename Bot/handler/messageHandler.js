const axios = require("axios");
require('dotenv').config();

module.exports = async (client, message) => {
    if (message.author.bot) {
        // Ignore messages from all bots, including this bot
        return;
    }

    if (isTicketChannel(message.channel)) {
        try {
            const messages = await collectMessagesFromChannel(message.channel, client, message);

            if (!messages.includes("Alles klar, ein Menschlicher Supporter wird das Ticket übernehmen!")) {
                const aiResponse = await sendMessagesToAI(messages, message.content);
                await message.channel.send(aiResponse);
            }           
        } catch (error) {
            console.error('Error handling ticket message:', error);
            await message.channel.send('There was an error processing your request.');
        }
    }
};

function isTicketChannel(channel) {
    return channel.name.endsWith('s-ticket');
}

async function collectMessagesFromChannel(channel, client, triggeringMessage) {
    let collectedMessages = '';
    const allMessages = new Map();

    const aiBotUserId = client.user.id; // The AI bot's user ID

    // Manually add the triggering message
    allMessages.set(triggeringMessage.id, triggeringMessage);

    let lastMessageId = null;
    const maxMessages = 10; // Limit to the last 10 messages

    while (allMessages.size < maxMessages) {
        const options = { limit: 100 };
        if (lastMessageId) {
            options.before = lastMessageId;
        }

        const messages = await channel.messages.fetch(options);
        if (messages.size === 0) {
            break;
        }

        for (const [id, message] of messages) {
            allMessages.set(id, message);
            if (allMessages.size >= maxMessages) {
                break;
            }
        }

        lastMessageId = messages.last().id;

        // Optional: Delay between fetches to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 200));        
    }

    // Sort messages by timestamp in ascending order
    const messageArray = Array.from(allMessages.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    // Process the last 10 messages (sorted array ensures the order)
    for (const message of messageArray) {
        const member = await channel.guild.members.fetch(message.author.id).catch(() => null);

        let prefix = '';

        if (message.author.id === aiBotUserId) {
            // Message is from the AI bot
            prefix = 'AI - Support: ';
        } else if (member && member.roles.cache.some(role => role.name === 'Supporter')) {
            // Message is from a human support member
            prefix = 'Support: ';
        } else if (!message.author.bot) {
            // Message is from a user
            prefix = 'User: ';
        } else {
            // Message is from another bot; skip it
            continue;
        }

        // Ensure message content is properly accessed
        const content = message.content || '';

        collectedMessages += `${prefix}${content}\n`;
    }

    console.log("Collected messages:\n", collectedMessages);
    return collectedMessages.trim();
}

async function sendMessagesToAI(messages, lastMessage) {
    try {
        const response = await axios.post(
        process.env.OPENAI_URL,
            {
            model: process.env.MODELL,
            messages: [
                { role: 'system', content: "Du bist ein AI Supporter der sich auf FiveM spezialisiert. Dein Name ist Bern. Wenn dich jemadn etwas anderes Fragen über den FiveM server stellt antwortest du mit einer passenden antwort. Hier ist der ursprüngliche Nachrichten Verlauf und antworte auf die Frage des Users:", messages },
                { role: 'user', content: lastMessage },
            ],
        },
        {
            headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
        }
        );
        
        return response.data.choices[0].message.content; // Antwort von OpenAI
    } catch (error) {
        console.error("Fehler bei der Anfrage an die OpenAI API:", error);
        return "Entschuldigung, es gab ein Problem mit der Anfrage.";
    }
}
