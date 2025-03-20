import { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ActionRowBuilder 
} from 'discord.js';
import { error } from '../../helper/embedHelper.js';
import Logger from '../../helper/loggerHelper.js';
import { getData } from '../../Database/qdrant.js';

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

  async execute(interaction) {
    try {
      // Nur der ausführende User sieht das Ergebnis (ephemeral)
      await interaction.deferReply({ ephemeral: true });

      const roleName = 'KI-Admin';
      const member = interaction.member;
      const role = member.roles.cache.find(r => r.name === roleName);

      // Rollen-Check
      if (!role) {
        await interaction.editReply({
          embeds: [
            error(
              'Error!',
              'Hoppla! Du hast keine Berechtigung für diesen Befehl. Ein Admin wurde informiert.'
            )
          ]
        });
        return;
      }

      // Suchbegriff aus dem Command
      const userQuery = interaction.options.getString('keyword', true);

      // Qdrant-Collection: "guild_<GuildID>"
      const collectionName = `guild_${interaction.guild.id}`;

      // Ähnlichkeitssuche
      const searchResult = await getData(collectionName, userQuery);
      // getData gibt ein Array (points) zurück

      // Kein Ergebnis?
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

      // Embed vorbereiten
      const embed = new EmbedBuilder()
        .setTitle('Suchergebnisse')
        .setDescription(`Suchbegriff: \`${userQuery}\``)
        .setColor('#3465a4');

      // Maximal 3 Ergebnisse anzeigen
      const maxResults = 3;
      // Array für unsere Action Rows
      const actionRows = [];

      for (let i = 0; i < searchResult.length && i < maxResults; i++) {
        const item = searchResult[i];
        // Qdrant liefert item.id, item.score, item.payload, etc.
        // Falls der Text in item.payload.text steckt:
        const text = item.payload?.text || '*Kein Text*';
        const score = item.score ? item.score.toFixed(3) : 'Keine';
        const entryId = item.id; // Zum Bearbeiten/Löschen

        // Embed-Feld hinzufügen
        embed.addFields({
          name: `Ergebnis ${i + 1} (Score: ${score})`,
          value: text
        });

        // Zwei Buttons pro Ergebnis:
        const editButton = new ButtonBuilder()
          .setCustomId(`edit_${entryId}`) // z. B. "edit_123"
          .setLabel('Bearbeiten')
          .setStyle(ButtonStyle.Primary);

        const deleteButton = new ButtonBuilder()
          .setCustomId(`delete_${entryId}`) // z. B. "delete_123"
          .setLabel('Löschen')
          .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(editButton, deleteButton);
        actionRows.push(row);
      }

      // Nachricht mit Embed + Buttons (ephemeral) senden
      await interaction.editReply({
        embeds: [embed],
        components: actionRows
      });

      // Hinweis: Die Button-Interaktionen (z. B. für "edit_" oder "delete_") werden in deinem globalen Handler verarbeitet.
    } catch (err) {
      Logger.error(`Ein Fehler ist aufgetreten: ${err.message}\n${err.stack}`);

      // Fallback: Fehler an den Benutzer melden
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
