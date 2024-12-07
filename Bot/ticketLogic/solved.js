module.exports = {
    data: {
        name: 'mark_as_solved_button', // Muss mit dem customId des Buttons übereinstimmen
    },
    async execute(interaction) {
        const channel = interaction.channel;

        if (!channel) {
            console.warn('Kanal nicht gefunden. Möglicherweise wurde er bereits gelöscht.');
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
            console.log(`Ticket-Kanal wird als abgeschlossen markiert: Name="${channel.name}", ID=${channel.id}`);

            // Lösche den Kanal
            await channel.delete();
        } catch (error) {
            console.error(`Fehler beim Markieren des Tickets als abgeschlossen (Kanal: ${channel.name}, ID: ${channel.id}):`, error);

            // Fehlerantwort an den Benutzer
            try {
                await interaction.followUp({
                    content: 'Es gab einen Fehler beim Markieren des Tickets als abgeschlossen. Bitte versuche es später erneut.',
                    ephemeral: true,
                });
            } catch (replyError) {
                console.error('Fehler beim Senden der Fehlermeldung:', replyError);
            }
        }
    },
};
