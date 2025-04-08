import { dbGetCategories, dbCreateCategory, dbDeleteCategory } from '../Database/database.js';
import { ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { updateTicketSystemChannelID } from './verification.js';
import { getServerInformation, Insert } from '../Database/database.js';
import Logger from './loggerHelper.js';

/**
 * Liefert die Standard-Kategorien mit vollständigen AI‑Prompts.
 *
 * @returns {Array<Object>} Array der Standard-Kategorien.
 */
function getDefaultCategories() {
  return [
    {
      label: "Technischer Support",
      description: "Fragen zu technischen Problemen",
      value: "technical_support",
      emoji: "📺",
      aiPrompt: "Biete technische Unterstützung für FiveM-bezogene Themen an und leite Nutzer präzise an.",
      aiEnabled: true
    },
    {
      label: "Allgemeine Fragen",
      description: "Haben Sie allgemeine Fragen?",
      value: "general_questions",
      emoji: "❓",
      aiPrompt: "Deine Aufgabe ist es, ausschließlich Nutzerfragen zu FiveM zu beantworten.",
      aiEnabled: true
    },
    {
      label: "Verbesserungsvorschläge",
      description: "Teilen Sie uns Ihre Vorschläge mit",
      value: "suggestions",
      emoji: "⭐",
      aiPrompt: "Reagiere positiv auf Vorschläge und ermutige den Benutzer, weitere Ideen einzubringen.",
      aiEnabled: true
    },
    {
      label: "Bug Report",
      description: "Haben Sie einen Fehler gefunden?",
      value: "bug_report",
      emoji: "👾",
      aiPrompt: "Hilf dem Benutzer, Bugs zu identifizieren, und fordere weitere Details an, wenn nötig.",
      aiEnabled: true
    }
  ];
}

/**
 * Speichert die Standard-Kategorien in die Datenbank für den angegebenen Server.
 *
 * @param {string} guildID - Die ID des Discord-Servers.
 * @returns {Promise<void>} - Signalisiert den Abschluss der Speicherung.
 */
export async function saveCategoriesToDB(guildID) {
  const categories = getDefaultCategories();
  try {
    for (const category of categories) {
      const statement = "INSERT INTO ticket_categories (guild_id, label, description, value, emoji, ai_prompt, ai_enabled) VALUES (?, ?, ?, ?, ?, ?, ?)";
      const aiEnabled = category.aiEnabled !== undefined ? category.aiEnabled : true;
      const dataInput = [guildID, category.label, category.description, category.value, category.emoji, category.aiPrompt, aiEnabled];
      await Insert(statement, dataInput);
    }
  } catch (error) {
    Logger.error(`Fehler beim speichern von den default Categories ${error.message, error.stack}`);
  }
}

/**
 * Holt die Kategorien für einen Guild aus der Datenbank.
 * Falls keine Kategorien vorhanden sind, werden die Default-Kategorien eingefügt.
 *
 * @param {string} guildId - Die ID des Guilds.
 * @returns {Promise<Array<Object>>} Array der Kategorien.
 */
async function getCategories(guildId) {
  let categories = await dbGetCategories(guildId);
  if (!categories || categories.length === 0) {
    const defaults = getDefaultCategories();
    for (const cat of defaults) {
      await dbCreateCategory(guildId, cat);
    }
    categories = defaults;
  } else {
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

/**
 * Legt eine neue Kategorie in der Datenbank an.
 *
 * @param {string} guildId - Die ID des Guilds.
 * @param {Object} category - Das Kategorie-Objekt.
 * @returns {Promise<void>}
 */
async function createCategory(guildId, category) {
  await dbCreateCategory(guildId, category);
}

/**
 * Löscht eine Kategorie anhand des Labels (case-insensitive).
 *
 * @param {string} guildId - Die ID des Guilds.
 * @param {string} label - Das Label der Kategorie.
 * @returns {Promise<void>}
 */
async function deleteCategory(guildId, label) {
  await dbDeleteCategory(guildId, label);
}

/**
 * Aktualisiert das Dropdown-Menü im "ticket-system"-Channel des angegebenen Servers.
 *
 * @param {Guild} guild - Der Discord-Server.
 * @returns {Promise<void>}
 */
async function updateTicketCreationMessage(guild) {
  const serverInformation = await getServerInformation(guild.id);
  
  let channel = guild.channels.cache.get(serverInformation[0][0].ticket_system_channel_id);
  if (!channel) {
    try {
      channel = updateTicketSystemChannelID(guild);
    } catch (error) {
      Logger.error("Fehler beim Updaten der Ticket System Channel ID");
    }
  }


  const messages = await channel.messages.fetch({ limit: 1, after: '0' });
  const ticketMessage = messages.first();
  if (!ticketMessage) return;
  
  const categories = await getCategories(guild.id);
  
  const options = categories.map(cat => ({
    label: cat.label,
    description: cat.description ? (cat.description.length > 100 ? cat.description.slice(0, 97) + "..." : cat.description) : ' ',
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
    if (err.message.includes("Invalid emoji")) {
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

export {
  getCategories,
  createCategory,
  deleteCategory,
  updateTicketCreationMessage
};
