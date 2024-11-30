const { PermissionsBitField, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getServerInformation } = require('../Database/database.js')
const fs = require('fs');
const { randomFillSync } = require('crypto');

module.exports = {
    data: {
        customId: 'ticket_category', // Muss exakt mit dem customId des Select Menus übereinstimmen
    },
    async execute(interaction) {

        const selectedValues = interaction.values;

        for (const value of selectedValues) {
            switch (value) {
                case 'technical_support':
                    await createTicket(interaction, "Technischer Support");
                    break;
                case 'general_questions':
                    await createTicket(interaction, "Allgemeine Frage");
                    break;
                case 'suggestions':
                    await createTicket(interaction, "Verbesserungsvorschlag");
                    break;
                case 'bug_report':
                    await createTicket(interaction, "Bug Report");
                    break;
            }
        }

        // Antwort an den Benutzer
        await interaction.reply({ content: 'Dein Ticket wurde erstellt!', ephemeral: true });
    },
};

async function createTicket(interaction, reason) {
    try {
        const rawData = await getServerInformation(interaction.guild.id);
        const data = rawData[0][0][0];

        const guild = interaction.guild;
        const supporterRole = guild.roles.cache.get(data.support_role_id);
        let createdChannel = null;

        const channelName = `${interaction.user.username}s Ticket`;

        createdChannel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            topic: `Du hast ein ${reason} Ticket erstellt.`,
            parent: data.ticket_category_id,
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
                    deny: [PermissionsBitField.Flags.ViewChannel]
                },
                {
                    id: supporterRole.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.AttachFiles,
                    ]
                },
            ]
        });

        const embedData = JSON.parse(fs.readFileSync('./Design/Welcome_message.json', 'utf-8'));

        // Bereite die Embeds vor und ersetze Platzhalter
        const embeds = embedData.embeds.map(embed => {
            const processedEmbed = {
                ...embed,
                color: embed.color || 7049073,
            };

            if (processedEmbed.title) {
                processedEmbed.title = processedEmbed.title.replace('{category}', reason).replace('{user_ID}', interaction.user.id);
            }

            if (processedEmbed.description) {
                processedEmbed.description = processedEmbed.description.replace('{category}', reason).replace('{user_ID}', interaction.user.id);
            }

            if (processedEmbed.fields) {
                processedEmbed.fields = processedEmbed.fields.map(field => ({
                    ...field,
                    name: field.name.replace('{category}', reason).replace('{user_ID}', interaction.user.id),
                    value: field.value.replace('{category}', reason).replace('{user_ID}', interaction.user.id),
                }));
            }

            return processedEmbed;
        });

        // Erstelle die Buttons
        const closeTicketButton = new ButtonBuilder()
            .setCustomId('close_ticket_button')
            .setLabel('Schließen')
            .setEmoji("❌")
            .setStyle(ButtonStyle.Primary);

        const solvedTicketButton = new ButtonBuilder()
            .setCustomId('mark_as_solved_button')
            .setLabel('Gelöst')
            .setEmoji("✅")
            .setStyle(ButtonStyle.Secondary);

        const talkToHumanButton = new ButtonBuilder()
            .setCustomId('talk_to_human')
            .setLabel('Menschen Support')
            .setEmoji("🙋")
            .setStyle(ButtonStyle.Secondary);

        // Erstelle eine Action Row und füge die Buttons hinzu
        const actionRow = new ActionRowBuilder()
            .addComponents(closeTicketButton, solvedTicketButton, talkToHumanButton);

        // Sende die Nachricht mit den aktualisierten Embeds
        await createdChannel.send({
            content: embedData.content || '',
            embeds: embeds,
            username: embedData.username,
            components: [actionRow],
        });

        // Optional: Weitere Nachricht senden
        await createdChannel.send(`Hallo ${interaction.user.username}! Mein Name ist Bern, ich bin ein KI-gestützter Supporter. Ich werde dir dabei helfen, deine Angelegenheit zu klären.\nSolltest du zu irgendeiner Zeit mit einem Menschen sprechen wollen, teile mir dies mit, indem du auf einen der Buttons drückst!\n\nWie kann ich dir helfen?`);

    } catch (errorCreatingTicket) {
        console.error('Fehler beim Erstellen des Tickets:', errorCreatingTicket);
    }
}





async function getMessageHistory(interaction) {

}