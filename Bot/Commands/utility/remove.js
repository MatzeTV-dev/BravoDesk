const { SlashCommandBuilder } = require('discord.js');
const { error, info } = require('../../helper/embedHelper.js');
const Logger = require('../../helper/loggerHelper.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Entfernt jemanden aus dem Ticket.')
        .addUserOption((option) =>
            option
                .setName('user')
                .setDescription('Der Benutzer, der entfernt werden soll.')
                .setRequired(true)
        ),
    async execute(interaction) {
        try {
            // Antwort vorbereiten
            await interaction.deferReply({ ephemeral: true });

            const channel = interaction.channel;
            const user = interaction.options.getUser('user');

            // Überprüfen, ob der Channel mit "-ticket" endet
            if (!channel.name.endsWith('-ticket')) {
                await interaction.editReply({
                    embeds: [error('Fehler!', 'Dieser Command kann nur in einem Ticket-Channel verwendet werden.')],
                });
                return;
            }

            // Berechtigungen entfernen
            await channel.permissionOverwrites.delete(user.id);

            Logger.info(`Benutzer ${user.tag} wurde aus dem Ticket "${channel.name}" entfernt.`);
            await interaction.editReply({
                embeds: [info('Erfolg!', `Der Benutzer ${user.tag} wurde erfolgreich aus dem Ticket entfernt.`)],
            });
        } catch (err) {
            Logger.error(`Fehler beim Ausführen des /remove Commands: ${err.message}\n${err.stack}`);
            await interaction.editReply({
                embeds: [error('Fehler!', 'Es gab ein Problem beim Ausführen dieses Commands. Bitte versuche es später erneut.')],
            });
        }
    },
};
