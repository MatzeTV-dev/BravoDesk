import { getServerInformation } from '../../Database/database.js';
import { error, info } from '../../helper/embedHelper.js';
import { upload } from '../../Database/qdrant.js';
import Logger from '../../helper/loggerHelper.js';
import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('upload')
    .setDescription('Ladet neues Wissen in das KI Brain hoch.')
    .addStringOption((option) =>
      option
        .setName('daten')
        .setDescription('Ein einfacher Satz, um Informationen an die KI zu übermitteln.')
        .setRequired(true)
    ),
  /**
   * Führt den /upload-Command aus, um neues Wissen in das KI Brain hochzuladen.
   *
   * @param {CommandInteraction} interaction - Das Interaktionsobjekt von Discord.
   * @returns {Promise<void>} Ein Promise, das resolved, wenn der Command abgeschlossen ist.
   */
  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const ServerInformation = await getServerInformation(interaction.guildId);
      const member = interaction.member;
      const hasRole = member.roles.cache.some(
        (role) => role.id === ServerInformation[0][0].kiadmin_role_id
      );

      if (!hasRole) {
        await interaction.editReply({
          embeds: [error('Error!', 'Du hast keine Berechtigung für diesen Befehl!')]
        });
        return;
      }

      const string = interaction.options.getString('daten');
      const wordCount = string.split(/\s+/).length;
      if (wordCount > 10) {
        await interaction.editReply({
          embeds: [error('Error!', 'Die maximale Wortanzahl beträgt 10 Wörter.')],
        });
        return;
      }

      const longWordMatch = string.match(/\b\w{21,}\b/);
      if (longWordMatch) {
        await interaction.editReply({
          embeds: [
            error(
              'Error!',
              `Ein Wort ist zu lang: "${longWordMatch[0]}". Maximale Wortlänge beträgt 10 Zeichen. \n ${interaction.options.getString('daten')}`
            )
          ],
        });
        return;
      }

      await interaction.editReply({
        embeds: [info('Hochladen', 'Daten werden hochgeladen, dies kann ein paar Sekunden dauern.')],
      });

      try {
        await upload("guild_" + interaction.guildId, string);
        await interaction.editReply({
          embeds: [info('Hochladen', 'Daten hochladen war erfolgreich.')],
        });
        Logger.success('Daten erfolgreich hochgeladen.');
      } catch (uploadError) {
        Logger.error(`Fehler beim Hochladen der Daten: ${uploadError.message}`);
        await interaction.editReply({
          embeds: [error('Error!', 'Fehler beim Hochladen von Daten.')],
        });
      }
    } catch (err) {
      Logger.error(`Ein unerwarteter Fehler ist aufgetreten: ${err.message} ${err.stack}`);
      try {
        await interaction.editReply({
          embeds: [error('Error!', 'Ein unerwarteter Fehler ist aufgetreten.')],
        });
      } catch (replyError) {
        Logger.error(`Fehler beim Senden der Fehlermeldung: ${replyError.message}`);
      }
    }
  },
};
