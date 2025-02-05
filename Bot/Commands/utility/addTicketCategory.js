const { SlashCommandBuilder } = require('discord.js');
const { getCategories, saveCategories, updateTicketCreationMessage } = require('../../helper/ticketCategoryHelper');
const Logger = require('../../helper/loggerHelper');
const {info, success, error} = require('../../helper/embedHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addcategory')
    .setDescription('Fügt eine neue Ticket-Kategorie hinzu.')
    // Zuerst alle required Optionen:
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
    // Danach die optionalen Optionen:
    .addStringOption(option =>
      option
        .setName('emoji')
        .setDescription('Emoji für die Kategorie (optional)')
        .setRequired(false)
    ),
  async execute(interaction) {

    await interaction.deferReply({ ephemeral: true });

    const roleName = 'KI-Admin';
    const member = interaction.member;

    const role = member.roles.cache.find((role) => role.name === roleName);

    if (!role) {
      await interaction.editReply({
        embeds: [error('Error!', 'Hoppla! Es sieht so aus, als hättest du keine Berechtigung dafür. Ein Administrator wurde informiert.')],
      });

      const adminChannel = interaction.guild.channels.cache.find(
        (channel) => channel.name === 'admin-log'
      );
      if (adminChannel) {
        await adminChannel.send(
          `⚠️ Benutzer ${interaction.user.tag} hat versucht, den Befehl \`/upload\` ohne Berechtigung auszuführen.`
        );
      }
      return;
    }

    const label = interaction.options.getString('label');
    const description = interaction.options.getString('description');
    const aiPrompt = interaction.options.getString('ai_prompt');
    const aiEnabled = interaction.options.getBoolean('ai_enabled');
    const emoji = interaction.options.getString('emoji') || '';

    /*try {
      // Emoji-Validierung hinzufügen
      if (emoji !== '') {
        // Definiere eine Regex für benutzerdefinierte Emojis (z.B. <a:smile:1234567890>)
        const customEmojiRegex = /^<a?:\w+:\d+>$/;
        
        // Falls der String Doppelpunkte enthält, aber nicht mit '<' und '>' umschlossen ist,
        // handelt es sich nicht um ein korrekt formatiertes benutzerdefiniertes Emoji.
        if (emoji.includes(':') && !(emoji.startsWith('<') && emoji.endsWith('>'))) {
          return interaction.editReply({ 
            embeds: [error('Error!', 'Ungültiges Emoji Format, benutze ein korrektes Emoji')],  
            ephemeral: true 
          });
        }
        
        // Falls es sich um ein benutzerdefiniertes Emoji handeln soll, prüfe mit der Regex:
        if (emoji.startsWith('<') && emoji.endsWith('>')) {
          if (!customEmojiRegex.test(emoji)) {
            return interaction.editReply({ 
              embeds: [error('Error!', 'Ungültiges Emoji Format, benutze ein korrektes Emoji')], 
              ephemeral: true 
            });
          }
        }
        
        // Falls es kein benutzerdefiniertes Emoji ist (also ein Unicode-Emoji), validieren wir es mit der emoji-regex:
        if (!emoji.startsWith('<') && !emoji.endsWith('>')) {
          // Emoji-regex zur Validierung von Unicode-Emojis laden
          const emojiRegex = require('emoji-regex');
          const regex = emojiRegex();
          if (!regex.test(emoji)) {
            return interaction.editReply({ 
              embeds: [error('Error!', 'Ungültiges Emoji Format, benutze ein korrektes Emoji')], 
              ephemeral: true 
            });
          }
        }
      }
    } catch (error) {
      Logger.error(`${error.message, error.stack}`)
    }*/

    try {
      const categories = getCategories(interaction.guild.id);

      // Prüfe, ob bereits eine Kategorie mit diesem Label existiert
      if (categories.some(cat => cat.label.toLowerCase() === label.toLowerCase())) {
        return interaction.editReply({
          embeds: [info('Erfolg!', `Eine Kategorie mit dem Namen \`${label}\` existiert bereits.`)],
          ephemeral: true });
      }

      const newCategory = { label, description, aiPrompt, aiEnabled, emoji };
      categories.push(newCategory);
      saveCategories(interaction.guild.id, categories);

      // Aktualisiere das Dropdown-Menü im Ticket-System-Channel
      await updateTicketCreationMessage(interaction.guild);

      return interaction.editReply({ 
        embeds: [success('Erfolg!', `Kategorie \`${label}\` wurde erfolgreich hinzugefügt.`)],
        ephemeral: true 
      });

    } catch (error) {
      Logger.error(`Fehler beim Hinzufügen der Kategorie: ${error.message}\n${error.stack}`);
      return interaction.editReply({ 
        embeds: [error('Erfolg!', `Es gab einen Fehler beim Hinzufügen der Kategorie.`)],
        ephemeral: true 
      });
    }
  }
};
