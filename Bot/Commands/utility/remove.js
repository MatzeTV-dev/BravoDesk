import { error, info, warning } from '../../helper/embedHelper.js';
import Logger from '../../helper/loggerHelper.js';
import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Entfernt jemanden aus dem Ticket.')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('Der Benutzer, der entfernt werden soll.')
        .setRequired(true)
    ),
  /**
   * Führt den /remove-Command aus, um einen Benutzer aus einem Ticket zu entfernen.
   *
   * @param {CommandInteraction} interaction - Das Interaktionsobjekt von Discord.
   * @returns {Promise<void>} Ein Promise, das resolved, wenn der Command abgeschlossen ist.
   */
  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });
      const channel = interaction.channel;
      const user = interaction.options.getUser('user');

      if (user.bot) {
        await interaction.editReply({
          embeds: [warning('Fehler!', 'Bots können nicht aus einem Ticket entfernt werden.')]
        });
        return;
      }

      if (!channel.name.endsWith('-ticket')) {
        await interaction.editReply({
          embeds: [error('Fehler!', 'Dieser Command kann nur in einem Ticket-Channel verwendet werden.')]
        });
        return;
      }

      await channel.permissionOverwrites.delete(user.id);
      Logger.info(`Benutzer ${user.tag} wurde aus dem Ticket "${channel.name}" entfernt.`);
      await interaction.editReply({
        embeds: [info('Erfolg!', `Der Benutzer ${user.tag} wurde erfolgreich aus dem Ticket entfernt.`)]
      });
    } catch (err) {
      Logger.error(`Fehler beim Ausführen des /remove Commands: ${err.message}\n${err.stack}`);
      await interaction.editReply({
        embeds: [error('Fehler!', 'Es gab ein Problem beim Ausführen dieses Commands. Bitte versuche es später erneut.')]
      });
    }
  },
};
