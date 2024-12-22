const Logger = require('../helper/loggerHelper.js');

module.exports = {
    data: {
        name: 'close_ticket_button', // Muss mit dem customId des Buttons übereinstimmen
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
            // Informiere den Benutzer über den Schließvorgang
            await interaction.reply({ content: 'Das Ticket wird geschlossen...', ephemeral: true });

            // Logge den Kanalnamen und die ID, bevor er gelöscht wird
            Logger.info(`Ticket-Kanal wird geschlossen: Name="${channel.name}", ID=${channel.id}`);

            // Lösche den Kanal
            await channel.delete();
        } catch (error) {
            Logger.error(`Fehler beim Schließen des Tickets (Kanal: ${channel.name}, ID: ${channel.id}): ${error.message}`);

            // Fehlerantwort an den Benutzer
            try {
                await interaction.followUp({
                    content: 'Es gab einen Fehler beim Schließen des Tickets. Bitte versuche es später erneut.',
                    ephemeral: true,
                });
            } catch (replyError) {
                Logger.error(`Fehler beim Senden der Fehlermeldung: ${replyError.message}`);
            }
        }
    },
};