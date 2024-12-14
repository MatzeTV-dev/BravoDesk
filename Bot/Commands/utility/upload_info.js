
const { SlashCommandBuilder } = require('discord.js');
const { upload } = require('../../Database/qdrant.js');
const { error, info } = require('../../helper/embedHelper.js');

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

            await interaction.deferReply();

            const roleName = 'KI-Admin';
            const member = interaction.member;

            if (!member) {
                throw new Error('Mitgliedsinformationen konnten nicht abgerufen werden.');
            }

            const role = member.roles.cache.find((role) => role.name === roleName);

            if (!role) {
                await interaction.editReply({
                    embeds: [error('Error!', 'Hoppla! Es sieht so aus, als hättest du keine Berechtigung dafür. Ein Administrator wurde informiert.')],
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
                await interaction.editReply({
                    embeds: [error('Error!', 'Die Maximale Wortlänge beträgt 10 Wörter.')],
                    ephemeral: true,
                });
                return;
            }

            await interaction.editReply({
                embeds: [info('Hochladen', 'Daten werden hochgeladen, dies kann ein paar Sekunden dauern.')],
                ephemeral: true,
            });

            try {
                await upload(interaction.guildId, string);
                await interaction.editReply({
                    embeds: [info('Hochladen', 'Daten hochladen war erfolgreich.')],
                    ephemeral: true,
                });
            } catch (uploadError) {
                console.error('Fehler beim Hochladen der Daten:', uploadError);
                await interaction.editReply({
                    embeds: [error('Error!', 'Fehler beim hochladen von Daten.')],
                    ephemeral: true,
                });
            }
        } catch (error) {
            console.error('Ein unerwarteter Fehler ist aufgetreten:', error);

            try {
                await interaction.editReply({
                    embeds: [error('Error!', 'Ein Unerwarteter Fehler ist aufgetreten.')],
                    ephemeral: true,
                });
            } catch (replyError) {
                console.error('Fehler beim Senden der Fehlermeldung:', replyError);
            }
        }
    },
};
