import Logger from '../helper/loggerHelper.js';

export default {
  data: {
    name: 'mark_as_solved_button',
  },
  /**
   * Markiert ein Ticket als gelöst, indem der Ticket-Kanal gelöscht wird.
   *
   * @param {ButtonInteraction} interaction - Das Interaktionsobjekt von Discord.
   * @returns {Promise<void>} Ein Promise, das resolved, wenn der Vorgang abgeschlossen ist.
   */
  async execute(interaction) {
    const channel = interaction.channel;

    if (!channel) {
      Logger.warn('Kanal nicht gefunden. Möglicherweise wurde er bereits gelöscht.');
      await interaction.reply({
        content: 'Es scheint, als wäre dieses Ticket bereits geschlossen.',
        ephemeral: true,
      });
      return;
    }

    try {
      await interaction.reply({ content: 'Das Ticket wird als abgeschlossen markiert...', ephemeral: true });
      Logger.info(`Ticket-Kanal wird als abgeschlossen markiert: Name="${channel.name}", ID=${channel.id}`);
      await channel.delete();
    } catch (error) {
      Logger.error(`Fehler beim Markieren des Tickets als abgeschlossen (Kanal: ${channel.name}, ID: ${channel.id}): ${error.message}\n${error.stack}`);
      try {
        if (!interaction.deferred && !interaction.replied) {
          await interaction.followUp({
            content: 'Es gab einen Fehler beim Markieren des Tickets als abgeschlossen. Bitte versuche es später erneut.',
            ephemeral: true,
          });
        }
      } catch (replyError) {
        Logger.error(`Fehler beim Senden der Fehlermeldung: ${replyError.message}\n${replyError.stack}`);
      }
    }
  },
};
