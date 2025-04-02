import { PermissionsBitField, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getServerInformation, checkUserBlacklisted } from '../Database/database.js';
import { getCategories } from '../helper/ticketCategoryHelper.js';
import { error, info } from '../helper/embedHelper.js';
import Logger from '../helper/loggerHelper.js';
import fs from 'fs';

export default {
  data: {
    customId: 'create_ticket_ticket_category',
  },
  /**
   * Verarbeitet die Interaktion zur Ticket-Erstellung. Zunächst wird geprüft, ob der User
   * nicht geblacklisted ist. Anschließend werden die ausgewählten Kategorien geladen und für jede
   * gefundene Kategorie wird ein Ticket erstellt. Abschließend erhält der Benutzer eine Bestätigung.
   *
   * @param {CommandInteraction} interaction - Das Interaktionsobjekt von Discord.
   * @returns {Promise<void>}
   */
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const isBlacklisted = await checkUserBlacklisted(interaction.guild.id, interaction.user.id);
    if (isBlacklisted) {
      Logger.info(`User ${interaction.user.tag} ist in dieser Guild geblacklisted.`);
      await interaction.editReply({
        embeds: [error('Error!', 'Du bist geblacklisted und kannst kein Ticket erstellen.')]
      });
      return;
    }

    const selectedValues = interaction.values;
    const categories = await getCategories(interaction.guild.id);

    for (const selectedLabel of selectedValues) {
      const categoryObj = categories.find(cat =>
        (cat.value || '').trim().toLowerCase() === (selectedLabel || '').trim().toLowerCase()
      );
      if (!categoryObj) {
        Logger.warn(`Unbekannte Kategorie ausgewählt: ${selectedLabel}`);
        continue;
      }
      try {
        await createTicket(interaction, categoryObj);
      } catch (err) {
        Logger.error(`Fehler beim Erstellen des Tickets für Kategorie "${selectedLabel}": ${err.message}\n${err.stack}`);
      }
    }

    await interaction.editReply({
      embeds: [info('Info', 'Dein Ticket wurde erstellt')]
    });
  },
};

/**
 * Erstellt ein Ticket basierend auf der angegebenen Kategorie.
 *
 * @param {CommandInteraction} interaction - Das Interaktionsobjekt von Discord.
 * @param {Object} categoryObj - Das Kategorie-Objekt mit Eigenschaften wie label, aiEnabled und permission.
 * @returns {Promise<void>}
 */
async function createTicket(interaction, categoryObj) {
  try {
    const rawData = await getServerInformation(interaction.guild.id);
    const data = rawData[0][0];
    if (!data) {
      Logger.error('Serverinformationen konnten nicht geladen werden.');
      await interaction.followUp({
        embeds: [error('Error!', 'Es gab einen Fehler beim Erstellen deines Tickets. Bitte kontaktiere einen Administrator.')]
      });
      return;
    }

    const guild = interaction.guild;
    const supporterRole = guild.roles.cache.get(data.support_role_id);
    if (!supporterRole) {
      Logger.error('Support-Rolle nicht gefunden.');
      await interaction.followUp({
        embeds: [error('Error!', 'Es scheint ein Problem mit der Konfiguration zu geben. Bitte kontaktiere einen Administrator.')]
      });
      return;
    }

    const channelName = `${interaction.user.username}s-Ticket`;
    const permissionOverwrites = [
      {
        id: interaction.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.EmbedLinks,
          PermissionsBitField.Flags.ReadMessageHistory,
        ],
      },
      {
        id: guild.id,
        deny: [PermissionsBitField.Flags.ViewChannel],
      },
      {
        id: guild.members.me.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.EmbedLinks,
          PermissionsBitField.Flags.ReadMessageHistory,
        ],
      },
    ];

    if (!(categoryObj.permission && Array.isArray(categoryObj.permission) && categoryObj.permission.length > 0)) {
      permissionOverwrites.push({
        id: supporterRole.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.EmbedLinks,
          PermissionsBitField.Flags.ReadMessageHistory,
        ],
      });
    }

    if (categoryObj.permission && Array.isArray(categoryObj.permission) && categoryObj.permission.length > 0) {
      for (const roleId of categoryObj.permission) {
        permissionOverwrites.push({
          id: roleId,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.EmbedLinks,
            PermissionsBitField.Flags.ReadMessageHistory,
          ],
        });
      }
    }

    const createdChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      topic: `Ticket erstellt. Kategorie: ${categoryObj.label}`,
      parent: data.ticket_category_id,
      permissionOverwrites,
    });

    const embedData = JSON.parse(fs.readFileSync('./Design/Welcome_message.json', 'utf-8'));
    const embeds = embedData.embeds.map(embed => {
      const processedEmbed = {
        ...embed,
        color: embed.color || 7049073,
      };

      const placeholders = {
        '{category}': categoryObj.label,
        '{user_ID}': interaction.user.id,
        '{username}': interaction.user.username,
        '{support_type}': categoryObj.aiEnabled ? "KI" : "Mensch",
      };

      processedEmbed.title = replacePlaceholders(processedEmbed.title, placeholders);
      processedEmbed.description = replacePlaceholders(processedEmbed.description, placeholders);

      if (processedEmbed.fields) {
        processedEmbed.fields = processedEmbed.fields.map(field => ({
          ...field,
          name: replacePlaceholders(field.name, placeholders),
          value: replacePlaceholders(field.value, placeholders),
        }));
      }

      return processedEmbed;
    });

    const buttons = [
      new ButtonBuilder()
        .setCustomId('close_ticket_button')
        .setLabel('Schließen')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('mark_as_solved_button')
        .setLabel('Gelöst')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Secondary)
    ];

    if (categoryObj.aiEnabled) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId('talk_to_human')
          .setLabel('Menschen Support')
          .setEmoji('🙋')
          .setStyle(ButtonStyle.Secondary)
      );
    }

    const actionRow = new ActionRowBuilder().addComponents(...buttons);

    await createdChannel.send({
      content: embedData.content || '',
      embeds,
      components: [actionRow],
    });

    await createdChannel.send(
      `Hallo ${interaction.user.username}! Mein Name ist Bern, ich bin ein ${categoryObj.aiEnabled ? "KI-gestützter" : "menschlicher"} Supporter. Ich werde dir dabei helfen, deine Angelegenheit zu klären. Solltest du zu irgendeiner Zeit mit ${categoryObj.aiEnabled ? "einem Menschen" : "mir"} sprechen wollen, teile mir dies mit, indem du auf einen der Buttons drückst!\n\nWie kann ich dir helfen?`
    );

    Logger.info(`Ticket erstellt: ${createdChannel.name} (ID: ${createdChannel.id})`);
  } catch (errorCreatingTicket) {
    Logger.error(`Fehler beim Erstellen des Tickets: ${errorCreatingTicket.message}\n${errorCreatingTicket.stack}`);
    await interaction.followUp({
      embeds: [error('Error!', 'Es gab einen Fehler beim Erstellen deines Tickets. Bitte kontaktiere einen Administrator.')]
    });
  }
}

/**
 * Ersetzt Platzhalter im Text anhand des übergebenen Objekts.
 *
 * @param {string} text - Der Text mit Platzhaltern.
 * @param {Object} placeholders - Ein Objekt mit Schlüssel-Wert-Paaren zum Ersetzen.
 * @returns {string} Der verarbeitete Text.
 */
function replacePlaceholders(text, placeholders) {
  if (!text) return '';
  for (const [placeholder, value] of Object.entries(placeholders)) {
    text = text.replace(new RegExp(placeholder, 'g'), value);
  }
  return text;
}
