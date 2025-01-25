const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getServerInformation } = require('../Database/database.js')
const Logger = require('../helper/loggerHelper.js');

module.exports = {
    data: {
        name: 'close_ticket_button', // Muss mit dem customId des Buttons übereinstimmen
    },
    async execute(interaction) {
        const channel = interaction.channel;
        const guild_id = interaction.guild.id;
        const rawData = await getServerInformation(guild_id);
        const data = rawData[0][0];

        if (!channel) {
            Logger.warn('Kanal nicht gefunden. Möglicherweise wurde er bereits gelöscht.');
            await interaction.reply({
                content: 'Es scheint, als wäre dieses Ticket bereits geschlossen.',
                ephemeral: true,
            });
            return;
        }

        try {
            // Button deaktivieren
            const buttonRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket_button')
                    .setLabel('Geschlossen')
                    .setEmoji('❌')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true) // Button deaktivieren
            );

            // Nachricht aktualisieren
            await interaction.update({
                components: [buttonRow],
            });

            // Logge den Kanalnamen und die ID des Kanals, der geschlossen wird
            Logger.info(`Ticket-Kanal wird geschlossen: Name="${channel.name}", ID=${channel.id}`);

            // 1. Supporter-Rolle Rechte entfernen
            const supporterRole = channel.guild.roles.cache.find(role => role.id === data.support_role_id);
            if (supporterRole) {
                await channel.permissionOverwrites.edit(supporterRole, {
                    SendMessages: false, // Schreibrechte entziehen
                    ViewChannel: false, // Leserechte entziehen
                });
                Logger.info(`Die Rechte für die Supporter-Rolle wurden angepasst: "${supporterRole.name}"`);
            } else {
                Logger.warn('Supporter-Rolle nicht gefunden. Überspringe Rechteanpassung für Supporter.');
            }

            // 2. Benutzerrechte entfernen (alle Benutzer mit spezifischen Berechtigungen)
            const overwrites = channel.permissionOverwrites.cache;

            overwrites.forEach(async (overwrite) => {
                if (overwrite.type === 'member') { // Nur Benutzerrechte bearbeiten
                    const member = await channel.guild.members.fetch(overwrite.id);

                    await channel.permissionOverwrites.edit(member, {
                        SendMessages: false, // Schreibrechte entziehen
                        ViewChannel: false, // Leserechte entziehen
                    });

                    Logger.info(`Die Rechte für den Benutzer ${member.user.tag} wurden entfernt.`);
                }
            });

            // 3. Channel verschieben
            const archiveCategory = interaction.guild.channels.cache.find(
                c => c.id === data.ticket_archiv_category_id && c.type === 4 // Typ 4 entspricht einer Kategorie
            );

            if (archiveCategory) {
                await channel.setParent(archiveCategory.id);
                Logger.info(`Channel "${channel.name}" wurde in die Kategorie "${archiveCategory.name}" verschoben.`);
            } else {
                Logger.warn('Archiv-Kategorie nicht gefunden. Überspringe das Verschieben des Kanals.');
            }

        } catch (error) {
            Logger.error(`Fehler beim Schließen des Tickets (Kanal: ${channel.name}, ID: ${channel.id}): ${error.message}\n${error.stack}`);

            // Fehlerantwort an den Benutzer
            try {
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.followUp({
                        content: 'Es gab einen Fehler beim Schließen des Tickets. Bitte versuche es später erneut.',
                        ephemeral: true,
                    });
                }
            } catch (replyError) {
                Logger.error(`Fehler beim Senden der Fehlermeldung: ${replyError.message}\n${replyError.stack}`);
            }
        }
    },
};
