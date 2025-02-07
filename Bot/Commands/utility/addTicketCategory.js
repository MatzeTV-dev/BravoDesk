const { SlashCommandBuilder } = require('discord.js');
const { getCategories, saveCategories, updateTicketCreationMessage } = require('../../helper/ticketCategoryHelper');
const Logger = require('../../helper/loggerHelper');
const { info, success, error } = require('../../helper/embedHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addcategory')
    .setDescription('Fügt eine neue Ticket-Kategorie hinzu.')
    // Erforderliche Optionen:
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
    // Optionale Optionen:
    .addStringOption(option =>
      option
        .setName('emoji')
        .setDescription('Emoji für die Kategorie (optional)')
        .setRequired(false)
    )
    // Neue Option: Rollen, die Zugriff auf das Ticket haben (als String mit Role-Erwähnungen; mehrere Rollen können mit Komma getrennt werden)
    .addStringOption(option =>
      option
        .setName('permission')
        .setDescription('Erwähne die Rollen, die Zugriff auf das Ticket haben (optional, mehrere Rollen mit Komma trennen)')
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

    // Verarbeite den neuen "permission"-Parameter:
    const permissionInput = interaction.options.getString('permission') || '';
    let permissionRoleIds = [];
    if (permissionInput) {
      // Extrahiere alle Rollen-IDs aus der Eingabe (z. B. "<@&123456789012345678>")
      const roleIdMatches = permissionInput.match(/<@&(\d+)>/g);
      if (roleIdMatches) {
        permissionRoleIds = roleIdMatches.map(roleMention =>
          roleMention.replace(/[<@&>]/g, '')
        );
      }
    }

    try {
      const categories = getCategories(interaction.guild.id);

      // Prüfe, ob bereits eine Kategorie mit diesem Label existiert
      if (categories.some(cat => cat.label.toLowerCase() === label.toLowerCase())) {
        return interaction.editReply({
          embeds: [info('Erfolg!', `Eine Kategorie mit dem Namen \`${label}\` existiert bereits.`)],
          ephemeral: true
        });
      }

      // Neues Kategorie-Objekt inkl. dem neuen "permission"-Attribut
      const newCategory = { label, description, aiPrompt, aiEnabled, emoji, permission: permissionRoleIds };
      categories.push(newCategory);
      saveCategories(interaction.guild.id, categories);

      // Aktualisiere das Dropdown-Menü im Ticket-System-Channel
      await updateTicketCreationMessage(interaction.guild);

      return interaction.editReply({ 
        embeds: [success('Erfolg!', `Kategorie \`${label}\` wurde erfolgreich hinzugefügt.`)],
        ephemeral: true 
      });

    } catch (err) {
      Logger.error(`Fehler beim Hinzufügen der Kategorie: ${err.message}\n${err.stack}`);
      return interaction.editReply({ 
        embeds: [error('Error!', `Es gab einen Fehler beim Hinzufügen der Kategorie.`)],
        ephemeral: true 
      });
    }
  }
};
