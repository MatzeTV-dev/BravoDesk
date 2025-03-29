import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { error } from '../../helper/embedHelper.js';
import Logger from '../../helper/loggerHelper.js';

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('zeigt alle commands und deren Beschreibungen an'),
  /**
   * Führt den /help-Command aus, um alle Befehle und deren Beschreibungen in einem Embed anzuzeigen.
   *
   * @param {CommandInteraction} interaction - Das Interaktionsobjekt von Discord.
   * @returns {Promise<void>} Ein Promise, das resolved, wenn der Command abgeschlossen ist.
   */
  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const embed = new EmbedBuilder()
        .setTitle('**Befehlsliste**')
        .addFields(
          { name: '**/list**', value: 'Listet alle Wissenseinträge der KI auf.' },
          { name: '**/reset**', value: 'Löscht alle Wissenseinträge, Rollen und erstellten cahnnel von BravoDesk.' },
          { name: '**/setup**', value: 'Startet den automatischen setup Prozess.' },
          { name: '**/upload**', value: 'Ladet neues Wissen in das KI Brain hoch.' },
          { name: '**/search**', value: 'Durchsucht die KI nach bestimmten Informationen' },
          { name: '**/add**', value: 'Fügt einen User zum Ticket hinzu.' },
          { name: '**/remove**', value: 'Entfernt einen User aus dem Ticket.' },
          { name: '**/addcategory**', value: 'Lässt neue Kategorien erstellen' },
          { name: '**/removecategory**', value: 'Lässt Kategorien löschen.' },
          { name: '**/addblacklist**', value: 'Fügt User zur Ticket-blacklist hinzu' },
          { name: '**/removeblacklist**', value: 'Entfernt User von der Ticket-blacklist.' }
        )
        .setColor("#345635");

      await interaction.followUp({
        embeds: [embed],
      });
    } catch (err) {
      Logger.error(`Ein Fehler ist aufgetreten: ${err.message}\n${err.stack}`);
      try {
        if (!interaction.replied) {
          await interaction.followUp({
            embeds: [error('Error!', 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut.')],
          });
        }
      } catch (replyError) {
        Logger.error(`Ein Fehler ist aufgetreten beim antworten: ${replyError.message}\n${replyError.stack}`);
      }
    }
  },
};
