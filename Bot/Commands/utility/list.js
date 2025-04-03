import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ComponentType} from 'discord.js';
import { getEverythingCollection, deleteEntry } from '../../Database/qdrant.js';
import { getServerInformation } from '../../Database/database.js';
import { updateKiAdminID } from '../../helper/verification.js'
import { error, info } from '../../helper/embedHelper.js';
import Logger from '../../helper/loggerHelper.js';

/**
 * Command, der alle Wissenseinträge der KI auflistet.
 */
export default {
  data: new SlashCommandBuilder()
    .setName('list')
    .setDescription('Listet alle Wissenseinträge der KI auf'),
  /**
   * Führt den List-Befehl aus, indem er die entsprechenden Wissenseinträge abruft, paginiert
   * und dem User über interaktive Buttons anzeigt.
   *
   * @param {CommandInteraction} interaction - Das Interaktionsobjekt von Discord.
   * @returns {Promise<void>} Ein Promise, das resolved, wenn der Befehl abgeschlossen ist.
   */
  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const ServerInformation = await getServerInformation(interaction.guildId);
      const member = interaction.member;
      let kiadminRole = interaction.guild.roles.cache.get(ServerInformation[0][0].kiadmin_role_id);

      try {
        if (!kiadminRole) {
          kiadminRole = await updateKiAdminID(interaction.guild);
        }
      } catch (error) {
        console.log(error)      
      }

      const hasRole = member.roles.cache.some((role) => role.id === kiadminRole.id);

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

      const knowledge = await getEverythingCollection(interaction.guildId);
      if (!knowledge || knowledge.length === 0) {
        await interaction.editReply({
          embeds: [error('Error!', 'Keine Daten gefunden!')]
        });
        return;
      }

      const globalIndexIdMap = knowledge.map((item) => item.id);

      let currentPage = 1;
      const itemsPerPage = 6;
      let totalEntries = knowledge.length;
      let totalPages = Math.ceil(totalEntries / itemsPerPage);

      /**
       * Ermittelt die Wissenseinträge, die auf einer bestimmten Seite angezeigt werden sollen.
       *
       * @param {number} page - Die Seitenzahl, für die die Einträge ermittelt werden sollen.
       * @returns {Array} Das Array der Wissenseinträge für die angegebene Seite.
       */
      function getPageEntries(page) {
        const startIndex = (page - 1) * itemsPerPage;
        return knowledge.slice(startIndex, startIndex + itemsPerPage);
      }

      /**
       * Erstellt ein Embed, das die Wissenseinträge der aktuellen Seite anzeigt.
       *
       * @param {number} page - Die aktuelle Seitenzahl.
       * @param {Array} pageEntries - Die Wissenseinträge der aktuellen Seite.
       * @returns {EmbedBuilder} Das erstellte Embed-Objekt.
       */
      function createEmbed(page, pageEntries) {
        const embed = new EmbedBuilder()
          .setTitle(`Wissenseinträge – Seite ${page}/${totalPages}`)
          .setColor('#345635');

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

      /**
       * Erstellt Action Rows mit Buttons für jeden Eintrag und zusätzliche Navigations-Buttons.
       *
       * @param {number} page - Die aktuelle Seitenzahl.
       * @param {Array} pageEntries - Die Wissenseinträge der aktuellen Seite.
       * @returns {Array} Ein Array von ActionRowBuilder-Objekten.
       */
      function createActionRows(page, pageEntries) {
        const rows = [];
        let row = new ActionRowBuilder();
        let buttonsInRow = 0;

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

          if (buttonsInRow >= 5) {
            rows.push(row);
            row = new ActionRowBuilder();
            buttonsInRow = 0;
          }
        });

        if (buttonsInRow > 0) {
          rows.push(row);
        }

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

      /**
       * Aktualisiert die angezeigte Seite, indem das Reply mit neuen Embeds und Komponenten editiert wird.
       *
       * @param {number} page - Die Seitenzahl, die angezeigt werden soll.
       * @returns {Promise<void>} Ein Promise, das resolved, wenn die Seite aktualisiert wurde.
       */
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

      const msg = await interaction.fetchReply();
      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 5 * 60 * 1000 // 5 Minuten
      });

      collector.on('collect', async (i) => {
        if (i.user.id !== interaction.user.id) {
          return i.reply({
            content: 'Nur der ausführende User kann das nutzen.',
            ephemeral: true
          });
        }

        const { customId } = i;

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

        if (customId.startsWith('action_')) {
          const [, globalIndexStr] = customId.split('_');
          const globalIndex = parseInt(globalIndexStr, 10);

          const dbId = globalIndexIdMap[globalIndex];

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

                  knowledge.splice(globalIndex, 1);
                  globalIndexIdMap.splice(globalIndex, 1);

                  totalEntries = knowledge.length;
                  totalPages = Math.ceil(totalEntries / itemsPerPage);

                  if (currentPage > totalPages && totalPages > 0) {
                    currentPage = totalPages;
                  }

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
              selectCollector.stop();
            }
          });
        }
      });

      collector.on('end', async () => {
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
