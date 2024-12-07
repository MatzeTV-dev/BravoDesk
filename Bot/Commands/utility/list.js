const {
    SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { getEverythingCollection, deleteEntry } = require('../../Database/qdrant.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('list')
        .setDescription('Listet alle Wissenseinträge der KI auf'),

    async execute(interaction) {
        const roleName = 'KI-Admin';
        const member = interaction.member;

        const hasRole = member.roles.cache.some((role) => role.name === roleName);

        if (!hasRole) {
            await interaction.reply({
				content: 'Whoops! Looks like you do not have the permisson for that. A Administrator was informed!',
				ephemeral: true,
			});
            return;
        }

        await interaction.reply('Alle Daten werden abgerufen...');

        const knowledge = await getEverythingCollection(interaction.guildId);

        if (!knowledge || knowledge.length === 0) {
            await interaction.editReply('Keine Daten gefunden.');
            return;
        }

        // Nachricht aktualisieren, um zu signalisieren, dass die Daten abgerufen wurden
        await interaction.editReply('Daten wurden erfolgreich abgerufen.');

        // Funktion zum Senden einzelner Nachrichten für jeden Eintrag
        const sendEntryMessages = async () => {
            for (const item of knowledge) {
                const embed = new EmbedBuilder()
                    .setTitle('Wissenseintrag')
                    .addFields(
                        { name: '**🆔 ID**', value: item.id },
                        { name: '**📜 Inhalt**', value: item.payload.text }
                    )
                    .setColor(0x00AE86);

                const editButton = new ButtonBuilder()
                    .setCustomId(`edit_${item.id}`)
                    .setLabel('Edit')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji("✏️");

                const deleteButton = new ButtonBuilder()
                    .setCustomId(`delete_${item.id}`)
                    .setLabel('Delete')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji("❕");

                const actionRow = new ActionRowBuilder().addComponents(editButton, deleteButton);

                await interaction.channel.send({
                    embeds: [embed],
                    components: [actionRow],
                });

                // Optional: Wartezeit einfügen, um Ratenbegrenzungen zu vermeiden
                await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 Sekunde warten
            }
        };

        await sendEntryMessages();

        // Erstellen eines Collectors für Button-Interaktionen
        const filter = (i) =>
            (i.customId.startsWith('edit_') || i.customId.startsWith('delete_')) &&
            i.user.id === interaction.user.id;

        const collector = interaction.channel.createMessageComponentCollector({
            filter,
            time: 60000,
        });

        collector.on('collect', async (i) => {
            const [action, id] = i.customId.split('_');

            if (action === 'edit') {
                // Erstelle ein Modal für die Eingabe des neuen Inhalts
                const modal = new ModalBuilder()
                    .setCustomId(`edit_modal_${id}`)
                    .setTitle('Eintrag bearbeiten');

                const textInput = new TextInputBuilder()
                    .setCustomId('newContent')
                    .setLabel('Neuer Inhalt')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(textInput));

                await i.showModal(modal);
            } else if (action === 'delete') {
                // Wissenseintrag löschen
                try {
                    await deleteEntry(interaction.guildId, id);
                
                    // Interaktion anerkennen ohne Nachricht zu aktualisieren
                    await i.deferUpdate();
                
                    // Nachricht löschen
                    await i.message.delete();
                } catch (error) {
                    console.error('Fehler beim Löschen des Eintrags:', error);
                    await i.reply({
                        content: 'Es gab einen Fehler beim Löschen des Eintrags.',
                        ephemeral: true,
                    });
                }
            }
        });

        collector.on('end', (collected) => {
            console.log(`Gesammelte Interaktionen: ${collected.size}`);
        });
    },
};
