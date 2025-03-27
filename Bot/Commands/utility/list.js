import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ComponentType} from 'discord.js';
import { getEverythingCollection, deleteEntry } from '../../Database/qdrant.js';
import { getServerInformation } from '../../Database/database.js';
import { error, info } from '../../helper/embedHelper.js';
import Logger from '../../helper/loggerHelper.js';

export default {
  data: new SlashCommandBuilder()
    .setName('list')
    .setDescription('Listet alle Wissenseinträge der KI auf'),
  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const ServerInformation = await getServerInformation(interaction.guildId);
      const member = interaction.member;
      const hasRole = member.roles.cache.some((role) => role.id === ServerInformation[0][0].kiadmin_role_id);

      if (!hasRole) {
        await interaction.editReply({
          embeds: [error('Error!', 'Du hast keine Berechtigung für diesen Befehl!')]
      });

        const adminChannel = interaction.guild.channels.cache.find(
          (channel) => channel.name === 'admin-log'
        );
        if (adminChannel) {
          await adminChannel.send(
            `⚠️ Benutzer ${interaction.user.tag} hat versucht, /list ohne entsprechende Rolle (${roleName}) auszuführen.`
          );
        }
        return;
      }

      // Datenbank-Abfrage
      const knowledge = await getEverythingCollection(interaction.guildId);
      if (!knowledge || knowledge.length === 0) {
        await interaction.editReply({
          embeds: [error('Error!', 'Keine Daten gefunden!')]
        });
        return;
      }

      // Mapping von "globalem Index" => DB-ID
      const globalIndexIdMap = knowledge.map((item) => item.id);

      // PAGINATION SETUP
      let currentPage = 1;
      const itemsPerPage = 6;
      let totalEntries = knowledge.length;
      let totalPages = Math.ceil(totalEntries / itemsPerPage);

      // Gibt die Einträge zurück, die auf Seite X angezeigt werden
      function getPageEntries(page) {
        const startIndex = (page - 1) * itemsPerPage;
        return knowledge.slice(startIndex, startIndex + itemsPerPage);
      }

      // Embed erstellen
      function createEmbed(page, pageEntries) {
        const embed = new EmbedBuilder()
          .setTitle(`Wissenseinträge – Seite ${page}/${totalPages}`)
          .setColor('#345635');

        // startIndex nötig, um aus globalIndexIdMap den richtigen Index zu errechnen
        const startIndex = (page - 1) * itemsPerPage;

        pageEntries.forEach((item, idx) => {
          const globalIndex = startIndex + idx;  // 0, 1, 2, ...
          const displayIndex = globalIndex + 1;    // 1, 2, 3, ...
          
          embed.addFields({
            name: `**Eintrag #${displayIndex}**`,
            value: item.payload.text && item.payload.text.length > 0
              ? item.payload.text
              : '*(Kein Inhalt)*'
          });
        });

        return embed;
      }

      // Action Rows: pro Eintrag 1 Button + Navigationsbuttons
      function createActionRows(page, pageEntries) {
        const rows = [];
        let row = new ActionRowBuilder();
        let buttonsInRow = 0;

        // startIndex wieder berechnen
        const startIndex = (page - 1) * itemsPerPage;

        pageEntries.forEach((item, idx) => {
          const globalIndex = startIndex + idx;
          const displayIndex = globalIndex + 1;

          const actionButton = new ButtonBuilder()
            .setCustomId(`action_${globalIndex}`)
            .setLabel(`Eintrag #${displayIndex}`)
            .setStyle(ButtonStyle.Secondary);

          row.addComponents(actionButton);
          buttonsInRow++;

          // Max. 5 Buttons pro Row
          if (buttonsInRow >= 5) {
            rows.push(row);
            row = new ActionRowBuilder();
            buttonsInRow = 0;
          }
        });

        if (buttonsInRow > 0) {
          rows.push(row);
        }

        // Navigations-Row
        const navRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('prev_page')
            .setLabel('Zurück')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage === 1),
          new ButtonBuilder()
            .setCustomId('next_page')
            .setLabel('Weiter')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage === totalPages)
        );
        rows.push(navRow);

        return rows;
      }

      // Seite aktualisieren
      async function updatePage(page) {
        currentPage = page;

        const pageEntries = getPageEntries(page);
        const embed = createEmbed(page, pageEntries);
        const components = createActionRows(page, pageEntries);

        await interaction.editReply({ embeds: [embed], components });
      }

      // ------------------------
      // Erste Seite laden
      // ------------------------
      await updatePage(currentPage);

      // Collector für Buttons
      const msg = await interaction.fetchReply();
      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 5 * 60 * 1000 // 5 Minuten
      });

      collector.on('collect', async (i) => {
        // Nur der aufrufende User darf
        if (i.user.id !== interaction.user.id) {
          return i.reply({
            content: 'Nur der ausführende User kann das nutzen.',
            ephemeral: true
          });
        }

        const { customId } = i;

        // PAGINATION
        if (customId === 'prev_page') {
          await i.deferUpdate();
          if (currentPage > 1) await updatePage(currentPage - 1);
          return;
        }
        if (customId === 'next_page') {
          await i.deferUpdate();
          if (currentPage < totalPages) await updatePage(currentPage + 1);
          return;
        }

        // Aktion-Button
        if (customId.startsWith('action_')) {
          // Bsp.: action_12  =>  globalIndex = 12
          const [, globalIndexStr] = customId.split('_');
          const globalIndex = parseInt(globalIndexStr, 10);

          // Aus dem Mapping die echte ID holen
          const dbId = globalIndexIdMap[globalIndex];

          // Ephemeres Select-Menü schicken
          // KEIN deferUpdate hier, weil wir gleich reply()n
          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`select_${globalIndex}`)
            .setPlaceholder('Wähle eine Aktion aus ...')
            .addOptions(
              new StringSelectMenuOptionBuilder({
                label: 'Bearbeiten',
                value: 'edit',
                emoji: '✏️'
              }),
              new StringSelectMenuOptionBuilder({
                label: 'Löschen',
                value: 'delete',
                emoji: '❕'
              })
            );

          const row = new ActionRowBuilder().addComponents(selectMenu);

          await i.reply({
            content: `Aktionen für **Eintrag #${globalIndex + 1}**`,
            components: [row],
            ephemeral: true
          });

          // Collector für das Select-Menü
          const selectCollector = i.channel.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 60 * 1000 // 1 Minute
          });

          selectCollector.on('collect', async (selectInteraction) => {
            if (
              selectInteraction.customId === `select_${globalIndex}` &&
              selectInteraction.user.id === i.user.id
            ) {
              const chosen = selectInteraction.values[0]; // 'edit' oder 'delete'

              // ============= BEARBEITEN =============
              if (chosen === 'edit') {
                const shortIndex = (globalIndex + 1).toString().padStart(2, '0');
                const modal = new ModalBuilder()
                  .setCustomId(`edit_modal_${dbId}`)
                  .setTitle(`Bearbeiten #${shortIndex}`);

                const textInput = new TextInputBuilder()
                  .setCustomId('description')
                  .setLabel('Neuer Inhalt')
                  .setStyle(TextInputStyle.Paragraph)
                  .setRequired(true);

                const modalRow = new ActionRowBuilder().addComponents(textInput);
                modal.addComponents(modalRow);

                await selectInteraction.showModal(modal);

              // ============= LÖSCHEN =============
              } else if (chosen === 'delete') {
                await selectInteraction.deferUpdate();
                try {
                  await deleteEntry(interaction.guildId, dbId);

                  // Lokal auch löschen
                  knowledge.splice(globalIndex, 1);
                  globalIndexIdMap.splice(globalIndex, 1);

                  totalEntries = knowledge.length;
                  totalPages = Math.ceil(totalEntries / itemsPerPage);

                  // Seite anpassen, falls wir "über das Ziel" hinausschauen
                  if (currentPage > totalPages && totalPages > 0) {
                    currentPage = totalPages;
                  }

                  // Info
                  await interaction.editReply({
                    embeds: [info('Deleted', `Eintrag #${globalIndex + 1} erfolgreich gelöscht.`)]
                  });
                  await updatePage(currentPage);

                } catch (err) {
                  Logger.error(`Fehler beim Löschen: ${err.message}`);
                  await interaction.editReply({
                    embeds: [error('Fehler', 'Konnte Eintrag nicht löschen.')],
                  });
                }
              }
              // Select-Collector stoppen
              selectCollector.stop();
            }
          });
        }
      });

      collector.on('end', async () => {
        // Buttons disablen, wenn Collector abgelaufen ist
        const pageEntries = getPageEntries(currentPage);
        const oldRows = createActionRows(currentPage, pageEntries);

        const disabledRows = oldRows.map((r) => {
          const newRow = new ActionRowBuilder();
          r.components.forEach((component) => {
            if (component.data && component.data.custom_id) {
              const disabledBtn = ButtonBuilder.from(component).setDisabled(true);
              newRow.addComponents(disabledBtn);
            } else {
              newRow.addComponents(component);
            }
          });
          return newRow;
        });

        try {
          await interaction.editReply({ components: disabledRows });
        } catch (err) {
          Logger.error(`Fehler beim Deaktivieren der Buttons: ${err.message}`);
        }
      });

    } catch (err) {
      Logger.error(`Ein unerwarteter Fehler: ${err.message}\n${err.stack}`);
      try {
        await interaction.reply({
          embeds: [error('Error', 'Ein unerwarteter Fehler ist aufgetreten.')],
          ephemeral: true
        });
      } catch (replyError) {
        Logger.error(`Fehler beim Error-Reply: ${replyError.message}`);
      }
    }
  }
};
