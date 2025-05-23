import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getServerInformation, Delete } from '../../Database/database.js';
import { error, info } from '../../helper/embedHelper.js';
import { deleteAll } from '../../Database/qdrant.js';
import Logger from '../../helper/loggerHelper.js';
import axios from 'axios';


const WEBSERVER_NOTIFICATION_URL = process.env.WEBSERVER_URL + '/api/notify/reset';
const WEBSERVER_API_SECRET = process.env.DASHBOARD_API_TOKEN;

/**
 * Benachrichtigt die Webanwendung über einen Reset-Vorgang für eine bestimmte Guild.
 * Sendet eine POST-Anfrage an den konfigurierten Webserver-Endpunkt.
 *
 * @async
 * @param {string} guildId - Die ID der Guild, für die der Reset durchgeführt wurde.
 * @returns {Promise<void>} Ein Promise, das resolved, wenn die Benachrichtigung erfolgreich gesendet wurde oder fehlschlägt.
 */
async function notifyWebsiteOfReset(guildId) {
  if (!WEBSERVER_NOTIFICATION_URL || !WEBSERVER_API_SECRET) {
    Logger.warn('Webserver Benachrichtigungs-URL oder Secret nicht konfiguriert. Überspringe Benachrichtigung.');
    return;
  }

  try {
    Logger.info(`Sende Reset-Benachrichtigung für Guild ${guildId} an ${WEBSERVER_NOTIFICATION_URL}`);
    await axios.post(WEBSERVER_NOTIFICATION_URL,
    {
      guildId: guildId
    },
    {
      headers: {
      'Authorization': `Bearer ${WEBSERVER_API_SECRET}`
      },
        timeout: 5000
      });
      Logger.success(`Website für Guild ${guildId} erfolgreich benachrichtigt.`);
    } catch (error) {
      const errorMessage = error.response
        ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`
        : error.message;
      Logger.error(`Fehler beim Benachrichtigen der Website für Guild ${guildId}: ${errorMessage}`);
    }
}

export default {
  data: new SlashCommandBuilder()
    .setName('reset')
    .setDescription('Löscht alle Wissenseinträge, Rollen und erstellte Channels von BravoDesk.'),
  /**
   * Führt den /reset-Command aus, um alle Wissenseinträge, Rollen und Channels von BravoDesk zu löschen.
   *
   * @param {CommandInteraction} interaction - Das Interaktionsobjekt von Discord.
   * @returns {Promise<void>} Ein Promise, das resolved, wenn der Command abgeschlossen ist.
   */
  async execute(interaction) {
    const guild = interaction.guild;
    await interaction.deferReply({ ephemeral: true });

    try {
      if (guild.ownerId !== interaction.user.id) {
        await interaction.editReply({
          embeds: [error('Error', 'This action can only be performed by the server owner! An administrator has been informed about your attempt.')]
        });

        const adminChannel = guild.channels.cache.find(
          (channel) => channel.name === 'admin-log'
        );
        if (adminChannel) {
          await adminChannel.send(
            `⚠️ Benutzer ${interaction.user.tag} hat versucht, den Befehl \`/reset\` ohne Berechtigung auszuführen.`
          );
        }
        return;
      }
      
      const ticket_channel = guild.channels.cache.find(
        (channel) => channel.name === 'ticket-system'
      );
      if (interaction.channel.id === ticket_channel?.id) {
        await interaction.editReply({
          embeds: [error('Reset', 'Dieser Befehl kann hier nicht ausgeführt werden.')]
        });
        return;
      }

      const confirmButton = new ButtonBuilder()
        .setCustomId('confirm_reset')
        .setLabel('Bestätigen')
        .setStyle(ButtonStyle.Danger);
      const cancelButton = new ButtonBuilder()
        .setCustomId('cancel_reset')
        .setLabel('Abbrechen')
        .setStyle(ButtonStyle.Secondary);
      const row = new ActionRowBuilder().addComponents(cancelButton, confirmButton);

      const confirmationMessage = await interaction.editReply({
        embeds: [info('Reset Bestätigung', 'Bist du sicher, dass du alle Daten von BravoDesk zurücksetzen möchtest? Diese Aktion kann nicht rückgängig gemacht werden!')],
        components: [row],
      });

      const filter = (i) => i.user.id === interaction.user.id;
      const collector = confirmationMessage.createMessageComponentCollector({
        filter,
        time: 30_000,
      });

      collector.on('collect', async (i) => {
        try {
          if (i.customId === 'confirm_reset') {
            await i.update({ 
              content: '⚠️ Reset wird durchgeführt...', 
              components: [],
              embeds: [info('Reset Process', 'Der Prozess wurde gestartet!')]
            });

            const rawData = await getServerInformation(guild.id);
            if (!rawData || rawData.length === 0) {
              await i.followUp({
                embeds: [error('Reset Process', 'Keine Serverinformationen gefunden!')],
                ephemeral: true
              });
              return;
            }
            const data = rawData[0][0];

            try {
              const channel = guild.channels.cache.get(data.ticket_system_channel_id);
              if (channel) await channel.delete().catch(Logger.error);

              const category = guild.channels.cache.get(data.ticket_category_id);
              if (category) await category.delete().catch(Logger.error);

              const roleSupport = guild.roles.cache.get(data.support_role_id);
              if (roleSupport) await roleSupport.delete().catch(Logger.error);

              const roleKIAdmin = guild.roles.cache.get(data.kiadmin_role_id);
              if (roleKIAdmin) await roleKIAdmin.delete().catch(Logger.error);

              const categoryArchiv = guild.channels.cache.get(data.ticket_archiv_category_id);
              if (categoryArchiv) await categoryArchiv.delete().catch(Logger.error);
            } catch (resourceError) {
              Logger.error(`Fehler beim Löschen von Ressourcen: ${resourceError}`);
              await i.followUp({ 
                embeds: [error('Reset Process', 'Fehler beim Löschen von Ressourcen')],
                ephemeral: true
              });
              return;
            }

            try {
              await Delete('CALL Delete_Server_Information(?)', guild.id);
              await Delete('CALL Delete_categories(?)', guild.id);
              await deleteAll('guild_' + guild.id);

              try {
                // lösche jetzt auch die Embed-Designs
                await Delete('DELETE FROM guild_embeds WHERE guild_id = ?', [guild.id]);
                Logger.success(`Embeds für Guild ${guild.id} gelöscht.`);
              } catch (embedDelError) {
                Logger.error(`Fehler beim Löschen der Embeds: ${embedDelError}`);
                await i.followUp({
                  embeds: [error('Reset Process', 'Fehler beim Löschen der Embed-Designs')],
                  ephemeral: true
                });
                return;
              }

            } catch (dbError) {
              Logger.error(`Fehler beim Löschen der ServerInformationen: ${dbError}`);
              await i.followUp({ 
                embeds: [error('Reset Process', 'Fehler beim Löschen der Daten')],
                ephemeral: true
              });
              return;
            }

            await notifyWebsiteOfReset(guild.id);

            await i.followUp({
              embeds: [info('Reset Abgeschlossen', 'Alle Daten, Rollen und Channels wurden erfolgreich gelöscht!')],
              ephemeral: true
            });

          } else if (i.customId === 'cancel_reset') {
            await i.update({ 
              content: '❌ Reset abgebrochen.', 
              components: [],
              embeds: [] 
            });
          }
        } catch (err) {
          Logger.error(`Fehler während der Interaktion: ${err}`);
          await i.followUp({ 
            content: 'Ein Fehler ist aufgetreten.', 
            ephemeral: true 
          });
        } finally {
          collector.stop();
        }
      });

      collector.on('end', (collected, reason) => {
        if (reason === 'time') {
          interaction.editReply({ 
            content: '⏳ Zeit abgelaufen. Reset abgebrochen.', 
            components: [],
            embeds: [] 
          });
        }
      });

    } catch (error) {
      Logger.error(`Unerwarteter Fehler: ${error}`);
      await interaction.editReply({
        embeds: [error('Fehler', 'Ein unerwarteter Fehler ist aufgetreten.')],
        ephemeral: true
      });
    }
  },
};
