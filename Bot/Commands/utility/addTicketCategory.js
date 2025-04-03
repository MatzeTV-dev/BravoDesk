import { getCategories, createCategory, updateTicketCreationMessage } from '../../helper/ticketCategoryHelper.js';
import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { info, success, error } from '../../helper/embedHelper.js';
import Logger from '../../helper/loggerHelper.js';

/**
 * Prüft, ob das übergebene Emoji gültig ist:
 * - Ist es ein Custom-Emoji, wird zusätzlich geprüft, ob es im aktuellen Server vorhanden ist.
 * - Andernfalls wird geprüft, ob es ein gültiges Unicode-Emoji ist.
 *
 * @param {string} emoji Das zu prüfende Emoji.
 * @param {Guild} guild Der aktuelle Server.
 * @returns {boolean} true, wenn das Emoji gültig ist, andernfalls false.
 */
function isValidDiscordEmoji(emoji, guild) {
  const customEmojiRegex = /^<a?:(\w+):(\d+)>$/;
  const match = emoji.match(customEmojiRegex);
  if (match) {
    const emojiId = match[2];
    return guild.emojis.cache.has(emojiId);
  }
  const unicodeEmojiRegex = /^\p{Extended_Pictographic}+$/u;
  return unicodeEmojiRegex.test(emoji);
}

export default {
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
  /**
   * Führt den /addcategory-Command aus, um eine neue Ticket-Kategorie hinzuzufügen.
   *
   * @param {CommandInteraction} interaction - Das Interaktionsobjekt von Discord.
   * @returns {Promise<void>} Ein Promise, das resolved, wenn der Command abgeschlossen ist.
   */
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ 
        embeds: [error('Berechtigung', 'Du hast keine Berechtigung, diesen Befehl zu verwenden.')], 
        ephemeral: true 
      });
    }

    const guildId = interaction.guild.id;
    const label = interaction.options.getString('label');
    const description = interaction.options.getString('description');
    const aiPrompt = interaction.options.getString('ai_prompt');
    const aiEnabled = interaction.options.getBoolean('ai_enabled');
    const emoji = interaction.options.getString('emoji') || '';
    const permissionInput = interaction.options.getString('permission') || '';
    let permission = [];

    if (permissionInput) {
      const roleIdMatches = permissionInput.match(/<@&(\d+)>/g);
      if (roleIdMatches) {
        permission = roleIdMatches.map(roleMention =>
          roleMention.replace(/[<@&>]/g, '')
        );
      }
    }

    if (emoji && !isValidDiscordEmoji(emoji, interaction.guild)) {
      await interaction.editReply({
        embeds: [
          error(
            'Fehler!',
            'Das angegebene Emoji ist ungültig oder stammt von einem externen Server. Bitte gib ein gültiges Emoji ein.'
          ),
        ],
      });
      return;
    }

    try {
      const categories = await getCategories(guildId);
      const normalizedValue = label.trim().toLowerCase().replace(/\s+/g, '_');
      if (categories.some(cat => (cat.value || '').toLowerCase() === normalizedValue)) {
        await interaction.editReply({
          embeds: [
            info('Info', `Eine Kategorie mit dem Namen \`${label}\` existiert bereits.`),
          ],
        });
        return;
      }
      const newCategory = {
        label,
        description,
        value: normalizedValue,
        emoji,
        aiPrompt,
        aiEnabled,
        permission,
      };

      await createCategory(guildId, newCategory);
      await updateTicketCreationMessage(interaction.guild);
      await interaction.editReply({
        embeds: [success('Erfolg!', `Kategorie \`${label}\` wurde erfolgreich hinzugefügt.`)],
      });
    } catch (err) {
      Logger.error(`Fehler beim Hinzufügen der Kategorie: ${err.message}\n${err.stack}`);
      await interaction.editReply({
        embeds: [error('Error!', 'Es gab einen Fehler beim Hinzufügen der Kategorie.')],
      });
    }
  },
};
