import { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { getServerInformation } from '../../Database/database.js';
import { updateKiAdminID } from '../../helper/verification.js'
import { error } from '../../helper/embedHelper.js';
import { getData } from '../../Database/qdrant.js';
import Logger from '../../helper/loggerHelper.js';

export default {
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Durchsucht die KI nach bestimmten Informationen')
    .addStringOption(option =>
      option
        .setName('keyword')
        .setDescription('Der Suchbegriff oder deine Frage an die KI')
        .setRequired(true)
    ),

  /**
   * Führt den /search-Command aus, um die KI nach bestimmten Informationen zu durchsuchen.
   *
   * @param {CommandInteraction} interaction - Das Interaktionsobjekt von Discord.
   * @returns {Promise<void>} Ein Promise, das resolved, wenn der Command abgeschlossen ist.
   */
  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });
      const ServerInformation = await getServerInformation(interaction.guildId);
      const member = interaction.member;

      let kiadminRole = interaction.guild.roles.cache.get(ServerInformation[0][0].kiadmin_role_id);

      try {
        if (!kiadminRole) {
          kiadminRole = await updateKiAdminID(interaction.guild);
        }
      } catch (error) {
        console.log(error)      
      }


      const hasRole = member.roles.cache.some(
        (role) => role.id === kiadminRole.id
      );

      if (!hasRole) {
        await interaction.editReply({
          embeds: [error('Error!', 'Du hast keine Berechtigung für diesen Befehl!')]
        });
        return;
      }

      const userQuery = interaction.options.getString('keyword', true);
      const collectionName = `guild_${interaction.guild.id}`;
      const searchResult = await getData(collectionName, userQuery);

      if (!searchResult || searchResult.length === 0) {
        await interaction.editReply({
          embeds: [
            error(
              'Keine Ergebnisse',
              'Es wurden keine Einträge gefunden, die deiner Suche entsprechen.'
            )
          ]
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('Suchergebnisse')
        .setDescription(`Suchbegriff: \`${userQuery}\``)
        .setColor('#3465a4');

      const maxResults = 3;
      const actionRows = [];

      for (let i = 0; i < searchResult.length && i < maxResults; i++) {
        const item = searchResult[i];
        const text = item.payload?.text || '*Kein Text*';
        const score = item.score ? item.score.toFixed(3) : 'Keine';
        const entryId = item.id;

        embed.addFields({
          name: `Ergebnis ${i + 1} (Score: ${score})`,
          value: text
        });

        const editButton = new ButtonBuilder()
          .setCustomId(`edit_${entryId}`)
          .setLabel('Bearbeiten')
          .setStyle(ButtonStyle.Primary);

        const deleteButton = new ButtonBuilder()
          .setCustomId(`delete_${entryId}`)
          .setLabel('Löschen')
          .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(editButton, deleteButton);
        actionRows.push(row);
      }

      await interaction.editReply({
        embeds: [embed],
        components: actionRows
      });
    } catch (err) {
      Logger.error(`Ein Fehler ist aufgetreten: ${err.message}\n${err.stack}`);
      try {
        if (!interaction.replied) {
          await interaction.editReply({
            embeds: [
              error('Error!', 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut.')
            ]
          });
        }
      } catch (replyError) {
        Logger.error(`Fehler beim Senden der Fehlermeldung: ${replyError.message}\n${replyError.stack}`);
      }
    }
  },
};
