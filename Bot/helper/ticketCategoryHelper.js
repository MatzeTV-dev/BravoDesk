// helper/ticketCategoryHelper.js
const fs = require('fs');
const path = require('path');
const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

// Pfad zur JSON-Datei – passe den Pfad ggf. an deine Ordnerstruktur an
const filePath = path.join(__dirname, '../data/ticket_categories.json');

// Hilfsfunktion: Gesamtdaten laden
function loadAllData() {
  if (!fs.existsSync(filePath)) {
    return { guilds: {} };
  }
  const rawData = fs.readFileSync(filePath, 'utf-8');
  try {
    return JSON.parse(rawData);
  } catch (err) {
    throw new Error('Fehler beim Parsen der ticket_categories.json');
  }
}

// Hilfsfunktion: Gesamtdaten speichern
function saveAllData(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Standard-Kategorien (mit vollständigen AI‑Prompts inklusive Platzhaltern)
function getDefaultCategories() {
  return [
    {
      "label": "Technischer Support",
      "description": "Fragen zu technischen Problemen",
      "value": "technical_support",
      "emoji": "📺",
      "aiPrompt": "Du bist ein AI-Supporter namens BravoDesk, spezialisiert auf technischen Support für FiveM-Server.\n\nRegeln:\n- Beantworte ausschließlich Fragen zu FiveM, z. B. Installation, Connection Probleme, Saltychat.\n- Für Fragen, die nichts mit FiveM zu tun haben, antworte höflich und erkläre, dass du nicht helfen kannst. Beispiel: \"Es tut mir leid, ich bin spezialisiert auf FiveM-Themen und kann dir bei dieser Frage leider nicht weiterhelfen.\"\n\nWenn du nicht weiter weißt:\n- Antworte mit \"ich weiß leider nicht weiter, ein menschlicher Supporter wird das Ticket übernehmen!\"\n\nKontext:\n- Letzte Nachrichten im Ticket: {messages}\n- Zusätzliches Wissen:\n  {knowledgeBaseText}\n  {knowledgebasetextTwo}\n\nZiel:\n- Biete technische Unterstützung für FiveM-bezogene Themen an und leite Nutzer präzise an.",
      "aiEnabled": true
    },
    {
      "label": "Allgemeine Fragen",
      "description": "Haben Sie allgemeine Fragen?",
      "value": "general_questions",
      "emoji": "❓",
      "aiPrompt": "Du bist BravoDesk, ein spezialisierter KI-Supporter. Deine Aufgabe ist es, ausschließlich Nutzerfragen zu FiveM zu beantworten.\n\nRegeln:\n1. **Nur FiveM-bezogene Themen beantworten:** Reagiere nur auf Fragen zu Regeln, Connection Probleme oder Modding in Bezug auf FiveM.\n2. **Keine Antworten zu allgemeinen Themen:** Falls die Frage nicht mit FiveM zu tun hat, antworte höflich, aber klar: \"Es tut mir leid, ich bin spezialisiert auf FiveM-Themen und kann dir bei dieser Frage leider nicht weiterhelfen.\"\n3. **Ignoriere allgemeines Wissen:** Beantworte niemals Fragen zu allgemeinen Themen, selbst wenn die Antwort offensichtlich ist.\n\nWenn du nicht weiter weißt:\n- Antworte mit \"ich weiß leider nicht weiter, ein menschlicher Supporter wird das Ticket übernehmen!\"\n\nKontext:\n- Letzte Nachrichten im Ticket: {messages}\n- Zusätzliches Wissen:\n  {knowledgeBaseText}\n  {knowledgebasetextTwo}\n\nZiel:\n- Antworte höflich und unterstützend, sofern es sich um FiveM-Themen handelt.",
      "aiEnabled": true
    },
    {
      "label": "Verbesserungsvorschläge",
      "description": "Teilen Sie uns Ihre Vorschläge mit",
      "value": "suggestions",
      "emoji": "⭐",
      "aiPrompt": "Du bist ein AI-Supporter namens BravoDesk, spezialisiert auf das Sammeln und Verwalten von Verbesserungsvorschlägen für FiveM-Server.\n\nRegeln:\n- Beantworte nur Vorschläge, die sich auf FiveM und den Discord-Server beziehen.\n- Für Themen, die nichts mit FiveM oder Discord zu tun haben, antworte höflich und erkläre, dass du nicht helfen kannst. Beispiel: \"Es tut mir leid, ich bin spezialisiert auf FiveM-Themen und kann dir bei dieser Frage leider nicht weiterhelfen.\"\n\nWenn du nicht weiter weißt:\n- Antworte mit \"ich weiß leider nicht weiter, ein menschlicher Supporter wird das Ticket übernehmen!\"\n\nKontext:\n- Letzte Nachrichten im Ticket: {messages}\n- Zusätzliches Wissen:\n  {knowledgeBaseText}\n  {knowledgebasetextTwo}\n\nZiel:\n- Reagiere positiv auf Vorschläge und ermutige den Benutzer, weitere Ideen einzubringen.",
      "aiEnabled": true
    },
    {
      "label": "Bug Report",
      "description": "Haben Sie einen Fehler gefunden?",
      "value": "bug_report",
      "emoji": "👾",
      "aiPrompt": "Du bist ein AI-Supporter namens BravoDesk, spezialisiert auf die Bearbeitung von Bug Reports für FiveM.\n\nRegeln:\n- Unterstütze nur bei der Meldung und Analyse von Fehlern, die mit FiveM zu tun haben.\n- Bei anderen Themen antworte höflich und erkläre, dass du nicht helfen kannst. Beispiel: \"Es tut mir leid, ich bin spezialisiert auf FiveM-Themen und kann dir bei dieser Frage leider nicht weiterhelfen.\"\n\nWenn du nicht weiter weißt:\n- Antworte mit \"ich weiß leider nicht weiter, ein menschlicher Supporter wird das Ticket übernehmen!\"\n\nKontext:\n- Letzte Nachrichten im Ticket: {messages}\n- Zusätzliches Wissen:\n  {knowledgeBaseText}\n  {knowledgebasetextTwo}\n\nZiel:\n- Hilf dem Benutzer, Bugs zu identifizieren, und fordere weitere Details an, wenn nötig.",
      "aiEnabled": true
    }
  ];
}

// Gibt für einen bestimmten Guild (Server) die Ticket-Kategorien zurück.
// Falls für diesen Server noch keine Kategorien existieren, werden die Standard-Kategorien angelegt.
function getCategories(guildId) {
  const data = loadAllData();
  if (!data.guilds[guildId]) {
    data.guilds[guildId] = { categories: getDefaultCategories() };
    saveAllData(data);
  }
  return data.guilds[guildId].categories;
}

// Speichert für einen bestimmten Guild (Server) die übergebenen Kategorien.
function saveCategories(guildId, categories) {
  const data = loadAllData();
  data.guilds[guildId] = { categories };
  saveAllData(data);
}

/**
 * Aktualisiert das Dropdown-Menü im "ticket-system"-Channel des angegebenen Servers.
 * Dabei werden alle Kategorien aus der JSON (für diesen Server) durchlaufen und als Optionen
 * für das Select Menu verwendet.
 *
 * @param {Guild} guild - Der Discord-Server.
 */
async function updateTicketCreationMessage(guild) {
  // Finde den "ticket-system" Channel (als Text-Channel)
  const channel = guild.channels.cache.find(ch => ch.name.toLowerCase() === 'ticket-system' && ch.type === 0);
  if (!channel) return;

  // Hole die allererste Nachricht im Channel (älteste Nachricht)
  const messages = await channel.messages.fetch({ limit: 1, after: '0' });
  const ticketMessage = messages.first();
  if (!ticketMessage) return;

  // Lade die Kategorien des Servers
  const categories = getCategories(guild.id);
  
  // Erstelle die Options für das Dropdown-Menü
  const options = categories.map(cat => {
    const label = cat.label.slice(0, 100);
    const description = cat.description
      ? (cat.description.length > 100 ? cat.description.slice(0, 97) + "..." : cat.description)
      : ' ';
    const option = {
      label,
      description,
      value: label // Verwende den Kategorienamen als Schlüssel
    };

    // Wenn ein Emoji angegeben wurde, einfach übernehmen
    if (cat.emoji && cat.emoji.trim() !== '') {
      option.emoji = { name: cat.emoji };  // Einfaches Übernehmen des Emoji-Strings
    }
    return option;
  });

  const newSelectMenu = new StringSelectMenuBuilder()
    .setCustomId('create_ticket_ticket_category')
    .setPlaceholder('Wählen Sie eine Kategorie aus...')
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(newSelectMenu);

  try {
    await ticketMessage.edit({
      components: [row]
    });
  } catch (err) {
    Logger.error(`Fehler beim Aktualisieren des Dropdown-Menüs: ${err.message}`);
  }
}

module.exports = {
  getCategories,
  saveCategories,
  updateTicketCreationMessage
};