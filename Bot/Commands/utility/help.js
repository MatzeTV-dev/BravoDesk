const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { error } = require('../../helper/embedHelper.js');
const Logger = require('../../helper/loggerHelper.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('zeigt alle commands und deren Beschreibungen an'),
    async execute(interaction) {
        try {
            // deferReply mit ephemeral: true
            await interaction.deferReply({ ephemeral: true });

            const roleName = 'KI-Admin';
            const member = interaction.member;

            // Rolle finden
            const role = member.roles.cache.find(role => role.name === roleName);

            // Embed erstellen und als Antwort senden
            const embed = new EmbedBuilder()
                .setTitle('**Befehlsliste**')
                .addFields(
                    { name: '**/list**', value: 'Listet alle Wissenseinträge der KI auf.' },
                    { name: '**/reset**', value: 'Löscht alle Wissenseinträge, Rollen und erstellten cahnnel von BravoDesk.' },
                    { name: '**/setup**', value: 'Startet den automatischen setup Prozess.' },
                    { name: '**/upload**', value: 'Ladet neues Wissen in das KI Brain hoch.' },
                    { name: '**/search**', value: 'Durchsucht die KI nach bestimmten Informationen' },
                    { name: '**/help**', value: 'zeigt alle commands und deren Beschreibungen an.' }
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
                    });
                }
            } catch (replyError) {
                Logger.error(`Ein Fehler ist aufgetreten beim antworten: ${replyError.message}\n${replyError.stack}`);
            }
        }
    },
};
