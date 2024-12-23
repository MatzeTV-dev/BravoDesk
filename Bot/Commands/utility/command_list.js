const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { error } = require('../../helper/embedHelper.js');
const Logger = require('../../helper/loggerHelper.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('commands')
        .setDescription('Lösche Informationen aus der KI'),
    async execute(interaction) {
        try {
            // Nur einmal deferReply
            await interaction.deferReply();

            const roleName = 'KI-Admin';
            const member = interaction.member;

            // Rolle finden
            const role = member.roles.cache.find(role => role.name === roleName);

            // Embed erstellen und als Antwort senden
            const embed = new EmbedBuilder()
                .setTitle('**Befehlsliste**')
                .addFields(
                    { name: '**/list**', value: 'Zeige alle Daten im Wissensspeicher der KI an' },
                    { name: '**/reset**', value: 'Löscht alles und setzt es zurück' },
                    { name: '**/setup**', value: 'Initiale Einrichtung' },
                    { name: '**/upload**', value: 'Daten in den Wissensspeicher der KI eintragen' },
                    { name: '**/commands**', value: 'Zeigt diese Information an' }
                )
                .setColor("#345635");

            await interaction.followUp({
                embeds: [embed],
            });
        } catch (error) {
            Logger.error(`Ein Fehler ist aufgetreten: ${error.message}\n${error.stack}`);

            // Fallback: Fehler an den Benutzer melden
            try {
                if (!interaction.replied) {
                    await interaction.followUp({
                        embeds: [error('Error!', 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut.')],
                        ephemeral: true,
                    });
                }
            } catch (replyError) {
                Logger.error(`Ein Fehler ist aufgetreten beim antworten: ${replyError.message}\n${replyError.stack}`);
            }
        }
    },
};
