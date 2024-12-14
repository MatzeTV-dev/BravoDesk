const { getServerInformation, Delete } = require('../../Database/database.js');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { deleteAll } = require('../../Database/qdrant.js');
const { error, info } = require('../../helper/embedHelper.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset')
        .setDescription('Delete Everything from the AI and all channels + roles'),
    async execute(interaction) {
        const guild = interaction.guild;

        await interaction.deferReply();

        try {
            // Überprüfung: Nur der Serverbesitzer darf den Befehl ausführen
            if (guild.ownerId !== interaction.user.id) {
                await interaction.editReply({
                    embeds: [error('Error', 'This action can only be performed by the server owner! An administrator has been informed about your attempt.')],
                    ephemeral: true,
                });

                // Optionale Benachrichtigung für Admins
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

            // Antwort senden, um die Aktion zu bestätigen
            await interaction.editReply({
                embeds: [info('Reset Process', 'Der Prozess wurde gestartet!')],
                ephemeral: true,
            });

            const rawData = await getServerInformation(guild.id);
            if (!rawData || rawData.length === 0) {
                await interaction.editReply({
                    embeds: [error('Reset Process', 'Keine Serverinformationen gefunden!')],
                    ephemeral: true,
                });
                return;
            }

            const data = rawData[0][0];

            // Löschen von Ressourcen (Channels, Kategorien, Rollen)

            console.log(data);
            try {
                const channel = guild.channels.cache.get(data.ticket_system_channel_id);
                if (channel) {
                    await channel.delete();
                    console.log(`Deleted channel with ID: ${data.ticket_system_channel_id}`);
                } else {
                    console.log(`Channel with ID ${data.ticket_system_channel_id} not found.`);
                }

                const category = guild.channels.cache.get(data.ticket_category_id);
                if (category) {
                    await category.delete();
                    console.log(`Deleted category with ID: ${data.ticket_category_id}`);
                } else {
                    console.log(`Category with ID ${data.ticket_category_id} not found.`);
                }

                let role = guild.roles.cache.get(data.support_role_id);
                if (role) {
                    await role.delete();
                    console.log(`Deleted role with ID: ${data.support_role_id}`);
                } else {
                    console.log(`Role with ID ${data.support_role_id} not found.`);
                }

                role = guild.roles.cache.get(data.kiadmin_role_id);
                if (role) {
                    await role.delete();
                    console.log(`Deleted role with ID: ${data.kiadmin_role_id}`);
                } else {
                    console.log(`Role with ID ${data.kiadmin_role_id} not found.`);
                }
            } catch (resourceError) {
                console.error('Fehler beim Löschen von Ressourcen:', resourceError);
                await interaction.editReply({
                    embeds: [error('Reset Process', 'Fehler beim löschen von Ressourcen')],
                    ephemeral: true,
                });
                return;
            }

            // Datenbankeinträge löschen
            try {
                await interaction.editReply({
                    embeds: [info('Reset Process', 'Deleting Databaseinformation')],
                    ephemeral: true,
                });
                await Delete('CALL Delete_Server_Information(?)', guild.id);
            } catch (dbError) {
                console.error('Fehler beim Löschen der Datenbankinformationen:', dbError);
                await interaction.editReply({
                    embeds: [error('Reset Process', 'Fehler beim löschen von Datenbankinformationen')],
                    ephemeral: true,
                });
                return;
            }

            // KI-Wissen löschen
            try {
                await interaction.editReply({
                    embeds: [info('Reset Process', 'Deleting AI-Knowledge')],
                    ephemeral: true,
                });
                await deleteAll('guild_' + guild.id);
            } catch (aiError) {
                console.error('Fehler beim Löschen des KI-Wissens:', aiError);
                await interaction.editReply({
                    embeds: [error('Reset Process', 'Fehler beim löschen von KI-Wissen')],
                    ephemeral: true,
                });
                return;
            }

            // Abschlussnachricht
            await interaction.editReply({
                embeds: [info('Reset Process', 'Reset Process completed')],
                ephemeral: true,
            });
        } catch (error) {
            console.error('Ein unerwarteter Fehler ist aufgetreten:', error);

            // Benutzerfreundliche Fehlermeldung
            try {
                await interaction.editReply({
                    content: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut.',
                    ephemeral: true,
                });
            } catch (replyError) {
                console.error('Fehler beim Senden der Fehlermeldung:', replyError);
            }
        }
    },
};
