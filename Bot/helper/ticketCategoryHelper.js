// helper/ticketCategoryHelper.js
const { dbGetCategories, dbCreateCategory, dbDeleteCategory } = require('../Database/database.js');
const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

// Standard-Kategorien (mit vollständigen AI‑Prompts)
function getDefaultCategories() {
  return [
    {
      label: "Technischer Support",
      description: "Fragen zu technischen Problemen",
      value: "technical_support",
      emoji: "📺",
      aiPrompt: "Du bist ein AI-Supporter namens BravoDesk, spezialisiert auf technischen Support für FiveM-Server.\n\nRegeln:\n- Beantworte ausschließlich Fragen zu FiveM, z. B. Installation, Connection Probleme, Saltychat.\n- Für Fragen, die nichts mit FiveM zu tun haben, antworte höflich und erkläre, dass du nicht helfen kannst. Beispiel: \"Es tut mir leid, ich bin spezialisiert auf FiveM-Themen und kann dir bei dieser Frage leider nicht weiterhelfen.\"\n\nWenn du nicht weiter weißt:\n- Antworte mit \"ich weiß leider nicht weiter, ein menschlicher Supporter wird das Ticket übernehmen!\"\n\nKontext:\n- Letzte Nachrichten im Ticket: {messages}\n- Zusätzliches Wissen:\n  {knowledgeBaseText}\n  {knowledgebasetextTwo}\n\nZiel:\n- Biete technische Unterstützung für FiveM-bezogene Themen an und leite Nutzer präzise an.",
      aiEnabled: true
    },
    {
      label: "Allgemeine Fragen",
      description: "Haben Sie allgemeine Fragen?",
      value: "general_questions",
      emoji: "❓",
      aiPrompt: "Du bist BravoDesk, ein spezialisierter KI-Supporter. Deine Aufgabe ist es, ausschließlich Nutzerfragen zu FiveM zu beantworten.\n\nRegeln:\n1. **Nur FiveM-bezogene Themen beantworten:** Reagiere nur auf Fragen zu Regeln, Connection Probleme oder Modding in Bezug auf FiveM.\n2. **Keine Antworten zu allgemeinen Themen:** Falls die Frage nicht mit FiveM zu tun hat, antworte höflich, aber klar: \"Es tut mir leid, ich bin spezialisiert auf FiveM-Themen und kann dir bei dieser Frage leider nicht weiterhelfen.\"\n3. **Ignoriere allgemeines Wissen:** Beantworte niemals Fragen zu allgemeinen Themen, selbst wenn die Antwort offensichtlich ist.\n\nWenn du nicht weiter weißt:\n- Antworte mit \"ich weiß leider nicht weiter, ein menschlicher Supporter wird das Ticket übernehmen!\"\n\nKontext:\n- Letzte Nachrichten im Ticket: {messages}\n- Zusätzliches Wissen:\n  {knowledgeBaseText}\n  {knowledgebasetextTwo}\n\nZiel:\n- Antworte höflich und unterstützend, sofern es sich um FiveM-Themen handelt.",
      aiEnabled: true
    },
    {
      label: "Verbesserungsvorschläge",
      description: "Teilen Sie uns Ihre Vorschläge mit",
      value: "suggestions",
      emoji: "⭐",
      aiPrompt: "Du bist ein AI-Supporter namens BravoDesk, spezialisiert auf das Sammeln und Verwalten von Verbesserungsvorschlägen für FiveM-Server.\n\nRegeln:\n- Beantworte nur Vorschläge, die sich auf FiveM und den Discord-Server beziehen.\n- Für Themen, die nichts mit FiveM oder Discord zu tun haben, antworte höflich und erkläre, dass du nicht helfen kannst. Beispiel: \"Es tut mir leid, ich bin spezialisiert auf FiveM-Themen und kann dir bei dieser Frage leider nicht weiterhelfen.\"\n\nWenn du nicht weiter weißt:\n- Antworte mit \"ich weiß leider nicht weiter, ein menschlicher Supporter wird das Ticket übernehmen!\"\n\nKontext:\n- Letzte Nachrichten im Ticket: {messages}\n- Zusätzliches Wissen:\n  {knowledgeBaseText}\n  {knowledgebasetextTwo}\n\nZiel:\n- Reagiere positiv auf Vorschläge und ermutige den Benutzer, weitere Ideen einzubringen.",
      aiEnabled: true
    },
    {
      label: "Bug Report",
      description: "Haben Sie einen Fehler gefunden?",
      value: "bug_report",
      emoji: "👾",
      aiPrompt: "Du bist ein AI-Supporter namens BravoDesk, spezialisiert auf die Bearbeitung von Bug Reports für FiveM.\n\nRegeln:\n- Unterstütze nur bei der Meldung und Analyse von Fehlern, die mit FiveM zu tun haben.\n- Bei anderen Themen antworte höflich und erkläre, dass du nicht helfen kannst. Beispiel: \"Es tut mir leid, ich bin spezialisiert auf FiveM-Themen und kann dir bei dieser Frage leider nicht weiterhelfen.\"\n\nWenn du nicht weiter weißt:\n- Antworte mit \"ich weiß leider nicht weiter, ein menschlicher Supporter wird das Ticket übernehmen!\"\n\nKontext:\n- Letzte Nachrichten im Ticket: {messages}\n- Zusätzliches Wissen:\n  {knowledgeBaseText}\n  {knowledgebasetextTwo}\n\nZiel:\n- Hilf dem Benutzer, Bugs zu identifizieren, und fordere weitere Details an, wenn nötig.",
      aiEnabled: true
    }
  ];
}

// Holt die Kategorien für einen Guild aus der DB.
// Falls noch keine Kategorien vorhanden sind, werden die Default-Kategorien in die DB eingefügt.
async function getCategories(guildId) {
  let categories = await dbGetCategories(guildId);
  if (!categories || categories.length === 0) {
    const defaults = getDefaultCategories();
    for (const cat of defaults) {
      await dbCreateCategory(guildId, cat);
    }
    categories = defaults;
  } else {
    // Falls permission als JSON-String gespeichert wurde, parse sie
    categories = categories.map(cat => {
      if (cat.permission) {
        try {
          cat.permission = JSON.parse(cat.permission);
        } catch (err) {
          cat.permission = [];
        }
      } else {
        cat.permission = [];
      }
      return cat;
    });
  }
  return categories;
}

// Legt eine neue Kategorie in der DB an.
async function createCategory(guildId, category) {
  await dbCreateCategory(guildId, category);
}

// Löscht eine Kategorie anhand des Labels (case-insensitive)
async function deleteCategory(guildId, label) {
  await dbDeleteCategory(guildId, label);
}

/**
 * Aktualisiert das Dropdown-Menü im "ticket-system"-Channel des angegebenen Servers.
 *
 * @param {Guild} guild - Der Discord-Server.
 */
async function updateTicketCreationMessage(guild) {
  const channel = guild.channels.cache.find(
    ch => ch.name.toLowerCase() === 'ticket-system' && ch.type === 0
  );
  if (!channel) return;
  const messages = await channel.messages.fetch({ limit: 1, after: '0' });
  const ticketMessage = messages.first();
  if (!ticketMessage) return;
  
  const categories = await getCategories(guild.id);
  
  const options = categories.map(cat => ({
    label: cat.label,
    description: cat.description
      ? (cat.description.length > 100 ? cat.description.slice(0, 97) + "..." : cat.description)
      : ' ',
    value: cat.value || cat.label
  }));
  
  options.forEach(option => {
    const cat = categories.find(c => (c.value || c.label).trim().toLowerCase() === option.value.trim().toLowerCase());
    if (cat && cat.emoji && cat.emoji.trim() !== '') {
      option.emoji = { name: cat.emoji };
    }
  });
  
  let newSelectMenu = new StringSelectMenuBuilder()
    .setCustomId('create_ticket_ticket_category')
    .setPlaceholder('Wählen Sie eine Kategorie aus...')
    .addOptions(options);
  
  let row = new ActionRowBuilder().addComponents(newSelectMenu);
  
  try {
    await ticketMessage.edit({ components: [row] });
  } catch (err) {
    // Falls der Fehler wegen ungültiger Emojis kommt, entferne alle Emojis und versuche es erneut
    if (err.message.includes("Invalid emoji")) {
      console.error("Ungültige Emojis gefunden – versuche ohne Emojis.");
      
      options.forEach(option => {
        if (option.emoji) {
          delete option.emoji;
        }
      });
      
      newSelectMenu = new StringSelectMenuBuilder()
        .setCustomId('create_ticket_ticket_category')
        .setPlaceholder('Wählen Sie eine Kategorie aus...')
        .addOptions(options);
      
      row = new ActionRowBuilder().addComponents(newSelectMenu);
      
      try {
        await ticketMessage.edit({ components: [row] });
        console.log("Dropdown-Menü wurde ohne Emojis aktualisiert.");
      } catch (err2) {
        console.error(`Fehler beim Aktualisieren des Dropdown-Menüs ohne Emoji: ${err2.message}`);
      }
    } else {
      console.error(`Fehler beim Aktualisieren des Dropdown-Menüs: ${err.message}`);
    }
  }
}


module.exports = {
  getCategories,
  createCategory,
  deleteCategory,
  updateTicketCreationMessage
};
