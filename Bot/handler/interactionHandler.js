const { EmbedBuilder } = require('discord.js');
const { editEntry } = require('../Database/qdrant.js'); // Passe den Pfad an, falls erforderlich

module.exports = async (client, interaction) => {
    if (interaction.isCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`Error executing command ${interaction.commandName}:`, error);
            await interaction.reply({
                content: 'There was an error while executing this command!',
                ephemeral: true,
            });
        }
    } else if (interaction.isStringSelectMenu()) {
        const selectMenu = client.selectMenus.get(interaction.customId);

        if (!selectMenu) {
            console.error(`No select menu matching ${interaction.customId} was found.`);
            return;
        }

        try {
            await selectMenu.execute(interaction);
        } catch (error) {
            console.error(`Error executing select menu ${interaction.customId}:`, error);
            await interaction.reply({
                content: 'There was an error while processing your selection!',
                ephemeral: true,
            });
        }
    } else if (interaction.isButton()) {
        // Falls du separate Button-Handler hast
        const button = client.buttons.get(interaction.customId);

        if (!button) {
            console.error(`No button matching ${interaction.customId} was found.`);
            return;
        }

        try {
            await button.execute(interaction);
        } catch (error) {
            console.error(`Error executing button ${interaction.customId}:`, error);
            await interaction.reply({
                content: 'Es gab einen Fehler bei der Verarbeitung deiner Anfrage!',
                ephemeral: true,
            });
        }
    } else if (interaction.isModalSubmit()) {
        // Hier Modal-Interaktionen verarbeiten
        if (interaction.customId.startsWith('edit_modal_')) {
            const id = interaction.customId.replace('edit_modal_', '');
            const newContent = interaction.fields.getTextInputValue('newContent');

            // Wissenseintrag aktualisieren
            try {
                await editEntry(interaction.guildId, id, newContent);
                await interaction.reply({
                    content: 'Der Eintrag wurde erfolgreich aktualisiert.',
                    ephemeral: true,
                });

                // Ursprüngliche Nachricht aktualisieren
                const updatedEmbed = new EmbedBuilder()
                    .setTitle('Wissenseintrag')
                    .addFields(
                        { name: 'ID', value: id },
                        { name: 'Inhalt', value: newContent }
                    )
                    .setColor(0x00AE86);

                // Suche die ursprüngliche Nachricht anhand der Komponenten
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
                    console.error('Ursprüngliche Nachricht nicht gefunden.');
                }
            } catch (error) {
                console.error('Fehler beim Aktualisieren des Eintrags:', error);
                await interaction.reply({
                    content: 'Es gab einen Fehler beim Aktualisieren des Eintrags.',
                    ephemeral: true,
                });
            }
        } else {
            // Andere Modal-Interaktionen hier handhaben
            console.log(`Unhandled modal interaction with customId ${interaction.customId}`);
        }
    } else {
        return;
    }
};
