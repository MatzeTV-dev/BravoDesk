const Logger = require('../helper/loggerHelper.js');

module.exports = {
    data: {
        name: 'talk_to_human', // Muss mit dem customId des Buttons übereinstimmen
    },
    async execute(interaction) {
        const channel = interaction.channel;

        if (!channel) {
            Logger.warn('Kanal nicht gefunden. Möglicherweise wurde er gelöscht.');
            await interaction.reply({
                content: 'Es scheint, als wäre dieses Ticket nicht mehr verfügbar.',
                ephemeral: true,
            });
            return;
        }

        try {
            // Sende Nachricht in den Kanal
            await channel.send('Alles klar, ein menschlicher Supporter wird das Ticket übernehmen!');

            // Aktualisiere die Interaktion, um den Button zu deaktivieren oder keine weitere Aktion auszuführen
            await interaction.update({});
        } catch (error) {
            Logger.error(`Fehler beim Senden der Nachricht an den menschlichen Support: ${error.message}\n${error.stack}`);

            try {
                // Informiere den Benutzer über den Fehler
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.reply({
                        content: 'Es gab einen Fehler beim Weiterleiten an den menschlichen Support.',
                        ephemeral: true,
                    });
                }
            } catch (replyError) {
                Logger.error(`Fehler beim Senden der Fehlermeldung: ${replyError.message}\n${replyError.stack}`);
            }
        }
    },
};
