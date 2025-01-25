const { getServerInformation, Delete } = require('../../Database/database.js');
const { SlashCommandBuilder } = require('discord.js');
const { deleteAll } = require('../../Database/qdrant.js');
const { error, info } = require('../../helper/embedHelper.js');
const Logger = require('../../helper/loggerHelper.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset')
        .setDescription('Löscht alle Wissenseinträge, Rollen und erstellen channel von BravoDesk.'),
    async execute(interaction) {
        const guild = interaction.guild;

        await interaction.deferReply({ ephemeral: true });

        try {
            // Überprüfung: Nur der Serverbesitzer darf den Befehl ausführen
            if (guild.ownerId !== interaction.user.id) {
                await interaction.editReply({
                    embeds: [error('Error', 'This action can only be performed by the server owner! An administrator has been informed about your attempt.')],
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
            
            // Suchen des Ticket-Channels
            const ticket_channel = guild.channels.cache.find(
                (channel) => channel.name === 'ticket-system'
            );

            // Vergleich der IDs
            if (interaction.channel.id === ticket_channel.id) {
                await interaction.editReply({
                    embeds: [error('Reset', 'Dieser Befehl kann hier nicht ausgeführt werden.')],
                });
                return;
            }
            // Antwort senden, um die Aktion zu bestätigen
            await interaction.editReply({
                embeds: [info('Reset Process', 'Der Prozess wurde gestartet!')],
            });

            const rawData = await getServerInformation(guild.id);
            if (!rawData || rawData.length === 0) {
                await interaction.editReply({
                    embeds: [error('Reset Process', 'Keine Serverinformationen gefunden!')],
                });
                return;
            }

            const data = rawData[0][0];

            // Löschen von Ressourcen (Channels, Kategorien, Rollen)
            try {
                const channel = guild.channels.cache.get(data.ticket_system_channel_id);
                if (channel) {
                    await channel.delete();
                    Logger.success(`Channel mit der ID gelöscht: ${data.ticket_system_channel_id}`);
                } else {
                    Logger.info(`Channel mit der ID ${data.ticket_system_channel_id} wurde nicht gefunden.`);
                }

                const category = guild.channels.cache.get(data.ticket_category_id);
                if (category) {
                    await category.delete();
                    Logger.success(`Kategorie mit der ID ${data.ticket_category_id} gelöscht.`);
                } else {
                    Logger.info(`Kategorie mit der ID ${data.ticket_category_id} wurde nicht gefunden.`);
                }

                    // Datenbankeinträge löschen
                try {
                    await interaction.editReply({
                        embeds: [info('Reset Process', 'Deleting Databaseinformation')],
                    });
                    await Delete('CALL Delete_Server_Information(?)', guild.id);
                    Logger.success('Datenbankeinträge erfolgreich gelöscht.');
                } catch (dbError) {
                    Logger.error(`Fehler beim Löschen der Datenbankinformationen: ${dbError.message}`);
                    await interaction.editReply({
                        embeds: [error('Reset Process', 'Fehler beim Löschen von Datenbankinformationen')],
                    });
                    return;
                }

                // KI-Wissen löschen
                try {
                    await interaction.editReply({
                        embeds: [info('Reset Process', 'Deleting AI-Knowledge')],
                    });
                    await deleteAll('guild_' + guild.id);
                    Logger.success('KI-Wissen erfolgreich gelöscht.');
                } catch (aiError) {
                    Logger.error(`Fehler beim Löschen des KI-Wissens: ${aiError.message}`);
                    await interaction.editReply({
                        embeds: [error('Reset Process', 'Fehler beim Löschen von KI-Wissen')],
                    });
                    return;
                }

                let role = guild.roles.cache.get(data.support_role_id);
                if (role) {
                    await role.delete();
                    Logger.success(`Rolle mit der ID ${data.support_role_id} gelöscht.`);
                } else {
                    Logger.info(`Rolle mit der ID ${data.support_role_id} wurde nicht gefunden.`);
                }

                role = guild.roles.cache.get(data.kiadmin_role_id);
                if (role) {
                    await role.delete();
                    Logger.success(`Rolle mit der ID ${data.kiadmin_role_id} gelöscht.`);
                } else {
                    Logger.info(`Rolle mit der ID ${data.kiadmin_role_id} wurde nicht gefunden.`);
                }

                const categoryArchiv = guild.channels.cache.get(data.ticket_archiv_category_id);
                if (category) {
                    await categoryArchiv.delete();
                    Logger.success(`Kategorie mit der ID ${data.ticket_archiv_category_id} gelöscht.`);
                } else {
                    Logger.info(`Kategorie mit der ID ${data.ticket_archiv_category_id} wurde nicht gefunden.`);
                }

            } catch (resourceError) {
                Logger.error(`Fehler beim Löschen von Ressourcen: ${resourceError.message}\n${resourceError.stack}`);
                await interaction.editReply({
                    embeds: [error('Reset Process', 'Fehler beim Löschen von Ressourcen')],
                });
                return;
            }

            // Datenbankeinträge löschen
            try {
                await interaction.editReply({
                    embeds: [info('Reset Process', 'Deleting Databaseinformation')],
                });
                await Delete('CALL Delete_Server_Information(?)', guild.id);
                Logger.success('Datenbankeinträge erfolgreich gelöscht.');
            } catch (dbError) {
                Logger.error(`Fehler beim Löschen der Datenbankinformationen: ${dbError.message}\n${dbError.stack}`);
                await interaction.editReply({
                    embeds: [error('Reset Process', 'Fehler beim Löschen von Datenbankinformationen')],
                });
                return;
            }

            // KI-Wissen löschen
            try {
                await interaction.editReply({
                    embeds: [info('Reset Process', 'Deleting AI-Knowledge')],
                });
                await deleteAll('guild_' + guild.id);
                Logger.success('KI-Wissen erfolgreich gelöscht.');
            } catch (aiError) {
                Logger.error(`Fehler beim Löschen des KI-Wissens: ${aiError.message}\n${aiError.stack}`);
                await interaction.editReply({
                    embeds: [error('Reset Process', 'Fehler beim Löschen von Ressourcen, bitte lösch die Rollen KI-Admin und Support selbständig!')],
                });
                return;
            }

            // Abschlussnachricht
            await interaction.editReply({
                embeds: [info('Reset Process', 'Reset Process completed')],
            });
            Logger.info('Reset-Prozess abgeschlossen.');
        } catch (error) {
            Logger.error(`Ein unerwarteter Fehler ist aufgetreten: ${error.message}\n${error.stack}`);

            // Benutzerfreundliche Fehlermeldung
            try {
                
                await interaction.editReply({
                    content: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut.',
                });
            } catch (replyError) {
                Logger.error(`Fehler beim Senden der Fehlermeldung: ${replyError.message}\n${replyError.stack}`);
            }
        }
    },
};
