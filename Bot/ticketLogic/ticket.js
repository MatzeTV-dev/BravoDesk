const {} = require('discord.js');

module.exports = {
    data: {
        customId: 'ticket_category', // Muss exakt mit dem customId des Select Menus übereinstimmen
    },
    async execute(interaction) {

        const selectedValues = interaction.values;

        for (const value of selectedValues) {
            switch (value) {
                case 'technical_support':
                    console.log("1")
                    break;
                case 'general_questions':
                    console.log("2")
                    break;
                case 'suggestions':
                    console.log("3")
                    break;
                case 'bug_report':
                    console.log("4")
                    break;
            }

        }

        // Antwort an den Benutzer
        await interaction.reply({ content: 'Dein Ticket wurde ertellt!', ephemeral: true });
    },
};

function createTicket() {
    
}