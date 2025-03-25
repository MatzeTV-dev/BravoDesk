import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { removeUserFromBlacklist } from '../../Database/database.js';
import { error, success } from '../../helper/embedHelper.js';

export default {
  data: new SlashCommandBuilder()
    .setName('removeblacklist')
    .setDescription('Entfernt einen Benutzer von der Blacklist.')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('Der Benutzer, der von der Blacklist entfernt werden soll.')
        .setRequired(true)
    ),
  async execute(interaction) {
    // Prüfe, ob der ausführende Member Administrator-Rechte hat
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({
        embeds: [error('Berechtigung', 'Du hast keine Berechtigung, diesen Befehl zu verwenden.')],
        ephemeral: true
      });
    }

    const user = interaction.options.getUser('user');

    try {
      await removeUserFromBlacklist(interaction.guild.id, user.id);
      return interaction.reply({
        embeds: [success('Erfolg!', `Benutzer **${user.tag}** wurde von der Blacklist entfernt.`)],
        ephemeral: true
      });
    } catch (err) {
      return interaction.reply({
        embeds: [error('Error', 'Beim Hinzufügen des Benutzers zur Blacklist ist ein Fehler aufgetreten.')],
        ephemeral: true
      });
    }
  }
};
