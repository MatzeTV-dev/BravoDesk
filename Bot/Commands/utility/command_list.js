
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { error } = require('../../helper/embedHelper.js')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('commands')
        .setDescription('Lösche Informationen aus der KI'),
    async execute(interaction) {
        try {

            await interaction.deferReply({ ephemeral: true });

            const roleName = 'KI-Admin';
            const member = interaction.member;

            const role = member.roles.cache.find(role => role.name === roleName);

            if (role) {
                await interaction.deferReply();

                const embed = new EmbedBuilder()
                    .setTitle('**Befehlsliste**')
                    .addFields(
                        { name: '**/list**', value: 'Zeige alle Daten im Wissensspeicher der KI an' },
                        { name: '**/reset**', value: 'Löscht alles und setzt es zurück' },
                        { name: '**/setup**', value: 'Initiale Einrichtung' },
                        { name: '**/upload**', value: 'Daten in den Wissensspeicher der KI eintragen' }
                    )
                    .setColor(0x00AE86);

                await interaction.followUp({
                    embeds: [embed],
                });
            } else {

                await interaction.reply({
                    embeds: [error('Error!', 'Hoppla! Es sieht so aus, als hättest du keine Berechtigung dafür. Ein Administrator wurde informiert!')],
                    ephemeral: true,
                });

                const adminChannel = interaction.guild.channels.cache.find(
                    (channel) => channel.name === 'admin-log'
                );
                if (adminChannel) {
                    await adminChannel.send(
                        `⚠️ Benutzer ${interaction.user.tag} hat versucht, den Befehl \`/commands\` ohne die erforderliche Rolle (${roleName}) auszuführen.`
                    );
                }
            }
        } catch (error) {
            console.error('An error occurred:', error);

            try {
                await interaction.reply({
                    embeds: [error('Error!', 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut.')],
                    ephemeral: true,
                });
            } catch (replyError) {
                console.error('Error sending error message:', replyError);
            }
        }
    },
};
