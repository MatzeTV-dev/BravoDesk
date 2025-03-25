import { getCategories, updateTicketCreationMessage } from '../helper/ticketCategoryHelper.js';
import { checkKeyValidity, GetActivationKey } from '../helper/keyHelper.js';
import { getServerInformation } from '../Database/database.js';
import { getData, upload } from '../Database/qdrant.js';
import axios from 'axios';
import Logger from '../helper/loggerHelper.js';
import 'dotenv/config';

/**
 * Ermittelt den Kategorien-Wert aus dem Channel-Topic.
 * Es wird ein Eintrag wie "Kategorie: <value>" erwartet.
 *
 * @param {Channel} channel - Der Discord-Channel.
 * @returns {string} - Der extrahierte Kategorien-Wert oder 'unknown'.
 */
function getCategoryFromChannelTopic(channel) {
  const topic = channel.topic || '';
  const regex = /Kategorie:\s*(\S+)/i;
  const match = topic.match(regex);
  if (match && match[1]) {
    return match[1].trim();
  }
  return 'unknown';
}

/**
 * Sendet die gesammelten Nachrichten und den aktuellen Input an die OpenAI-API.
 * Dabei wird der in der Kategorie hinterlegte AI-Prompt verwendet, in dem Platzhalter
 * wie {messages}, {knowledgeBaseText} und {knowledgebasetextTwo} automatisch ersetzt werden.
 *
 * @param {string} messages - Die gesammelten Nachrichten des Tickets.
 * @param {Message} lastMessage - Die zuletzt eingegangene Nachricht (als Trigger).
 * @returns {Promise<string>} - Die Antwort der KI oder eine Fehlermeldung.
 */
async function sendMessagesToAI(messages, lastMessage) {
  let result = await GetActivationKey(lastMessage.guild.id);
  if (!result.activation_key) {
    return "Es wurde kein Key gefunden...";
  }

  result = await checkKeyValidity(result.activation_key);
  if (!result.is_valid) {
    return "Es tut mir leid so wie es aussieht ist der Key ausgelaufen, bitte informiere einen Administrator...";
  }

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

  // Ermittele den Kategorien-Wert aus dem Channel-Topic
  const categoryValue = getCategoryFromChannelTopic(lastMessage.channel);

  // Lade asynchron die Kategorien des Servers anhand der Guild-ID
  const categories = await getCategories(lastMessage.guild.id);
  // Finde das passende Kategorien-Objekt
  let categoryObj = categories.find(cat => cat.value === categoryValue);
  if (!categoryObj) {
    // Fallback: Falls die Kategorie nicht gefunden wird
    categoryObj = {
      aiPrompt: "Du bist ein AI-Supporter. Letzte Nachrichten: {messages}\nZusätzliches Wissen:\n{knowledgeBaseText}\n{knowledgebasetextTwo}\nAntworte: \"ich weiß leider nicht weiter, ein menschlicher Supporter wird das Ticket übernehmen!\"",
      aiEnabled: true
    };
  }

  // Ersetze die Platzhalter im AI-Prompt
  let systemPrompt = categoryObj.aiPrompt;
  systemPrompt = systemPrompt.replace(/{messages}/g, messages);
  systemPrompt = systemPrompt.replace(/{knowledgeBaseText}/g, knowledgeBaseText);
  systemPrompt = systemPrompt.replace(/{knowledgebasetextTwo}/g, knowledgebasetextTwo);

  try {
    const response = await axios.post(
      process.env.OPENAI_URL,
      {
        model: process.env.MODELL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: lastMessage.content }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );
    return response.data.choices[0].message.content || 'Entschuldigung, keine passende Antwort gefunden.';
  } catch (error) {
    Logger.error(`Fehler bei der Anfrage an die OpenAI API: ${error.message}\n${error.stack}`);
    return 'Entschuldigung, es gab ein Problem mit der Anfrage an die KI.';
  }
}

/**
 * Prüft, ob ein Kanal als Ticket-Kanal zu betrachten ist.
 * Hier wird beispielsweise angenommen, dass der Kanalname mit "s-ticket" endet.
 *
 * @param {Channel} channel - Der zu prüfende Channel.
 * @returns {boolean} - true, wenn es ein Ticket-Kanal ist, sonst false.
 */
function isTicketChannel(channel) {
  if (!channel || !channel.name) return false;
  return channel.name.toLowerCase().endsWith('s-ticket');
}

/**
 * Prüft, ob es sich um ein KI-Support-Ticket handelt.
 * Es wird angenommen, dass die erste Nachricht (mit Embed) ein Feld "Support" mit dem Wert "KI" enthält.
 *
 * @param {Channel} channel - Der zu prüfende Channel.
 * @returns {Promise<boolean>} - true, wenn es ein KI-Ticket ist, sonst false.
 */
async function isAiSupportTicket(channel) {
  try {
    const fetchedMessages = await channel.messages.fetch({ limit: 1, after: "0" });
    const firstMessage = fetchedMessages.first();
    if (!firstMessage || firstMessage.embeds.length === 0) {
      return false;
    }
    const embed = firstMessage.embeds[0];
    const embedData = embed.toJSON();
    if (embedData.fields) {
      const supportField = embedData.fields.find(f => f.name === 'Support');
      if (supportField && supportField.value === 'KI') {
        return true;
      }
    }
    return false;
  } catch (error) {
    Logger.error(`Fehler in isAiSupportTicket: ${error.message}`);
    return false;
  }
}

/**
 * Sammelt Nachrichten aus dem Channel, um sie als Kontext an die KI zu senden.
 *
 * @param {Channel} channel - Der Discord-Channel.
 * @param {Client} client - Der Discord-Client.
 * @param {Message} triggeringMessage - Die Nachricht, die den KI-Aufruf ausgelöst hat.
 * @returns {Promise<string>} - Die zusammengefassten Nachrichten als String.
 */
async function collectMessagesFromChannel(channel, client, triggeringMessage) {
  const collectedMessages = [];
  const allMessages = new Map();

  const aiBotUserId = client.user.id;
  allMessages.set(triggeringMessage.id, triggeringMessage);

  let lastMessageId = null;
  const maxMessages = 10;

  while (allMessages.size < maxMessages) {
    const options = { limit: 50 };
    if (lastMessageId) {
      options.before = lastMessageId;
    }
    const messages = await channel.messages.fetch(options);
    if (messages.size === 0) break;
    for (const [id, msg] of messages) {
      if (allMessages.size >= maxMessages) break;
      if (msg.author.bot && msg.author.id !== aiBotUserId) continue;
      allMessages.set(id, msg);
    }
    lastMessageId = messages.last().id;
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  const messageArray = Array.from(allMessages.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  for (const msg of messageArray) {
    let prefix = '';
    if (msg.author.id === aiBotUserId) {
      prefix = 'AI - Support: ';
    } else if (!msg.author.bot) {
      prefix = 'User: ';
    } else {
      continue;
    }
    const content = msg.content || '';
    collectedMessages.push(`${prefix}${content}`);
  }

  return collectedMessages.join('\n').trim();
}

/**
 * Haupt-Message-Handler.
 */
export default async (client, message) => {
  // Bots ignorieren
  if (message.author.bot) return;

  // Falls die Nachricht als DM gesendet wurde, kann hier zusätzliche Logik implementiert werden.
  if (!message.guild) {
    return;
  }

  const serverInformation = await getServerInformation(message.guild.id);

  // Wenn die Nachricht im Ticket-System-Channel gesendet wird,
  // aktualisiere das Dropdown-Menü und beende die Verarbeitung.
  if (message.channel.id === serverInformation[0][0].ticket_system_channel_id) {
    try {
      await updateTicketCreationMessage(message.guild);
    } catch (err) {
      Logger.error(`Fehler beim Aktualisieren des Dropdown-Menüs: ${err.message}\n${err.stack}`);
    }
    return;
  }

  // Ticket-Logik: Nur fortfahren, wenn der Kanal als Ticket-Kanal gilt
  if (isTicketChannel(message.channel)) {
    try {
      // Vorübergehend Schreibrechte des Nutzers entfernen
      await message.channel.permissionOverwrites.edit(message.author.id, { SendMessages: false });
    } catch (err) {
      Logger.error(`Fehler beim Entfernen der Senderechte für ${message.author.id}: ${err.message}`);
    }

    try {
      const isAiTicket = await isAiSupportTicket(message.channel);
      if (!isAiTicket) {
        try {
          await message.channel.permissionOverwrites.edit(message.author.id, { SendMessages: true });
        } catch (err) {
          Logger.error(`Fehler beim Wiederherstellen der Senderechte für ${message.author.id}: ${err.message}`);
        }
        return;
      }

      const messagesCollected = await collectMessagesFromChannel(message.channel, client, message);
      if (!messagesCollected.includes("ein menschlicher Supporter wird das Ticket übernehmen!")) {
        const aiResponse = await sendMessagesToAI(messagesCollected, message);
        await message.channel.send(aiResponse);
      }
    } catch (error) {
      Logger.error(`Fehler beim Verarbeiten der Nachricht im Ticket-Kanal (${message.channel.name}): ${error.message}\n${error.stack}`);
      await message.channel.send('Es gab einen Fehler bei der Verarbeitung deiner Anfrage. Bitte versuche es später erneut.');
    } finally {
      try {
        await message.channel.permissionOverwrites.edit(message.author.id, { SendMessages: true });
      } catch (err) {
        Logger.error(`Fehler beim Wiederherstellen der Senderechte für ${message.author.id}: ${err.message}`);
      }
    }
  }

  // 3. DM-Check: Key-Generierung
  //    (Nur, wenn keine Guild vorhanden ist: !message.guild und User-ID stimmt)
  if (!message.guild) {
    if (message.author.id !== '639759741555310612') {
      Logger.report(`Username: ${message.author.username}, Tag: ${message.author.tag}, ID: ${message.author.id} hat probiert neue Keys zu erstellen`);
    }
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
          // 10 Buchstaben (A-Z) + 5 Ziffern (0-9) = 15 Zeichen
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
        Logger.success(`Es wurden ${amountToGenerate} neue Keys erstellt`);
      }
    } catch (error) {
      Logger.debug(`Fehler bei der Key-Generierung: ${error.message}\n${error.stack}`);
    }
  }

  // 4. DM-Check: Upload für Daten zur GeneralInformation Collection
  if (!message.guild) {
    if (message.author.id !== '639759741555310612') {
      Logger.report(`Username: ${message.author.username}, Tag: ${message.author.tag}, ID: ${message.author.id} hat probiert neue Keys zu erstellen`);
    }

    try {
      if (message.content.startsWith('!upload')) {
        try {
          // Entfernt den Befehl '!upload' und speichert nur den Text danach
          const content = message.content.slice('!upload'.length).trim();

          await upload('GeneralInformation', content);

          Logger.info(`Gespeicherter Text: ${content}`);

          await message.reply('Deine Daten wurden erfolgreich gespeichert.');
        } catch (error) {
          Logger.error(`Fehler beim Uploaden der Daten: ${error.message}`);
          await message.reply('Es gab einen Fehler beim Speichern der Daten in der Datenbank.');
        }
      }
    } catch (error) {
      Logger.debug(error);
    }
  }
};
