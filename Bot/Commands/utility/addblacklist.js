const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { addUserToBlacklist } = require('../../Database/database');
const { error, success} = require('../../helper/embedHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addblacklist')
    .setDescription('Fügt einen Benutzer zur Blacklist hinzu.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Der Benutzer, der zur Blacklist hinzugefügt werden soll.')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Optional: Grund für den Blacklist-Eintrag')
        .setRequired(false)),
  async execute(interaction) {
    // Prüfe, ob der ausführende Member Administrator-Rechte hat
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

    } catch (error) {
      return interaction.reply({ 
        embeds: [error('Error', 'Beim Hinzufügen des Benutzers zur Blacklist ist ein Fehler aufgetreten.')], 
        ephemeral: true 
    });
    }
  },
};
