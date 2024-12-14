
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { getEverythingCollection, deleteEntry } = require('../../Database/qdrant.js');
const { error, info } = require('../../helper/embedHelper.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('list')
        .setDescription('Listet alle Wissenseinträge der KI auf'),

    async execute(interaction) {
        try {

            await interaction.deferReply();

            const roleName = 'KI-Admin';
            const member = interaction.member;

            const hasRole = member.roles.cache.some((role) => role.name === roleName);

            if (!hasRole) {
                await interaction.editReply({
                    embeds: [error('Error!', 'Hoppla! Es sieht so aus, als hättest du keine Berechtigung dafür. Ein Administrator wurde informiert!')],
                    ephemeral: true,
                });

                const adminChannel = interaction.guild.channels.cache.find(
                    (channel) => channel.name === 'admin-log'
                );
                if (adminChannel) {
                    await adminChannel.send(
                        `⚠️ Benutzer ${interaction.user.tag} hat versucht, den Befehl \`/list\` ohne die erforderliche Rolle (${roleName}) auszuführen.`
                    );
                }
                return;
            }

            const knowledge = await getEverythingCollection(interaction.guildId);

            if (!knowledge || knowledge.length === 0) {
                await interaction.editReply({
                    embeds: [error('Error!', 'Keine Daten gefunden!')],
                    ephemeral: true,
                });
                return;
            }

            const sendEntryMessages = async () => {
                for (const item of knowledge) {
                    try {
                        const embed = new EmbedBuilder()
                            .setTitle('Wissenseintrag')
                            .addFields(
                                { name: '**🆔 ID**', value: item.id },
                                { name: '**📜 Inhalt**', value: item.payload.text }
                            )
                            .setColor(0x00AE86);

                        const editButton = new ButtonBuilder()
                            .setCustomId(`edit_${item.id}`)
                            .setLabel('Bearbeiten')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('✏️');

                        const deleteButton = new ButtonBuilder()
                            .setCustomId(`delete_${item.id}`)
                            .setLabel('Löschen')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('❕');

                        const actionRow = new ActionRowBuilder().addComponents(editButton, deleteButton);

                        await interaction.channel.send({
                            embeds: [embed],
                            components: [actionRow],
                        });

                        await new Promise((resolve) => setTimeout(resolve, 1000));
                    } catch (error) {
                        console.error('Error while sending a knowledge entry:', error);
                    }
                }
            };

            await sendEntryMessages();

            const filter = (i) =>
                (i.customId.startsWith('edit_') || i.customId.startsWith('delete_')) &&
                i.user.id === interaction.user.id;

            const collector = interaction.channel.createMessageComponentCollector({
                filter,
                time: 60000,
            });

            collector.on('collect', async (i) => {
                try {
                    const [action, id] = i.customId.split('_');

                    if (action === 'edit') {
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
                        try {
                            await deleteEntry(interaction.guildId, id);
                            await i.deferUpdate();
                            await i.message.delete();
                            await interaction.editReply({
                                embeds: [info('Deleted', "Der Wissenseintrag wurdege erfolgreich gelöscht")],
                                ephemeral: true,
                            })
                        } catch (error) {
                            console.error('Error while deleting entry:', error);
                            await interaction.editReply({
                                embeds: [error('Error', 'Es gab einne Fehler beim Löschen des Eintrages.')],
                                ephemeral: true,
                            });
                        }
                    }
                } catch (error) {
                    console.error('Error while processing button interaction:', error);
                    await iinteraction.editReply({
                        embeds: [error('Error', 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.')],
                        ephemeral: true,
                    });
                }
            });

            collector.on('end', (collected) => {
                console.log(`Collected interactions: ${collected.size}`);
            });
        } catch (error) {
            console.error('An unexpected error occurred:', error);

            try {
                await interaction.reply({
                    embeds: [error('Error', 'Ein Unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut.')],
                    ephemeral: true,
                });
            } catch (replyError) {
                console.error('Error sending error message:', replyError);
            }
        }
    },
};
