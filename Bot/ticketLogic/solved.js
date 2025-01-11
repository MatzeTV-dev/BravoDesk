const Logger = require('../helper/loggerHelper.js');

module.exports = {
    data: {
        name: 'mark_as_solved_button', // Muss mit dem customId des Buttons übereinstimmen
    },
    async execute(interaction) {
        const channel = interaction.channel;

        if (!channel) {
            Logger.warn('Kanal nicht gefunden. Möglicherweise wurde er bereits gelöscht.');
            await interaction.reply({
                content: 'Es scheint, als wäre dieses Ticket bereits geschlossen.',
                ephemeral: true,
            });
            return;
        }

        try {
            // Informiere den Benutzer
            await interaction.reply({ content: 'Das Ticket wird als abgeschlossen markiert...', ephemeral: true });

            // Logge den Kanalnamen und die ID vor dem Löschen
            Logger.info(`Ticket-Kanal wird als abgeschlossen markiert: Name="${channel.name}", ID=${channel.id}`);

            // Lösche den Kanal
            await channel.delete();
        } catch (error) {
            Logger.error(`Fehler beim Markieren des Tickets als abgeschlossen (Kanal: ${channel.name}, ID: ${channel.id}): ${error.message}\n${error.stack}`);

            // Fehlerantwort an den Benutzer
            try {
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.followUp({
                        content: 'Es gab einen Fehler beim Markieren des Tickets als abgeschlossen. Bitte versuche es später erneut.',
                        ephemeral: true,
                    });
                }
            } catch (replyError) {
                Logger.error(`Fehler beim Senden der Fehlermeldung: ${replyError.message}\n${replyError.stack}`);
            }
        }
    },
};