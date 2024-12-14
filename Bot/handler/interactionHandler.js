
const { EmbedBuilder } = require('discord.js');
const { editEntry } = require('../Database/qdrant.js');
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
                await interaction.reply({
                    content: 'Es gab einen Fehler bei der Ausführung dieses Befehls!',
                    ephemeral: true,
                });
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
                await interaction.reply({
                    content: 'Es gab einen Fehler bei der Verarbeitung deiner Auswahl!',
                    ephemeral: true,
                });
            }
        } else if (interaction.isButton()) {
            const button = client.buttons.get(interaction.customId);

            if (!button) {
                console.error(`Kein Button gefunden: ${interaction.customId}`);
                return;
            }

            try {
                await button.execute(interaction);
            } catch (error) {
                console.error(`Fehler beim Ausführen des Buttons ${interaction.customId}:`, error);
                await interaction.reply({
                    content: 'Es gab einen Fehler bei der Verarbeitung deiner Anfrage!',
                    ephemeral: true,
                });
            }
        } else if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('edit_modal_')) {
                const id = interaction.customId.replace('edit_modal_', '');
                const newContent = interaction.fields.getTextInputValue('newContent');

                try {
                    await editEntry(interaction.guildId, id, newContent);
                    await interaction.reply({
                        embeds: [info('Wissenseintrag', 'Der Wissenseintrag wurde aktualisiert')],
                        ephemeral: true,
                    });

                    const updatedEmbed = new EmbedBuilder()
                        .setTitle('Wissenseintrag')
                        .addFields(
                            { name: 'ID', value: id },
                            { name: 'Inhalt', value: newContent }
                        )
                        .setColor(0x00AE86);

                    const messages = await interaction.channel.messages.fetch({ limit: 100 });
                    const originalMessage = messages.find((msg) =>
                        msg.components.some((row) =>
                            row.components.some(
                                (component) =>
                                    component.customId === `edit_${id}` ||
                                    component.customId === `delete_${id}`
                            )
                        )
                    );

                    if (originalMessage) {
                        await originalMessage.edit({ embeds: [updatedEmbed] });
                    } else {
                        console.warn(`Ursprüngliche Nachricht für ID ${id} nicht gefunden.`);
                    }
                } catch (error) {
                    console.error('Fehler beim Aktualisieren des Eintrags:', error);
                    await interaction.reply({
                        content: 'Es gab einen Fehler beim Aktualisieren des Eintrags.',
                        ephemeral: true,
                    });
                }
            } else {
                console.warn(`Unbekannte Modal-Interaktion mit customId: ${interaction.customId}`);
                await interaction.reply({
                    content: 'Unbekannte Interaktion verarbeitet.',
                    ephemeral: true,
                });
            }
        } else {
            console.warn(`Unhandled interaction type: ${interaction.type}`);
        }
    } catch (error) {
        console.error('Ein unerwarteter Fehler ist aufgetreten:', error);
        try {
            await interaction.reply({
                content: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut.',
                ephemeral: true,
            });
        } catch (replyError) {
            console.error('Fehler beim Senden der Fehlermeldung:', replyError);
        }
    }
};
