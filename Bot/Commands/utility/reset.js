const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
// Ersetze die bisherigen DB-Funktionen für Discord-Daten durch den JSON-Handler:
const { getServerInformation, loadAllData, saveAllData } = require('../../handler/discordDataHandler.js');
const { deleteAll } = require('../../Database/qdrant.js');
const { error, info } = require('../../helper/embedHelper.js');
const Logger = require('../../helper/loggerHelper.js');
const fs = require('fs');
const path = require('path');

// Pfad zur JSON-Datei, in der die Ticket-Kategorien gespeichert sind
const ticketCategoriesPath = path.join(__dirname, '../../data/ticket_categories.json');

/**
 * Entfernt den Eintrag für eine bestimmte Guild (Server) aus der ticket_categories.json.
 *
 * @param {string} guildId - Die ID der Guild, die entfernt werden soll.
 */
function removeGuildFromJSON(guildId) {
  if (!fs.existsSync(ticketCategoriesPath)) return;
  const rawData = fs.readFileSync(ticketCategoriesPath, 'utf-8');
  let data;
  try {
    data = JSON.parse(rawData);
  } catch (e) {
    Logger.error("Fehler beim Parsen der ticket_categories.json", e);
    return;
  }
  if (data.guilds && data.guilds[guildId]) {
    delete data.guilds[guildId];
    fs.writeFileSync(ticketCategoriesPath, JSON.stringify(data, null, 2));
    Logger.info(`Server ${guildId} aus der ticket_categories.json entfernt.`);
  }
}

/**
 * Entfernt die Serverinformationen für eine bestimmte Guild aus der discord_data.json.
 *
 * @param {string} guildId - Die ID der Guild.
 */
function removeServerInfo(guildId) {
  let data = loadAllData();
  if (data.guilds && data.guilds[guildId]) {
    delete data.guilds[guildId];
    saveAllData(data);
    Logger.info(`Server ${guildId} aus discord_data.json entfernt.`);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset')
    .setDescription('Löscht alle Wissenseinträge, Rollen und erstellte Channels von BravoDesk.'),
  async execute(interaction) {
    const guild = interaction.guild;
    await interaction.deferReply({ ephemeral: true });

    try {
      // Überprüfung: Nur der Serverbesitzer darf den Befehl ausführen
      if (guild.ownerId !== interaction.user.id) {
        await interaction.editReply({
          embeds: [error('Error', 'This action can only be performed by the server owner! An administrator has been informed about your attempt.')],
        });

        const adminChannel = guild.channels.cache.find(
          channel => channel.name === 'admin-log'
        );
        if (adminChannel) {
          await adminChannel.send(
            `⚠️ Benutzer ${interaction.user.tag} hat versucht, den Befehl \`/reset\` ohne Berechtigung auszuführen.`
          );
        }
        return;
      }
      
      // Suchen des Ticket-Channels
      const ticket_channel = guild.channels.cache.find(
        channel => channel.name === 'ticket-system'
      );
      if (interaction.channel.id === ticket_channel?.id) {
        await interaction.editReply({
          embeds: [error('Reset', 'Dieser Befehl kann hier nicht ausgeführt werden.')],
        });
        return;
      }

      // Bestätigungs-Buttons erstellen
      const confirmButton = new ButtonBuilder()
        .setCustomId('confirm_reset')
        .setLabel('Bestätigen')
        .setStyle(ButtonStyle.Danger);
      const cancelButton = new ButtonBuilder()
        .setCustomId('cancel_reset')
        .setLabel('Abbrechen')
        .setStyle(ButtonStyle.Secondary);
      const row = new ActionRowBuilder().addComponents(cancelButton, confirmButton);

      // Bestätigungsnachricht senden
      const confirmationMessage = await interaction.editReply({
        embeds: [info('Reset Bestätigung', 'Bist du sicher, dass du alle Daten von BravoDesk zurücksetzen möchtest? Diese Aktion kann nicht rückgängig gemacht werden!')],
        components: [row],
      });

      // Collector für Button-Interaktionen
      const filter = i => i.user.id === interaction.user.id;
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

            // Reset-Logik
            const data = getServerInformation(guild.id);
            if (!data || Object.keys(data).length === 0) {
              await i.followUp({
                embeds: [error('Reset Process', 'Keine Serverinformationen gefunden!')],
                ephemeral: true
              });
              return;
            }

            // Ressourcen löschen
            try {
              const channelToDelete = guild.channels.cache.get(data.ticket_system_channel_id);
              if (channelToDelete) await channelToDelete.delete().catch(Logger.error);

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

            // Lösche KI-Daten in Qdrant (unverändert)
            try {
              await deleteAll('guild_' + guild.id);
            } catch (dbError) {
              Logger.error(`Fehler beim Löschen der Daten: ${dbError}`);
              await i.followUp({ 
                embeds: [error('Reset Process', 'Fehler beim Löschen der Daten')],
                ephemeral: true
              });
              return;
            }

            // Entferne die Discord-Daten aus der JSON (unserer neuen Speicherung)
            removeServerInfo(guild.id);
            // Entferne den Server auch aus der ticket_categories.json
            removeGuildFromJSON(guild.id);

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
