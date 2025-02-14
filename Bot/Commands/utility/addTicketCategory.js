const { SlashCommandBuilder } = require('discord.js');
const { getCategories, saveCategories, updateTicketCreationMessage } = require('../../helper/ticketCategoryHelper');
const Logger = require('../../helper/loggerHelper');
const { info, success, error } = require('../../helper/embedHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addcategory')
    .setDescription('Fügt eine neue Ticket-Kategorie hinzu.')
    .addStringOption(option =>
      option
        .setName('label')
        .setDescription('Der Anzeigename der Kategorie')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('description')
        .setDescription('Beschreibung der Kategorie')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('ai_prompt')
        .setDescription('Der AI-Prompt für diese Kategorie')
        .setRequired(true)
    )
    .addBooleanOption(option =>
      option
        .setName('ai_enabled')
        .setDescription('Soll die KI für diese Kategorie aktiviert sein?')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('emoji')
        .setDescription('Emoji für die Kategorie (optional)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('permission')
        .setDescription('Erwähne die Rollen, die Zugriff auf das Ticket haben (optional, mehrere Rollen mit Komma trennen)')
        .setRequired(false)
    ),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const guildId = interaction.guild.id;
    const label = interaction.options.getString('label');
    const description = interaction.options.getString('description');
    const aiPrompt = interaction.options.getString('ai_prompt');
    const aiEnabled = interaction.options.getBoolean('ai_enabled');
    const emoji = interaction.options.getString('emoji') || '';
    const permissionInput = interaction.options.getString('permission') || '';
    let permission = [];

    if (permissionInput) {
      // Extrahiere alle Rollen-IDs aus der Eingabe (Format: "<@&ID>")
      const roleIdMatches = permissionInput.match(/<@&(\d+)>/g);
      if (roleIdMatches) {
        permission = roleIdMatches.map(roleMention => roleMention.replace(/[<@&>]/g, ''));
      }
    }

    try {
      const categories = getCategories(guildId);
      // Prüfe, ob bereits eine Kategorie mit dem gleichen Wert existiert
      const normalizedValue = label.trim().toLowerCase().replace(/\s+/g, '_');
      if (categories.some(cat => (cat.value || '').toLowerCase() === normalizedValue)) {
        await interaction.editReply({
          embeds: [info('Info', `Eine Kategorie mit dem Namen \`${label}\` existiert bereits.`)]
        });
        return;
      }
      // Baue die neue Kategorie mit dem gleichen Format wie die Standard-Kategorien
      const newCategory = {
        label: label,
        description: description,
        value: normalizedValue,
        emoji: emoji,
        aiPrompt: aiPrompt,
        aiEnabled: aiEnabled,
        permission: permission
      };

      categories.push(newCategory);
      saveCategories(guildId, categories);
      await updateTicketCreationMessage(interaction.guild);
      await interaction.editReply({
        embeds: [success('Erfolg!', `Kategorie \`${label}\` wurde erfolgreich hinzugefügt.`)]
      });
    } catch (err) {
      Logger.error(`Fehler beim Hinzufügen der Kategorie: ${err.message}\n${err.stack}`);
      await interaction.editReply({
        embeds: [error('Error!', 'Es gab einen Fehler beim Hinzufügen der Kategorie.')]
      });
    }
  }
};
