import { error, info } from '../../helper/embedHelper.js';
import Logger from '../../helper/loggerHelper.js';
import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('Fügt jemanden zum Ticket hinzu.')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('Der User, der hinzugefügt werden soll.')
        .setRequired(true)
    ),
  /**
   * Führt den /add-Command aus, um einen Benutzer zu einem Ticket-Channel hinzuzufügen.
   *
   * @param {CommandInteraction} interaction - Das Interaktionsobjekt von Discord.
   * @returns {Promise<void>} Ein Promise, das resolved, wenn der Command abgeschlossen ist.
   */
  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const channel = interaction.channel;
      const user = interaction.options.getUser('user');

      if (!channel.name.endsWith('s-ticket')) {
        await interaction.editReply({
          embeds: [
            error(
              'Fehler!',
              'Dieser Command kann nur in einem Ticket-Channel verwendet werden.'
            ),
          ],
          ephemeral: false,
        });
        return;
      }

      await channel.permissionOverwrites.edit(user.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      });

      Logger.info(`Benutzer ${user.tag} wurde zum Ticket "${channel.name}" hinzugefügt.`);
      await interaction.editReply({
        embeds: [
          info('Erfolg!', `Der Benutzer ${user.tag} wurde erfolgreich zum Ticket hinzugefügt.`),
        ],
      });
    } catch (err) {
      Logger.error(`Fehler beim Ausführen des /add Commands: ${err.message}\n${err.stack}`);
      await interaction.editReply({
        embeds: [
          error(
            'Fehler!',
            'Es gab ein Problem beim Ausführen dieses Commands. Bitte versuche es später erneut.'
          ),
        ],
      });
    }
  },
};
