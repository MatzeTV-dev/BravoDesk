const { SlashCommandBuilder } = require('discord.js');
const { upload } = require('../../Database/qdrant.js');
const { error, info } = require('../../helper/embedHelper.js');
const Logger = require('../../helper/loggerHelper.js');

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
            await interaction.deferReply({ ephemeral: true });

            const roleName = 'KI-Admin';
            const member = interaction.member;

            if (!member) {
                throw new Error('Mitgliedsinformationen konnten nicht abgerufen werden.');
            }

            const role = member.roles.cache.find((role) => role.name === roleName);

            if (!role) {
                await interaction.editReply({
                    embeds: [error('Error!', 'Hoppla! Es sieht so aus, als hättest du keine Berechtigung dafür. Ein Administrator wurde informiert.')],
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
                    embeds: [error('Error!', `Die Maximale Wortlänge beträgt 10 Wörter. \n ${interaction.options.getString('daten')}`)],
                });
                return;
            }

            await interaction.editReply({
                embeds: [info('Hochladen', 'Daten werden hochgeladen, dies kann ein paar Sekunden dauern.')],
            });

            try {
                await upload(interaction.guildId, string);
                await interaction.editReply({
                    embeds: [info('Hochladen', 'Daten hochladen war erfolgreich.')],
                });
                Logger.success('Daten erfolgreich hochgeladen.');
            } catch (uploadError) {
                Logger.error(`Fehler beim Hochladen der Daten: ${uploadError.message}`);
                await interaction.editReply({
                    embeds: [error('Error!', 'Fehler beim hochladen von Daten.')],
                });
            }
        } catch (error) {
            Logger.error(`Ein unerwarteter Fehler ist aufgetreten: ${error.message}`);

            try {
                await interaction.editReply({
                    embeds: [error('Error!', 'Ein Unerwarteter Fehler ist aufgetreten.')],
                });
            } catch (replyError) {
                Logger.error(`Fehler beim Senden der Fehlermeldung: ${replyError.message}`);
            }
        }
    },
};
