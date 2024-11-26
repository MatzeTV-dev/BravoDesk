const { channel } = require('diagnostics_channel');
const { PermissionsBitField, ChannelType, PermissionOverwrites } = require('discord.js');
const fs = require('fs');

module.exports = {
    data: {
        customId: 'ticket_category', // Muss exakt mit dem customId des Select Menus übereinstimmen
    },
    async execute(interaction) {

        const selectedValues = interaction.values;

        for (const value of selectedValues) {
            switch (value) {
                case 'technical_support':
                    createTicket(interaction, "Technischer Support")
                    break;
                case 'general_questions':
                    createTicket(interaction, "Allgemeine Frage")
                    break;
                case 'suggestions':
                    createTicket(interaction, "Verbesserungsvorschlag")
                    break;
                case 'bug_report':
                    createTicket(interaction, "Bug Report")
                    break;
            }

        }

        // Antwort an den Benutzer
        await interaction.reply({ content: 'Dein Ticket wurde ertellt!', ephemeral: true });
    },
};

async function createTicket(interaction, reason) {
    const guild = interaction.guild;
    const createdChannel = null;
    try {
        const channelName = interaction.user.id;

        createdChannel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            topic: 'This is your ' + reason + ' ticket ',
            parent: "1309549212119207997",
            permissionOverwrites: [
                {
                    id: interaction.user.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.AttachFiles,
                    ]
                },
                {
                    id: guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
            ]
        })

    } catch (errorCreatingTicket) {
        console.error('Fehler beim erstelen des Tickets:', errorCreatingTicket);
    }
    

    try {
        const embedData = JSON.parse(fs.readFileSync('./Design/Welcome_message.json', 'utf-8'));

        // Prepare the embed payload
        const embeds = embedData.embeds.map(embed => ({
            ...embed,
            color: embed.color || 7049073,
        }));

        await createdChannel.send({
            content: embedData.content || '',
            embeds: embeds,
            username: embedData.username,
			components: [row],
        });

        createdChannel.send("Hallo! Mein Name ist Bern ich bin ein AI gestützter Supporter. Ich werde Ihnen dabei helfen Ihre Angelegenheit zu klären.\nSollten Sie zu irgendeiner Zeit mit einem Menschen sprechen wollen teilen Sie mir dies mit!\n\nWie darf ich Ihnen helfen?")

    } catch (errorSendingMessage) {
        console.error('Fehler beim erstellen des Tickets:', errorSendingMessage)
    }
}