const { getData } = require('../Database/qdrant.js');
const axios = require("axios");
const Logger = require('../helper/loggerHelper.js');
require('dotenv').config();

module.exports = async (client, message) => {
    if (message.author.bot) return; // Ignoriere alle Bots

    if (isTicketChannel(message.channel)) {
        try {
            const messages = await collectMessagesFromChannel(message.channel, client, message);

            if (!messages.includes("Alles klar, ein menschlicher Supporter wird das Ticket übernehmen!")) {
                const category = getCategoryFromChannelTopic(message.channel);
                const aiResponse = await sendMessagesToAI(messages, message, category);
                await message.channel.send(aiResponse);
            }
        } catch (error) {
            Logger.error(`Fehler beim Verarbeiten der Nachricht im Ticket-Kanal (${message.channel.name}): ${error.message}`);
            await message.channel.send('Es gab einen Fehler bei der Verarbeitung deiner Anfrage. Bitte versuche es später erneut.');
        }
    }
};

function isTicketChannel(channel) {
    return channel.name.endsWith('s-ticket');
}

function getCategoryFromChannelTopic(channel) {
    const topic = channel.topic || '';

    if (topic.includes('Technischer Support')) return 'technical_support';
    if (topic.includes('Allgemeine Frage')) return 'general_questions';
    if (topic.includes('Verbesserungsvorschlag')) return 'suggestions';
    if (topic.includes('Bug Report')) return 'bug_report';
    return 'unknown';
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

async function sendMessagesToAI(messages, lastMessage, category) {
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
        Logger.error(`Fehler beim Abrufen der Wissensdatenbank: ${error.message}`);
        knowledgeBaseText = 'Es gab ein Problem beim Abrufen der Serverdaten.';
    }

    const prompts = {
        technical_support: `
            Du bist ein AI-Supporter namens BravoDesk, spezialisiert auf technischen Support für FiveM-Server.
            Bei Fragen die nichts mit FiveM zu tun haben sei höflich und sag dem user das du ihm dabei nicht weiterhelfen kannst
            NUR FIVEM KEIN ANDERES SPIEL ODER PROGRAMM
            Hier sind die letzten Nachrichten im Ticket und relevantes Wissen:
            \n\n${messages}\n\nZusätzliches Wissen:\n${knowledgeBaseText}
            \n\nAntworte auf technische Fragen und biete technische Unterstützung für FiveM an.
        `,
        general_questions: `
            Du bist ein AI-Supporter namens BravoDesk, spezialisiert auf allgemeine Fragen.
            Bei Fragen die nichts mit FiveM zu tun haben sei höflich und sag dem user das du ihm dabei nicht weiterhelfen kannst
            NUR FIVEM KEIN ANDERES SPIEL ODER PROGRAMM
            Hier sind die letzten Nachrichten im Ticket und relevantes Wissen:
            \n\n${messages}\n\nZusätzliches Wissen:\n${knowledgeBaseText}
            \n\nAntworte höflich und hilfsbereit auf allgemeine Fragen.
        `,
        suggestions: `
            Du bist ein AI-Supporter namens BravoDesk, der Verbesserungsvorschläge für FiveM-Server sammelt.
            Bei Fragen die nichts mit FiveM zu tun haben sei höflich und sag dem user das du ihm dabei nicht weiterhelfen kannst
            NUR FIVEM KEIN ANDERES SPIEL ODER PROGRAMM
            Hier sind die letzten Nachrichten im Ticket und relevantes Wissen:
            \n\n${messages}\n\nZusätzliches Wissen:\n${knowledgeBaseText}
            \n\nAntworte höflich und ermutige den Benutzer, weitere Vorschläge zu machen.
        `,
        bug_report: `
            Du bist ein AI-Supporter namens BravoDesk, spezialisiert auf die Bearbeitung von Bug Reports.
            Bei Fragen die nichts mit FiveM zu tun haben sei höflich und sag dem user das du ihm dabei nicht weiterhelfen kannst
            NUR FIVEM KEIN ANDERES SPIEL ODER PROGRAMM
            Hier sind die letzten Nachrichten im Ticket und relevantes Wissen:
            \n\n${messages}\n\nZusätzliches Wissen:\n${knowledgeBaseText}
            \n\nHilf dabei, Bugs zu identifizieren und leite den Benutzer, wie er weitere Details bereitstellen kann.
        `,
        unknown: `
            Du bist ein AI-Supporter namens BravoDesk. Ich bin mir nicht sicher, welche Kategorie dieses Ticket hat.
            Bei Fragen die nichts mit FiveM zu tun haben sei höflich und sag dem user das du ihm dabei nicht weiterhelfen kannst
            NUR FIVEM KEIN ANDERES SPIEL ODER PROGRAMM
            Hier sind die letzten Nachrichten im Ticket und relevantes Wissen:
            \n\n${messages}\n\nZusätzliches Wissen:\n${knowledgeBaseText}
            \n\nAntworte höflich und versuche, weitere Details vom Benutzer zu erfragen.
        `,
    };

    const systemPrompt = prompts[category] || prompts.unknown;
    Logger.info('Generierter Systemprompt:', systemPrompt);

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
        Logger.error(`Fehler bei der Anfrage an die OpenAI API: ${error.message}`);
        return 'Entschuldigung, es gab ein Problem mit der Anfrage an die KI.';
    }
}
