
const { SlashCommandBuilder } = require('discord.js');
const { upload } = require('../../Database/qdrant.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('upload')
        .setDescription('Lade Informationen in die KI hoch')
        .addStringOption((option) =>
            option
                .setName('daten')
                .setDescription('Ein einfacher Satz, um Informationen an die KI zu übermitteln.')
                .setRequired(true)
        ),
    async execute(interaction) {
        try {
            const roleName = 'KI-Admin';
            const member = interaction.member;

            if (!member) {
                throw new Error('Mitgliedsinformationen konnten nicht abgerufen werden.');
            }

            const role = member.roles.cache.find((role) => role.name === roleName);

            if (!role) {
                await interaction.reply({
                    content: 'Hoppla! Es sieht so aus, als hättest du keine Berechtigung dafür. Ein Administrator wurde informiert.',
                    ephemeral: true,
                });

                const adminChannel = interaction.guild.channels.cache.find(
                    (channel) => channel.name === 'admin-log'
                );
                if (adminChannel) {
                    await adminChannel.send(
                        `⚠️ Benutzer ${interaction.user.tag} hat versucht, den Befehl \`/upload\` ohne Berechtigung auszuführen.`
                    );
                }
                return;
            }

            const string = interaction.options.getString('daten');
            const checkArray = string.split(' ');

            if (checkArray.length > 10) {
                await interaction.reply({
                    content: 'Das maximale Wortlimit beträgt 10. Bitte kürze deinen Satz.',
                    ephemeral: true,
                });
                return;
            }

            await interaction.reply('Daten werden hochgeladen, dies dauert einen kurzen Moment...');

            try {
                await upload(interaction.guildId, string);
                await interaction.editReply('Daten erfolgreich hochgeladen!');
            } catch (uploadError) {
                console.error('Fehler beim Hochladen der Daten:', uploadError);
                await interaction.editReply('Fehler beim Hochladen der Daten. Bitte versuche es erneut.');
            }
        } catch (error) {
            console.error('Ein unerwarteter Fehler ist aufgetreten:', error);

            try {
                await interaction.reply({
                    content: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut.',
                    ephemeral: true,
                });
            } catch (replyError) {
                console.error('Fehler beim Senden der Fehlermeldung:', replyError);
            }
        }
    },
};
