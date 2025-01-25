const { getData, upload } = require('../Database/qdrant.js');
const Logger = require('../helper/loggerHelper.js');
const { Insert } = require('../Database/database.js');
const axios = require('axios');
require('dotenv').config(); 

module.exports = async (client, message) => {
    // 1. Bots ignorieren
    if (message.author.bot) return;
    // 2. Ticket-Logik
    if (isTicketChannel(message.channel)) {
        
        const isAiTicket = await isAiSupportTicket(message.channel);
        if (!isAiTicket) {
            // Wenn es kein KI-Ticket ist (also 'Mensch'),
            // dann soll die AI nicht mehr antworten oder was immer du hier vorhast.
            return;
        }
        
        try {
            const messages = await collectMessagesFromChannel(message.channel, client, message);

            if (!messages.includes("ein menschlicher Supporter wird das Ticket übernehmen!")) {
                const category = getCategoryFromChannelTopic(message.channel);
                const aiResponse = await sendMessagesToAI(messages, message, category);
                await message.channel.send(aiResponse);
            }
        } catch (error) {
            Logger.error(`Fehler beim Verarbeiten der Nachricht im Ticket-Kanal (${message.channel.name}): ${error.message}\n${error.stack}`);
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
                    Logger.error(`Fehler beim Speichern der Keys in der Datenbank: ${error.message}\n${error.stack}`);
                    await message.reply('Es gab einen Fehler beim Speichern der Keys in der Datenbank.');
                }
                Logger.success(`Es wurden ${amountToGenerate} neue keys erstellt`)
            } 
        } catch (error) {
            Logger.debug(`Fehler bei der Key-Generierung: ${error.message}\n${error.stack}`);
        }
    }
    // 4. DM-Check: Upload für daten zur GeneralInformation Collection
    if (!message.guild) {
        if (!message.author.id === '639759741555310612') {
            Logger.report(`Username: ${message.author.username}, Tag: ${message.author.tag}, ID: ${message.author.id} hat probiert neue keys zu erstellen`);
        }
    
        try {
            if (message.content.startsWith('!upload')) {
                try {
                    // Entfernt den Befehl '!upload' und speichert nur den Text danach
                    const content = message.content.slice('!upload'.length).trim();
                    
                    await upload('GeneralInformation', content);

                    // Hier kannst du den Code einfügen, der die Daten speichert
                    Logger.info(`Gespeicherter Text: ${content}`);
    
                    await message.reply('Deine Daten wurden erfolgreich gespeichert.');
                } catch (error) {
                    Logger.error(`Fehler beim Uploaden der Daten: ${error.message}`);
                    await message.reply('Es gab einen Fehler beim Speichern der Keys in der Datenbank.');
                }
            }
        } catch (error) {
            Logger.debug(error);
        }
    }
};

async function isAiSupportTicket(channel) {
    try {
        const fetchedMessages = await channel.messages.fetch({ limit: 10 });
        const oldestMessage = fetchedMessages.last();

        const embed = oldestMessage.embeds[0];
        const embedData = embed.toJSON();

        if (embedData.fields) {
            const supportField = embedData.fields.find(f => f.name === 'Support');
            if (supportField && supportField.value === 'KI') {
                return true;
            }
        }

        return false;
    } catch (error) {
        console.error('Fehler in isAiSupportTicket:', error);
        return false;
    }
}


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
    let knowledgebasetextTwo = '';
    try {
        lastMessage.channel.sendTyping();
        const collectionName = `guild_${lastMessage.guild.id}`;
        const data = await getData(collectionName, lastMessage.content);
        const dataTwo = await getData("GeneralInformation", lastMessage.content);

        if (data && data.length > 0) {
            knowledgeBaseText = data.map(item => item.payload.text).join('\n');
            knowledgebasetextTwo = dataTwo.map(item => item.payload.text).join('\n');
            Logger.debug(knowledgeBaseText);
        } else {
            knowledgeBaseText = "Nichts passendes gefunden!";
        }
    } catch (error) {
        Logger.error(`Fehler beim Abrufen der Wissensdatenbank: ${error.message}\n${error.stack}`);
        knowledgeBaseText = 'Es gab ein Problem beim Abrufen der Serverdaten.';
    }

    const prompts = {
        technical_support: `
            Du bist ein AI-Supporter namens BravoDesk, spezialisiert auf technischen Support für FiveM-Server.
    
            Regeln:
            - Beantworte ausschließlich Fragen zu FiveM, z. B. Installation, Connection Probleme, Saltychat.
            - Für Fragen, die nichts mit FiveM zu tun haben, antworte höflich und erkläre, dass du nicht helfen kannst.
              Beispielantwort: „Es tut mir leid, ich bin spezialisiert auf FiveM-Themen und kann dir bei dieser Frage leider nicht weiterhelfen.“

            Wenn du nicht weiter weißt:
            - Antworte mit "ich weiß leider nicht weiter, ein menschlicher Supporter wird das Ticket übernehmen!"
            
            Kontext:
            - Letzte Nachrichten im Ticket:
              ${messages}
            - Zusätzliches Wissen:
              ${knowledgeBaseText}
              ${knowledgebasetextTwo}
    
            Ziel:
            - Biete technische Unterstützung für FiveM-bezogene Themen an und leite Nutzer präzise an.
        `,
        general_questions: `
            Du bist BravoDesk, ein spezialisierter KI-Supporter. Deine Aufgabe ist es, ausschließlich Nutzerfragen zu FiveM zu beantworten.
    
            Regeln:
            1. **Nur FiveM-bezogene Themen beantworten:** Reagiere nur auf Fragen zu Regeln, Connection Probleme oder Modding in Bezug auf FiveM.
            2. **Keine Antworten zu allgemeinen Themen:** Falls die Frage nicht mit FiveM zu tun hat, antworte höflich, aber klar:
               Beispiel: „Es tut mir leid, ich bin spezialisiert auf FiveM-Themen und kann dir bei dieser Frage leider nicht weiterhelfen.“
            3. **Ignoriere allgemeines Wissen:** Beantworte niemals Fragen zu allgemeinen Themen, selbst wenn die Antwort offensichtlich ist.

            Wenn du nicht weiter weißt:
            - Antworte mit "ich weiß leider nicht weiter, ein menschlicher Supporter wird das Ticket übernehmen!"

            Kontext:
            - Letzte Nachrichten im Ticket:
              ${messages}
            - Zusätzliches Wissen:
              ${knowledgeBaseText}
              ${knowledgebasetextTwo}
    
            Ziel:
            - Antworte höflich und unterstützend, sofern es sich um FiveM-Themen handelt.
        `,
        suggestions: `
            Du bist ein AI-Supporter namens BravoDesk, spezialisiert auf das Sammeln und Verwalten von Verbesserungsvorschlägen für FiveM-Server.
    
            Regeln:
            - Beantworte nur Vorschläge, die sich auf FiveM und den discord server beziehen.
            - Für Themen, die nichts mit FiveM oder discord zu tun haben, antworte höflich und erkläre, dass du nicht helfen kannst.
              Beispielantwort: „Es tut mir leid, ich bin spezialisiert auf FiveM-Themen und kann dir bei dieser Frage leider nicht weiterhelfen.“
    
            Wenn du nicht weiter weißt:
            - Antworte mit "ich weiß leider nicht weiter, ein menschlicher Supporter wird das Ticket übernehmen!"

            Kontext:
            - Letzte Nachrichten im Ticket:
              ${messages}
            - Zusätzliches Wissen:
              ${knowledgeBaseText}
              ${knowledgebasetextTwo}
    
            Ziel:
            - Reagiere positiv auf Vorschläge und ermutige den Benutzer, weitere Ideen einzubringen.
        `,
        bug_report: `
            Du bist ein AI-Supporter namens BravoDesk, spezialisiert auf die Bearbeitung von Bug Reports für FiveM.
    
            Regeln:
            - Unterstütze nur bei der Meldung und Analyse von Fehlern, die mit FiveM zu tun haben.
            - Bei anderen Themen antworte höflich und erkläre, dass du nicht helfen kannst.
              Beispielantwort: „Es tut mir leid, ich bin spezialisiert auf FiveM-Themen und kann dir bei dieser Frage leider nicht weiterhelfen.“

            Wenn du nicht weiter weißt:
            - Antworte mit "ich weiß leider nicht weiter, ein menschlicher Supporter wird das Ticket übernehmen!"

            Kontext:
            - Letzte Nachrichten im Ticket:
              ${messages}
            - Zusätzliches Wissen:
              ${knowledgeBaseText}
              ${knowledgebasetextTwo}
    
            Ziel:
            - Hilf dem Benutzer, Bugs zu identifizieren, und fordere weitere Details an, wenn nötig.
        `,
        unknown: `
            Du bist ein AI-Supporter namens BravoDesk. Ich bin mir nicht sicher, welche Kategorie dieses Ticket hat.
    
            Regeln:
            - Antworte nur auf Themen, die sich auf FiveM beziehen.
            - Für andere Themen antworte höflich und erkläre, dass du nicht helfen kannst.
              Beispielantwort: „Es tut mir leid, ich bin spezialisiert auf FiveM-Themen und kann dir bei dieser Frage leider nicht weiterhelfen.“
    
            Wenn du nicht weiter weißt:
            - Antworte mit "ich weiß leider nicht weiter, ein menschlicher Supporter wird das Ticket übernehmen!"

            Kontext:
            - Letzte Nachrichten im Ticket:
              ${messages}
            - Zusätzliches Wissen:
              ${knowledgeBaseText}
              ${knowledgebasetextTwo}
    
            Ziel:
            - Bitte den Benutzer um mehr Details, um die Anfrage besser einordnen zu können.
        `,
    };
    

    const systemPrompt = prompts[category] || prompts.unknown;

    console.log(systemPrompt)

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
        Logger.error(`Fehler bei der Anfrage an die OpenAI API: ${error.message}\n${error.stack}`);
        return 'Entschuldigung, es gab ein Problem mit der Anfrage an die KI.';
    }
}
