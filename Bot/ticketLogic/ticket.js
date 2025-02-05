const {
    PermissionsBitField,
    ChannelType,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const { getServerInformation } = require('../Database/database.js');
const fs = require('fs');
const Logger = require('../helper/loggerHelper.js');

module.exports = {
    data: {
        customId: 'create_ticket_ticket_category', // Muss exakt mit dem customId des Select Menus übereinstimmen
    },
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const selectedValues = interaction.values;

        for (const value of selectedValues) {
            try {
                switch (value) {
                    case 'technical_support':
                        await createTicket(interaction, 'Technischer Support');
                        break;
                    case 'general_questions':
                        await createTicket(interaction, 'Allgemeine Frage');
                        break;
                    case 'suggestions':
                        await createTicket(interaction, 'Verbesserungsvorschlag');
                        break;
                    case 'bug_report':
                        await createTicket(interaction, 'Bug Report');
                        break;
                    default:
                        Logger.warn(`Unbekannte Kategorie ausgewählt: ${value}`);
                }
            } catch (error) {
                Logger.error(`Fehler beim Erstellen des Tickets für Kategorie "${value}": ${error.message}\n${error.stack}`);
            }
        }

        // Antwort an den Benutzer
        await interaction.editReply({ content: 'Dein Ticket wurde erstellt!' });
    },
};

async function createTicket(interaction, reason) {
    try {
        const rawData = await getServerInformation(interaction.guild.id);

        Logger.info('Serverinformationen geladen:', rawData);

        const data = rawData[0][0];

        if (!data) {
            Logger.error('Serverinformationen konnten nicht geladen werden.');
            await interaction.followUp({
                content: 'Es gab einen Fehler beim Erstellen deines Tickets. Bitte kontaktiere einen Administrator.',
            });
            return;
        }

        const guild = interaction.guild;
        const supporterRole = guild.roles.cache.get(data.support_role_id);

        if (!supporterRole) {
            Logger.error('Support-Rolle nicht gefunden.');
            await interaction.followUp({
                content: 'Es scheint ein Problem mit der Konfiguration zu geben. Bitte kontaktiere einen Administrator.',
            });
            return;
        }

        const channelName = `${interaction.user.username}s-Ticket`;

        const createdChannel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            topic: `Du hast ein ${reason}-Ticket erstellt.`,
            parent: data.ticket_category_id,
            permissionOverwrites: [
                {
                    id: interaction.user.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.AttachFiles,
                    ],
                },
                {
                    id: guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                    id: supporterRole.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.AttachFiles,
                    ],
                },
                {
                    id: guild.members.me.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,      // Bot kann den Channel sehen
                        PermissionsBitField.Flags.SendMessages,     // Bot kann schreiben
                        PermissionsBitField.Flags.EmbedLinks,       // Bot kann Embeds senden
                        PermissionsBitField.Flags.ReadMessageHistory // Bot kann Nachrichtenverlauf lesen
                    ]
                },
            ],
        });

        // Lade und verarbeite Embeds
        const embedData = JSON.parse(fs.readFileSync('./Design/Welcome_message.json', 'utf-8'));

        const embeds = embedData.embeds.map(embed => {
            const processedEmbed = {
                ...embed,
                color: embed.color || 7049073,
            };

            const placeholders = {
                '{category}': reason,
                '{user_ID}': interaction.user.id,
                '{username}': interaction.user.username,
                '{support_type}': "KI",
            };

            processedEmbed.title = replacePlaceholders(processedEmbed.title, placeholders);
            processedEmbed.description = replacePlaceholders(processedEmbed.description, placeholders);

            if (processedEmbed.fields) {
                processedEmbed.fields = processedEmbed.fields.map(field => ({
                    ...field,
                    name: replacePlaceholders(field.name, placeholders),
                    value: replacePlaceholders(field.value, placeholders),
                }));
            }

            return processedEmbed;
        });

        // Buttons erstellen
        const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('close_ticket_button')
                .setLabel('Schließen')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('mark_as_solved_button')
                .setLabel('Gelöst')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('talk_to_human')
                .setLabel('Menschen Support')
                .setEmoji('🙋')
                .setStyle(ButtonStyle.Secondary)
        );

        // Begrüßungsnachricht senden
        await createdChannel.send({
            content: embedData.content || '',
            embeds,
            components: [actionRow],
        });

        // Zusätzliche Nachricht senden
        await createdChannel.send(
            `Hallo ${interaction.user.username}! Mein Name ist Bern, ich bin ein KI-gestützter Supporter. Ich werde dir dabei helfen, deine Angelegenheit zu klären. Solltest du zu irgendeiner Zeit mit einem Menschen sprechen wollen, teile mir dies mit, indem du auf einen der Buttons drückst!\n\nWie kann ich dir helfen?`
        );

        Logger.info(`Ticket erstellt: ${createdChannel.name} (ID: ${createdChannel.id})`);
    } catch (errorCreatingTicket) {
        Logger.error(`Fehler beim Erstellen des Tickets: ${errorCreatingTicket.message}\n${errorCreatingTicket.stack}`);
        await interaction.followUp({
            content: 'Es gab einen Fehler beim Erstellen deines Tickets. Bitte kontaktiere einen Administrator.',
        });
    }
}

function replacePlaceholders(text, placeholders) {
    if (!text) return '';
    for (const [placeholder, value] of Object.entries(placeholders)) {
        text = text.replace(new RegExp(placeholder, 'g'), value);
    }
    return text;
}
