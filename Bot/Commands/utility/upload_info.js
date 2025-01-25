const { SlashCommandBuilder } = require('discord.js');
const { upload } = require('../../Database/qdrant.js');
const { error, info } = require('../../helper/embedHelper.js');
const Logger = require('../../helper/loggerHelper.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('upload')
        .setDescription('Ladet neues Wissen in das KI Brain hoch.')
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

            // Maximal 10 Wörter prüfen
            const wordCount = string.split(/\s+/).length;
            if (wordCount > 10) {
                await interaction.editReply({
                    embeds: [error('Error!', 'Die maximale Wortanzahl beträgt 10 Wörter.')],
                });
                return;
            }

            // Regex: Kein Wort länger als 20 Zeichen erlaubt
            const longWordMatch = string.match(/\b\w{21,}\b/);
            if (longWordMatch) {
                await interaction.editReply({
                    embeds: [error('Error!', `Ein Wort ist zu lang: "${longWordMatch[0]}". Maximale Wortlänge beträgt 10 Zeichen. \n ${interaction.options.getString('daten')}`)],
                });
                return;
            }

            await interaction.editReply({
                embeds: [info('Hochladen', 'Daten werden hochgeladen, dies kann ein paar Sekunden dauern.')],
            });

            try {
                await upload("guild_" + interaction.guildId, string);
                await interaction.editReply({
                    embeds: [info('Hochladen', 'Daten hochladen war erfolgreich.')],
                });
                Logger.success('Daten erfolgreich hochgeladen.');
            } catch (uploadError) {
                Logger.error(`Fehler beim Hochladen der Daten: ${uploadError.message}`);
                await interaction.editReply({
                    embeds: [error('Error!', 'Fehler beim Hochladen von Daten.')],
                });
            }
        } catch (error) {
            Logger.error(`Ein unerwarteter Fehler ist aufgetreten: ${error.message}`);

            try {
                await interaction.editReply({
                    embeds: [error('Error!', 'Ein unerwarteter Fehler ist aufgetreten.')],
                });
            } catch (replyError) {
                Logger.error(`Fehler beim Senden der Fehlermeldung: ${replyError.message}`);
            }
        }
    },
};
