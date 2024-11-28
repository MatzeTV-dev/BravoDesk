module.exports = {
    data: {
        name: 'talk_to_human' // Muss mit dem customId des Buttons übereinstimmen
    },
    async execute(interaction) {
        const channel = interaction.channel;

        try {
            await channel.send("Alles klar, ein Menschlicher Supporter wird das Ticket übernehmen!")
            await interaction.update({});
        } catch (error) {
            console.error('Fehler beim Menschlichen Support:', error);
            await interaction.reply({ content: 'Es gab einen Fehler.', ephemeral: true });
        }
    }
};
