module.exports = {
    data: {
        name: 'talk_to_human', // Muss mit dem customId des Buttons übereinstimmen
    },
    async execute(interaction) {
        const channel = interaction.channel;

        if (!channel) {
            console.warn('Kanal nicht gefunden. Möglicherweise wurde er gelöscht.');
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
            console.error('Fehler beim Senden der Nachricht an den menschlichen Support:', error);

            try {
                // Informiere den Benutzer über den Fehler
                await interaction.reply({
                    content: 'Es gab einen Fehler beim Weiterleiten an den menschlichen Support.',
                    ephemeral: true,
                });
            } catch (replyError) {
                console.error('Fehler beim Senden der Fehlermeldung:', replyError);
            }
        }
    },
};
