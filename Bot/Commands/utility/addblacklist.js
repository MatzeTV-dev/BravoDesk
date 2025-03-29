import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { addUserToBlacklist } from '../../Database/database.js';
import { error, success } from '../../helper/embedHelper.js';

export default {
  data: new SlashCommandBuilder()
    .setName('addblacklist')
    .setDescription('Fügt einen Benutzer zur Blacklist hinzu.')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('Der Benutzer, der zur Blacklist hinzugefügt werden soll.')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Optional: Grund für den Blacklist-Eintrag')
        .setRequired(false)
    ),
  /**
   * Führt den /addblacklist-Command aus, um einen Benutzer zur Blacklist hinzuzufügen.
   *
   * @param {CommandInteraction} interaction - Das Interaktionsobjekt von Discord.
   * @returns {Promise<void>} Ein Promise, das resolved, wenn der Command abgeschlossen ist.
   */
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ 
        embeds: [error('Berechtigung', 'Du hast keine Berechtigung, diesen Befehl zu verwenden.')], 
        ephemeral: true 
      });
    }

    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || '';

    try {
      await addUserToBlacklist(interaction.guild.id, user.id, reason);
      return interaction.reply({ 
        embeds: [success('Erfolg!', `Benutzer **${user.tag}** wurde zur Blacklist hinzugefügt.`)], 
        ephemeral: true 
      });
    } catch (err) {
      return interaction.reply({ 
        embeds: [error('Error', 'Beim Hinzufügen des Benutzers zur Blacklist ist ein Fehler aufgetreten.')], 
        ephemeral: true 
      });
    }
  },
};
