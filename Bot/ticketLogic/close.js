import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getServerInformation } from '../Database/database.js';
import { info } from '../helper/embedHelper.js';
import Logger from '../helper/loggerHelper.js';
import fs from 'fs';

export default {
  data: {
    name: 'close_ticket_button',
  },
  /**
   * Schließt ein Ticket, indem der Schließen-Button deaktiviert, ein Transcript als HTML erstellt, an den Benutzer gesendet
   * und anschließend Kanalberechtigungen angepasst werden.
   *
   * @param {CommandInteraction} interaction - Die Discord-Interaktion.
   * @returns {Promise<void>}
   */
  async execute(interaction) {
    const channel = interaction.channel;
    const guild = interaction.guild;
    const guild_id = guild.id;

    try {
      const rawData = await getServerInformation(guild_id);
      const data = rawData[0][0];

      await disableCloseButton(interaction);
      const messages = await fetchChannelMessages(channel);
      const transcriptPath = await createHTMLTranscript(channel, interaction, messages);
      await sendTranscriptToUser(interaction, transcriptPath);
      await updateChannelPermissions(channel, data);

      Logger.success(`Ticket "${channel.name}" wurde erfolgreich geschlossen.`);
    } catch (error) {
      Logger.error(`Fehler beim Schließen des Tickets: ${error.message}\n${error.stack}`);
      await interaction.followUp({
        content: 'Ein Fehler ist beim Schließen des Tickets aufgetreten. Bitte versuche es später erneut.',
        ephemeral: true,
      });
    }
  },
};

/**
 * Deaktiviert den "close ticket" Button und aktualisiert die Nachricht.
 *
 * @param {CommandInteraction} interaction - Die Discord-Interaktion.
 * @returns {Promise<void>}
 */
async function disableCloseButton(interaction) {
  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('close_ticket_button')
      .setLabel('Geschlossen')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true)
  );

  await interaction.update({ components: [buttonRow] });
}

/**
 * Ruft die letzten 100 Nachrichten eines Channels ab und sortiert sie chronologisch.
 *
 * @param {TextChannel} channel - Der Discord-Channel.
 * @returns {Promise<Collection<string, Message>>} Eine Sammlung der sortierten Nachrichten.
 */
async function fetchChannelMessages(channel) {
  const messages = await channel.messages.fetch({ limit: 100 });
  return messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
}

/**
 * Erstellt ein HTML-Transcript aus den abgerufenen Nachrichten eines Channels mit verbessertem Design.
 *
 * @param {TextChannel} channel - Der Discord-Channel.
 * @param {CommandInteraction} interaction - Die Discord-Interaktion.
 * @param {Collection<string, Message>} messages - Die gesammelten Nachrichten.
 * @returns {Promise<string>} Der Pfad zur erstellten HTML-Datei.
 */
async function createHTMLTranscript(channel, interaction, messages) {
  const transcriptFolder = './transcripts_tmp';
  if (!fs.existsSync(transcriptFolder)) {
    fs.mkdirSync(transcriptFolder);
  }

  const htmlPath = `${transcriptFolder}/Ticket-${channel.id}.html`;
  const messagesArray = Array.from(messages.values());

  let htmlContent = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Transcript für Ticket: ${channel.name}</title>
<style>
  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    margin: 0;
    padding: 20px;
    color: #333;
  }
  .container {
    max-width: 900px;
    margin: auto;
    background: #ffffff;
    border-radius: 8px;
    box-shadow: 0 8px 20px rgba(0,0,0,0.15);
    overflow: hidden;
  }
  .header, .footer {
    background-color: #1c6b3e;
    color: white;
    text-align: center;
    padding: 20px;
  }
  .header h1 {
    margin: 0;
    font-size: 2em;
  }
  .messages {
    padding: 20px;
  }
  .message {
    background: #f9f9f9;
    border-radius: 6px;
    padding: 15px;
    margin-bottom: 15px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.05);
  }
  .message .meta {
    font-size: 0.85em;
    color: #666;
    margin-bottom: 8px;
  }
  .message .content {
    font-size: 1em;
    white-space: pre-wrap;
    line-height: 1.5;
  }
  @media (max-width: 600px) {
    .container {
      margin: 10px;
    }
    .header, .footer {
      padding: 15px;
    }
    .message {
      padding: 10px;
    }
  }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>Transcript für Ticket: ${channel.name}</h1>
  </div>
  <div class="messages">
`;

  messagesArray.forEach(message => {
    const time = new Date(message.createdTimestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const author = message.author.tag;
    const content = message.content || '[Embed]';
    htmlContent += `<div class="message">
      <div class="meta">[${time}] ${author}</div>
      <div class="content">${content}</div>
    </div>`;
  });

  htmlContent += `
  </div>
  <div class="footer">
    <p>Transcript erstellt am ${new Date().toLocaleString('de-DE')}</p>
  </div>
</div>
</body>
</html>`;

  fs.writeFileSync(htmlPath, htmlContent);
  return htmlPath;
}

/**
 * Sendet das HTML-Transcript als private Nachricht an den Benutzer und löscht anschließend die Datei.
 *
 * @param {CommandInteraction} interaction - Die Discord-Interaktion.
 * @param {string} htmlPath - Der Pfad zur HTML-Datei.
 * @returns {Promise<void>}
 */
async function sendTranscriptToUser(interaction, htmlPath) {
  try {
    if (!htmlPath) {
      throw new Error('HTML-Pfad ist nicht definiert.');
    }

    await interaction.user.send({
      embeds: [info("Ticket System", "Hey, hier ist das Transcript von dem Ticket, das gerade geschlossen worden ist!")],
      files: [htmlPath],
    });

    Logger.success(`Transcript wurde privat an ${interaction.user.tag} gesendet.`);
  } catch (error) {
    Logger.error(`Konnte Transcript nicht an ${interaction.user.tag} senden: ${error.message}`);
  } finally {
    try {
      if (htmlPath && fs.existsSync(htmlPath)) {
        fs.unlinkSync(htmlPath);
        Logger.info(`Transcript-Datei wurde gelöscht: ${htmlPath}`);
      }
    } catch (unlinkError) {
      Logger.error(`Fehler beim Löschen der Datei: ${unlinkError.message}`);
    }
  }
}

/**
 * Aktualisiert die Kanalberechtigungen, um Support-Rechte zu entziehen, und verschiebt den Kanal in die Archiv-Kategorie.
 *
 * @param {TextChannel} channel - Der Discord-Channel.
 * @param {Object} data - Serverinformationen, die unter anderem die Support-Rolle und Archiv-Kategorie enthalten.
 * @returns {Promise<void>}
 */
async function updateChannelPermissions(channel, data) {
  const supporterRole = channel.guild.roles.cache.find(role => role.id === data.support_role_id);
  if (supporterRole) {
    await channel.permissionOverwrites.edit(supporterRole, {
      SendMessages: false,
      ViewChannel: false,
    });
  }

  await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
    SendMessages: false,
    ViewChannel: false,
  });

  const archiveCategory = channel.guild.channels.cache.find(
    c => c.id === data.ticket_archiv_category_id && c.type === 4
  );
  if (archiveCategory) {
    await channel.setParent(archiveCategory.id);
    Logger.info(`Channel "${channel.name}" wurde in die Kategorie "${archiveCategory.name}" verschoben.`);
  } else {
    Logger.warn('Archiv-Kategorie nicht gefunden. Überspringe das Verschieben des Kanals.');
  }
}
