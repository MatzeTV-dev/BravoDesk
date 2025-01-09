const { getData } = require('../Database/qdrant.js');
const axios = require('axios');
const Logger = require('../helper/loggerHelper.js');
const { Insert } = require('../Database/database.js');
require('dotenv').config(); 

module.exports = async (client, message) => {
    // 1. Bots ignorieren
    if (message.author.bot) return;

    // 2. Ticket-Logik
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

    // 3. DM-Check: Key-Generierung
    //    (Nur, wenn keine Guild vorhanden: !message.guild und User-ID stimmt)
    if (!message.guild) {
        if (!message.author.id === '639759741555310612') Logger.report(`Username: ${message.author.username}, Tag: ${message.author.tag}, ID: ${message.author.id} hat probiert neue keys zu erstellen`)
        try {
            if (message.content.startsWith('!generate')) {
                const args = message.content.trim().split(/\s+/);
                const amountToGenerate = parseInt(args[1], 10);

                // Parameter extrahieren (z.B. "5" => 5 Keys)
                if (isNaN(amountToGenerate) || amountToGenerate <= 0) {
                    return message.reply('Bitte gib eine gültige Anzahl ein!');
                }
            
                // Funktion: generiere 1 Key
                function generateUniqueKey() {
                    // 10 Buchstaben (A-Z) + 10 Ziffern (0-9) = 20 Zeichen
                    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                    const digits = '0123456789';

                    let partLetters = '';
                    for (let i = 0; i < 10; i++) {
                        partLetters += letters.charAt(Math.floor(Math.random() * letters.length));
                    }

                    let partDigits = '';
                    for (let i = 0; i < 5; i++) {
                        partDigits += digits.charAt(Math.floor(Math.random() * digits.length));
                    }

                    // Zusammenfügen: Buchstaben gefolgt von Ziffern
                    return partLetters + partDigits;
                }

                // Keys erzeugen
                const keysArray = [];
                for (let i = 0; i < amountToGenerate; i++) {
                    keysArray.push(generateUniqueKey());
                }

                // Keys in der Datenbank speichern
                try {
                    for (const key of keysArray) {
                        await Insert(
                        'INSERT INTO activation_keys (activation_key) VALUES (?)',
                        [key]
                        );
                    }
                    // Antwort an dich mit den erzeugten Keys
                    await message.reply(`Ich habe dir ${amountToGenerate} Key(s) erstellt:\n` + keysArray.join('\n'));
                } catch (error) {
                    Logger.error(`Fehler beim Speichern der Keys in der Datenbank: ${error.message}`);
                    await message.reply('Es gab einen Fehler beim Speichern der Keys in der Datenbank.');
                }
                Logger.success(`Es wurden ${amountToGenerate} neue keys erstellt`)
            } 
        } catch (error) {
            Logger.error(error)
        }
    }
};

// Prüfen, ob ein Kanal ein Ticket-Kanal ist
function isTicketChannel(channel) {
    if (!channel || !channel.name) return false;
    return channel.name.endsWith('s-ticket');
}

// Kategorie aus dem Channel-Topic ermitteln
function getCategoryFromChannelTopic(channel) {
    const topic = channel.topic || '';
    if (topic.includes('Technischer Support')) return 'technical_support';
    if (topic.includes('Allgemeine Frage')) return 'general_questions';
    if (topic.includes('Verbesserungsvorschlag')) return 'suggestions';
    if (topic.includes('Bug Report')) return 'bug_report';
    return 'unknown';
}

// Nachrichten aus dem Kanal sammeln
async function collectMessagesFromChannel(channel, client, triggeringMessage) {
    const collectedMessages = [];
    const allMessages = new Map();

    const aiBotUserId = client.user.id; // AI-Bot-ID
    allMessages.set(triggeringMessage.id, triggeringMessage); // Auslöser hinzufügen

    let lastMessageId = null;
    const maxMessages = 10; // Limit auf 10 Nachrichten

    while (allMessages.size < maxMessages) {
        const options = { limit: 50 };
        if (lastMessageId) {
            options.before = lastMessageId;
        }

        const messages = await channel.messages.fetch(options);
        if (messages.size === 0) break;

        for (const [id, msg] of messages) {
            if (allMessages.size >= maxMessages) break;
            // Fremde Bots ignorieren, AI-Bot zulassen
            if (msg.author.bot && msg.author.id !== aiBotUserId) continue;
            allMessages.set(id, msg);
        }

        lastMessageId = messages.last().id;
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Sortieren nach Timestamp
    const messageArray = Array.from(allMessages.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    for (const msg of messageArray) {
        const member = await channel.guild.members.fetch(msg.author.id).catch(() => null);

        let prefix = '';
        if (msg.author.id === aiBotUserId) {
            prefix = 'AI - Support: ';
        } else if (member && member.roles.cache.some(role => role.name === 'Supporter')) {
            prefix = 'Support: ';
        } else if (!msg.author.bot) {
            prefix = 'User: ';
        } else {
            continue; // andere Bots ignorieren
        }

        const content = msg.content || '';
        collectedMessages.push(`${prefix}${content}`);
    }

    return collectedMessages.join('\n').trim();
}

// Nachricht an die AI schicken
async function sendMessagesToAI(messages, lastMessage, category) {
    let knowledgeBaseText = '';

    try {
        const collectionName = `guild_${lastMessage.guild.id}`;
        const data = await getData(collectionName, lastMessage.content);

        if (data && data.length > 0) {
            knowledgeBaseText = data.map(item => item.payload.text).join('\n');
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
            Bei Fragen, die nichts mit FiveM zu tun haben, sei höflich und sag dem User, dass du ihm nicht helfen kannst.
            NUR FIVEM, KEIN ANDERES SPIEL.
            Hier sind die letzten Nachrichten im Ticket und relevantes Wissen:
            
            ${messages}
            
            Zusätzliches Wissen:
            ${knowledgeBaseText}
            
            Antworte auf technische Fragen und biete technische Unterstützung für FiveM an.
        `,
        general_questions: `
            Du bist ein AI-Supporter namens BravoDesk, spezialisiert auf allgemeine Fragen.
            Bei Fragen, die nichts mit FiveM zu tun haben, sei höflich und sag dem User, dass du ihm nicht helfen kannst.
            Hier sind die letzten Nachrichten im Ticket und relevantes Wissen:
            
            ${messages}
            
            Zusätzliches Wissen:
            ${knowledgeBaseText}
            
            Antworte höflich und hilfsbereit auf allgemeine Fragen.
        `,
        suggestions: `
            Du bist ein AI-Supporter namens BravoDesk, der Verbesserungsvorschläge für FiveM-Server sammelt.
            Bei Fragen, die nichts mit FiveM zu tun haben, sei höflich und sag dem User, dass du ihm nicht helfen kannst.
            Hier sind die letzten Nachrichten im Ticket und relevantes Wissen:
            
            ${messages}
            
            Zusätzliches Wissen:
            ${knowledgeBaseText}
            
            Antworte höflich und ermutige den Benutzer, weitere Vorschläge zu machen.
        `,
        bug_report: `
            Du bist ein AI-Supporter namens BravoDesk, spezialisiert auf die Bearbeitung von Bug Reports.
            Bei Fragen, die nichts mit FiveM zu tun haben, sei höflich und sag dem User, dass du ihm nicht helfen kannst.
            Hier sind die letzten Nachrichten im Ticket und relevantes Wissen:
            
            ${messages}
            
            Zusätzliches Wissen:
            ${knowledgeBaseText}
            
            Hilf dabei, Bugs zu identifizieren und leite den Benutzer an, weitere Details bereitzustellen.
        `,
        unknown: `
            Du bist ein AI-Supporter namens BravoDesk. Ich bin mir nicht sicher, welche Kategorie dieses Ticket hat.
            Bei Fragen, die nichts mit FiveM zu tun haben, sei höflich und sag dem User, dass du ihm nicht helfen kannst.
            Hier sind die letzten Nachrichten im Ticket und relevantes Wissen:
            
            ${messages}
            
            Zusätzliches Wissen:
            ${knowledgeBaseText}
            
            Antworte höflich und versuche, mehr Details vom Benutzer zu bekommen.
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

        return response.data.choices[0].message.content || 'Entschuldigung, keine passende Antwort gefunden.';
    } catch (error) {
        Logger.error(`Fehler bei der Anfrage an die OpenAI API: ${error.message}`);
        return 'Entschuldigung, es gab ein Problem mit der Anfrage an die KI.';
    }
}
