const {
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require('discord.js');
const { editEntry, getEntry } = require('../Database/qdrant.js');
const { info } = require('../helper/embedHelper.js');

module.exports = async (client, interaction) => {
    try {
        if (interaction.isCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`Kein Befehl gefunden: ${interaction.commandName}`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`Fehler beim Ausführen des Befehls ${interaction.commandName}:`, error);

                if (!interaction.deferred && !interaction.replied) {
                    await interaction.reply({
                        content: 'Es gab einen Fehler bei der Ausführung dieses Befehls!',
                        ephemeral: true,
                    });
                }
            }

        } else if (interaction.isStringSelectMenu()) {
            const selectMenu = client.selectMenus.get(interaction.customId);

            if (!selectMenu) {
                console.error(`Kein Select Menu gefunden: ${interaction.customId}`);
                return;
            }

            try {
                await selectMenu.execute(interaction);
            } catch (error) {
                console.error(`Fehler beim Ausführen des Select Menus ${interaction.customId}:`, error);

                if (!interaction.deferred && !interaction.replied) {
                    await interaction.reply({
                        content: 'Es gab einen Fehler bei der Verarbeitung deiner Auswahl!',
                        ephemeral: true,
                    });
                }
            }

        } else if (interaction.isButton()) {
            const button = client.buttons.get(interaction.customId);
        
            if (button) {
                await button.execute(interaction);

            } else if (interaction.customId.startsWith('edit')) {
                try {

                    console.log(interaction.customId);

                    const button = client.buttons.get(interaction.customId);

                    if (!button) {
                        console.log(`Kein Button Handler gefunden: ${interaction.customId}`);
                        return;
                    }
                    await button.execute(interaction);

                    const entryId = interaction.customId.split('_')[1];
                    const entry = await getEntry(entryId, interaction.guildId);

                    console.log('Gefundener Eintrag:', entry);

                    const modal = new ModalBuilder()
                        .setCustomId(`edit_modal_${entryId}`)
                        .setTitle('Eintrag bearbeiten');

                    const descriptionInput = new TextInputBuilder()
                        .setCustomId('description')    // Wichtig: dieser customId muss "description" heißen
                        .setLabel('Beschreibung des Eintrags')
                        .setStyle(TextInputStyle.Paragraph)
                        .setValue(entry.text || '');

                    // ActionRow + addComponents()
                    const row = new ActionRowBuilder().addComponents(descriptionInput);
                    modal.addComponents(row);
                    if (interaction.deferred || interaction.replied) {
                        console.warn('Interaktion wurde kurz vor showModal() doch noch beantwortet, Abbruch.');
                        return;
                    }

                    console.log('ZEIGE Modal an:', {
                        customId: `edit_modal_${entryId}`,
                        fields: ['description'],
                      });

                    await interaction.showModal(modal);

                } catch (error) {
                    console.error('Fehler im edit-Button-Handler:', error);
                }

            } else {
                console.error(`Kein Button Handler gefunden: ${interaction.customId}`);
            }

        } else if (interaction.isModalSubmit()) { 
            console.log('Feld-IDs in diesem Modal:', interaction.fields.fields.map(f => f.customId));
        
            if (interaction.customId.startsWith('edit_modal_')) {
                const splitted = interaction.customId.split('_');
                const entryId = splitted[2];
                const description = interaction.fields.getTextInputValue('newContent');
                try {
                    await editEntry(interaction.guildId, entryId, { description });

                    await interaction.reply({
                        embeds: [info('Wissenseintrag', 'Der Wissenseintrag wurde erfolgreich aktualisiert')],
                        ephemeral: true,
                    });
                } catch (error) {
                    console.error('Fehler beim Aktualisieren des Eintrags:', error);

                    if (!interaction.deferred && !interaction.replied) {
                        await interaction.reply({
                            content: 'Es gab einen Fehler beim Aktualisieren des Eintrags.',
                            ephemeral: true,
                        });
                    }
                }
            } else {
                console.warn(`Unbekannte Modal-Interaktion mit customId: ${interaction.customId}`);
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.reply({
                        content: 'Unbekannte Interaktion verarbeitet.',
                        ephemeral: true,
                    });
                }
            }

        } else {
            console.warn(`Unhandled interaction type: ${interaction.type}`);
        }

    } catch (error) {
        console.error('Ein unerwarteter Fehler ist aufgetreten:', error);

        if (!interaction.deferred && !interaction.replied) {
            try {
                await interaction.reply({
                    content: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut.',
                    ephemeral: true,
                });
            } catch (replyError) {
                console.error('Fehler beim Senden der Fehlermeldung:', replyError);
            }
        }
    }
};
