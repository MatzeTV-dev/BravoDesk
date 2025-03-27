import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
  import { editEntry, getEntry, deleteEntry } from '../Database/qdrant.js';
  import { info, error } from '../helper/embedHelper.js';
  import Logger from '../helper/loggerHelper.js';
  
  export default async (client, interaction) => {
    try {
      // ---------------------------------------
      // 1) Slash Commands
      // ---------------------------------------
      if (interaction.isCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) {
          Logger.warn(`Kein Befehl gefunden: ${interaction.commandName}`);
          return;
        }
        try {
          await command.execute(interaction);
        } catch (err) {
          Logger.error(`Fehler beim Ausführen des Befehls ${interaction.commandName}: ${err.message}\n${err.stack}`);
          if (!interaction.deferred && !interaction.replied) {
            await interaction.reply({
              content: 'Es gab einen Fehler bei der Ausführung dieses Befehls!',
              ephemeral: true,
            });
          }
        }
  
      // ---------------------------------------
      // 2) Select Menus
      // ---------------------------------------
      } else if (interaction.isStringSelectMenu()) {
        const selectMenu = client.selectMenus.get(interaction.customId);
        if (!selectMenu) {
          Logger.warn(`Kein Select Menu gefunden: ${interaction.customId}`);
          return;
        }
        try {
          await selectMenu.execute(interaction);
        } catch (err) {
          Logger.error(`Fehler beim Ausführen des Select Menus ${interaction.customId}: ${err.message}\n${err.stack}`);
          if (!interaction.deferred && !interaction.replied) {
            await interaction.reply({
              content: 'Es gab einen Fehler bei der Verarbeitung deiner Auswahl!',
              ephemeral: true,
            });
          }
        }
  
      // ---------------------------------------
      // 3) Buttons
      // ---------------------------------------
      } else if (interaction.isButton()) {
        const { customId } = interaction;
        // Falls du ein eigenes Buttons-Command-Objekt-Handling hast:
        const button = client.buttons.get(customId);
        if (button) {
          await button.execute(interaction);
          return;
        }
  
        // ------ BEARBEITEN ------
        if (customId.startsWith('edit_')) {
          try {
            Logger.info(`Button Interaction gestartet: ${customId}`);
            const entryId = customId.split('_')[1];
            const entry = await getEntry(entryId, interaction.guildId);
            Logger.info('Gefundener Eintrag:', JSON.stringify(entry));
  
            // Modal erzeugen
            const modal = new ModalBuilder()
              .setCustomId(`edit_modal_${entryId}`)
              .setTitle('Eintrag bearbeiten');
  
            const oldText = typeof entry?.text === 'string'
              ? entry.text
              : '';
  
            const descriptionInput = new TextInputBuilder()
              .setCustomId('description')
              .setLabel('Beschreibung des Eintrags')
              .setStyle(TextInputStyle.Paragraph)
              .setValue(oldText);
  
            const row = new ActionRowBuilder().addComponents(descriptionInput);
            modal.addComponents(row);
  
            if (interaction.deferred || interaction.replied) {
              Logger.warn('Interaktion wurde kurz vor showModal() beantwortet, Abbruch.');
              return;
            }
  
            Logger.info('ZEIGE Modal an:', {
              customId: `edit_modal_${entryId}`,
              fields: ['description'],
            });
  
            await interaction.showModal(modal);
          } catch (err) {
            Logger.error(`Fehler im edit-Button-Handler: ${err.message}\n${err.stack}`);
            if (!interaction.deferred && !interaction.replied) {
              await interaction.reply({
                embeds: [error('Fehler', 'Beim Bearbeiten ist ein Fehler aufgetreten.')],
                ephemeral: true,
              });
            }
          }
  
        // ------ LÖSCHEN ------
        } else if (customId.startsWith('delete_')) {
          try {
            Logger.info(`Delete-Button geklickt: ${customId}`);
            const entryId = customId.split('_')[1];
  
            // Eintrag löschen
            await deleteEntry(interaction.guildId, entryId);
  
            // Einfaches Feedback senden:
            await interaction.reply({
              embeds: [info('Gelöscht', `Der Eintrag mit ID \`${entryId}\` wurde erfolgreich gelöscht.`)],
              ephemeral: true,
            });
          } catch (err) {
            Logger.error(`Fehler beim Löschen: ${err.message}\n${err.stack}`);
            if (!interaction.deferred && !interaction.replied) {
              await interaction.reply({
                embeds: [error('Fehler', 'Beim Löschen ist ein Fehler aufgetreten.')],
                ephemeral: true,
              });
            }
          }
  
        // ----- UNBEKANNTER BUTTON -----
        } else {
          Logger.warn(`Kein Button Handler gefunden: ${customId}`);
        }
  
      // ---------------------------------------
      // 4) Modals
      // ---------------------------------------
      } else if (interaction.isModalSubmit()) {
        Logger.info('Feld-IDs in diesem Modal:', interaction.fields.fields.map(f => f.customId));
  
        // BEARBEITEN: edit_modal_<ID>
        if (interaction.customId.startsWith('edit_modal_')) {
          const splitted = interaction.customId.split('_');
          const entryId = splitted[2];
          // Den neuen Text aus dem Modal
          const description = interaction.fields.getTextInputValue('description');
          try {
            // Nur den String an editEntry übergeben
            await editEntry(interaction.guildId, entryId, description);
            await interaction.reply({
              embeds: [info('Wissenseintrag', 'Der Wissenseintrag wurde erfolgreich aktualisiert')],
              ephemeral: true,
            });
          } catch (err) {
            Logger.error(`Fehler beim Aktualisieren des Eintrags: ${err.message}\n${err.stack}`);
            if (!interaction.deferred && !interaction.replied) {
              await interaction.reply({
                content: 'Es gab einen Fehler beim Aktualisieren des Eintrags.',
                ephemeral: true,
              });
            }
          }
        } else {
          Logger.warn(`Unbekannte Modal-Interaktion mit customId: ${interaction.customId}`);
          if (!interaction.deferred && !interaction.replied) {
            await interaction.reply({
              content: 'Unbekannte Interaktion verarbeitet.',
              ephemeral: true,
            });
          }
        }
  
      // ---------------------------------------
      // 5) Unhandled Interaction
      // ---------------------------------------
      } else {
        Logger.warn(`Unhandled interaction type: ${interaction.type}`);
      }
    } catch (err) {
      Logger.error(`Ein unerwarteter Fehler ist aufgetreten: ${err.message}\n${err.stack}`);
      if (!interaction.deferred && !interaction.replied) {
        try {
          await interaction.reply({
            content: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut.',
            ephemeral: true,
          });
        } catch (replyError) {
          Logger.error(`Fehler beim Senden der Fehlermeldung: ${replyError.message}\n${replyError.stack}`);
        }
      }
    }
  };
  