module.exports = {
    data: {
        name: 'mark_as_solved_button' // Muss mit dem customId des Buttons übereinstimmen
    },
    async execute(interaction) {
        const channel = interaction.channel;

        try {
            await interaction.reply({ content: 'Das Ticket wird als abgeschlossen markiert...', ephemeral: true });
            await channel.delete();
            
        } catch (error) {
            console.error('Fehler beim Schließen des Tickets:', error);
            await interaction.reply({ content: 'Es gab einen Fehler beim Schließen des Tickets.', ephemeral: true });
        }
    }
};
