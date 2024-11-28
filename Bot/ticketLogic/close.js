module.exports = {
    data: {
        name: 'close_ticket_button' // Muss mit dem customId des Buttons übereinstimmen
    },
    async execute(interaction) {
        const channel = interaction.channel;

        try {
            await interaction.reply({ content: 'Das Ticket wird geschlossen...', ephemeral: true });
            await channel.delete();

            /*const logChannel = interaction.guild.channels.cache.get('DEINE_LOG_KANAL_ID'); // Ersetze mit der ID deines Log-Kanals
            if (logChannel) {
                await logChannel.send(`Ticket ${channel.name} wurde von ${interaction.user.tag} geschlossen.`);
            }*/

        } catch (error) {
            console.error('Fehler beim Schließen des Tickets:', error);
            await interaction.reply({ content: 'Es gab einen Fehler beim Schließen des Tickets.', ephemeral: true });
        }
    }
};
