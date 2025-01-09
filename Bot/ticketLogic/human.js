const { EmbedBuilder } = require('discord.js');
const Logger = require('../helper/loggerHelper.js');

module.exports = {
    data: {
        name: 'talk_to_human', // Muss mit dem customId des Buttons übereinstimmen
    },
    async execute(interaction) {
        const channel = interaction.channel;

        if (!channel) {
            Logger.warn('Kanal nicht gefunden. Möglicherweise wurde er gelöscht.');
            await interaction.reply({
                content: 'Es scheint, als wäre dieses Ticket nicht mehr verfügbar.',
                ephemeral: true,
            });
            return;
        }

        try {
            const fetchedMessages = await channel.messages.fetch({ limit: 10 });
            const oldestMessage = fetchedMessages.last();

            if (!oldestMessage) {
                Logger.warn('Keine Nachrichten im Kanal gefunden.');
            } else {
                if (oldestMessage.embeds && oldestMessage.embeds.length > 0) {
                    const oldEmbed = oldestMessage.embeds[0];

                    const embedData = oldEmbed.toJSON();

                    if (embedData.fields) {
                        const supportFieldIndex = embedData.fields.findIndex(
                            (field) => field.name === 'Support'
                        );

                        if (supportFieldIndex !== -1) {
                            embedData.fields[supportFieldIndex].value = 'Mensch';
                        }
                    }

                    const newEmbed = new EmbedBuilder(embedData);

                    await oldestMessage.edit({ embeds: [newEmbed] });
                }
            }

            await channel.send('Alles klar, ein menschlicher Supporter wird das Ticket übernehmen!');

            await interaction.update({});
        } catch (error) {
            Logger.error(`Fehler beim Bearbeiten der ersten Nachricht oder beim Senden der Info: ${error.message}`);

            try {
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.reply({
                        content: 'Es gab einen Fehler beim Weiterleiten an den menschlichen Support.',
                        ephemeral: true,
                    });
                }
            } catch (replyError) {
                Logger.error(`Fehler beim Senden der Fehlermeldung: ${replyError.message}`);
            }
        }
    },
};
