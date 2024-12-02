module.exports = {
    data: {
        name: 'close_ticket_button' // Muss mit dem customId des Buttons übereinstimmen
    },
    async execute(interaction) {
        const channel = interaction.channel;

        try {
            await interaction.reply({ content: 'Das Ticket wird geschlossen...', ephemeral: true });
            await channel.delete();

        } catch (error) {
            console.error('Fehler beim Schließen des Tickets:', error);
            await interaction.reply({ content: 'Es gab einen Fehler beim Schließen des Tickets.', ephemeral: true });
        }
    }
};
